import { createHash } from 'node:crypto';

import {
  CandidateSelectionRequestSchema,
  CreateFigureRevisionRequestSchema,
  CreateRuleRunRequestSchema,
  type CandidateSelectionRequest,
  type CreateFigureRevisionRequest,
  type CreateRuleRunRequest,
} from '@patentdraw/contracts';
import { Value } from '@sinclair/typebox/value';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { PrivateObjectStorage } from '../../infrastructure/object-storage.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import type { InMemoryIdempotencyRegistry } from './idempotency.js';
import { WorkflowCommandError, toWorkflowProblem } from './problems.js';
import {
  createFigureRevision,
  selectFigureRevision,
  type CreateFigureRevisionResult,
} from './revision-service.js';
import { StaleWorkflowError, type SvgWorkflowRepository } from './repository.js';
import { runRevisionRules } from './rule-service.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';
import { getWorkflowSnapshot } from './workflow-state.js';

interface SvgWorkflowRouteOptions {
  repository: SvgWorkflowRepository;
  storage: PrivateObjectStorage;
  idempotency: InMemoryIdempotencyRegistry;
}

export function registerSvgWorkflowRoutes(
  app: FastifyInstance,
  options: SvgWorkflowRouteOptions,
): void {
  const { repository, storage, idempotency } = options;

  app.get('/projects/:projectId/figures/:figureId/workflow', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    // Reads intentionally do not emit audit events: browsing must be side-effect free.
    const snapshot = await getWorkflowSnapshot({
      repository,
      context: access.context,
      figureId: access.figureId,
    });
    return reply.header('etag', snapshot.etag).send(snapshot);
  });

  app.get('/projects/:projectId/figures/:figureId/revisions', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    return reply.send({
      revisions: await repository.listRevisions(access.context.projectId, access.figureId),
    });
  });

  app.post('/projects/:projectId/figures/:figureId/revisions', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    if (!Value.Check(CreateFigureRevisionRequestSchema, request.body)) {
      return reply
        .code(400)
        .send(problem('invalid-revision-request', 400, 'Invalid revision request.'));
    }
    const key = idempotencyKey(request, reply);
    if (!key) return;
    const body = request.body as CreateFigureRevisionRequest;
    try {
      const result = await idempotency.execute({
        projectId: access.context.projectId,
        key,
        requestHash: requestHash(body),
        operation: () =>
          createFigureRevision({
            repository,
            storage,
            context: access.context,
            figureId: access.figureId,
            request: body,
          }),
      });
      const payload = await revisionPayload(
        result.value,
        repository,
        access.context,
        access.figureId,
      );
      if (result.value.status === 'rejected') return reply.code(422).send(payload);
      return reply.code(result.replayed ? 200 : 201).send(payload);
    } catch (error) {
      return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
        access.figureId,
      ]);
    }
  });

  app.get(
    '/projects/:projectId/figures/:figureId/revisions/:revisionId',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const revisionId = (request.params as { revisionId?: string }).revisionId;
      if (!revisionId)
        return reply
          .code(400)
          .send(problem('revision-id-required', 400, 'Revision ID is required.'));
      const revision = await repository.getRevision(access.context.projectId, revisionId);
      if (!revision || revision.figureId !== access.figureId) {
        return reply.code(404).send(problem('revision-not-found', 404, 'Revision was not found.'));
      }
      const sanitizationRun = await repository.getSanitizationRun(
        access.context.projectId,
        revision.sanitizationRunId,
      );
      return reply.send({ revision, sanitizationRun });
    },
  );

  app.get(
    '/projects/:projectId/figures/:figureId/revisions/:revisionId/svg',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const revisionId = (request.params as { revisionId?: string }).revisionId;
      if (!revisionId)
        return reply
          .code(400)
          .send(problem('revision-id-required', 400, 'Revision ID is required.'));
      const revision = await repository.getRevision(access.context.projectId, revisionId);
      if (!revision || revision.figureId !== access.figureId) {
        return reply.code(404).send(problem('revision-not-found', 404, 'Revision was not found.'));
      }
      const bytes = await storage.get(revision.canonicalSvgHash);
      return reply
        .type('image/svg+xml')
        .header('content-disposition', 'inline')
        .send(Buffer.from(bytes));
    },
  );

  app.post(
    '/projects/:projectId/figures/:figureId/candidate-selections',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      if (!Value.Check(CandidateSelectionRequestSchema, request.body)) {
        return reply
          .code(400)
          .send(
            problem('invalid-candidate-selection', 400, 'Invalid candidate selection request.'),
          );
      }
      const version = expectedVersion(request, reply);
      const key = idempotencyKey(request, reply);
      if (version === null || !key) return;
      const body = request.body as CandidateSelectionRequest;
      try {
        const result = await idempotency.execute({
          projectId: access.context.projectId,
          key,
          requestHash: requestHash({ body, version }),
          operation: () =>
            selectFigureRevision({
              repository,
              context: access.context,
              figureId: access.figureId,
              expectedVersion: version,
              ...body,
            }),
        });
        const snapshot = await getWorkflowSnapshot({
          repository,
          context: access.context,
          figureId: access.figureId,
        });
        return reply
          .code(result.replayed ? 200 : 201)
          .header('etag', snapshot.etag)
          .send({ projection: result.value, workflow: snapshot });
      } catch (error) {
        return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
          body.revisionId,
        ]);
      }
    },
  );

  app.get('/projects/:projectId/figures/:figureId/rule-runs', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    return reply.send({
      ruleRuns: await repository.listRuleRuns(access.context.projectId, access.figureId),
    });
  });

  app.post(
    '/projects/:projectId/figures/:figureId/revisions/:revisionId/rule-runs',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const revisionId = (request.params as { revisionId?: string }).revisionId;
      if (!revisionId)
        return reply
          .code(400)
          .send(problem('revision-id-required', 400, 'Revision ID is required.'));
      if (!Value.Check(CreateRuleRunRequestSchema, request.body)) {
        return reply
          .code(400)
          .send(problem('invalid-rule-run-request', 400, 'Invalid rule-run request.'));
      }
      const version = expectedVersion(request, reply);
      const key = idempotencyKey(request, reply);
      if (version === null || !key) return;
      const body = request.body as CreateRuleRunRequest;
      try {
        const result = await idempotency.execute({
          projectId: access.context.projectId,
          key,
          requestHash: requestHash({ body, version, revisionId }),
          operation: () =>
            runRevisionRules({
              repository,
              storage,
              context: access.context,
              figureId: access.figureId,
              revisionId,
              expectedVersion: version,
              request: body,
            }),
        });
        const snapshot = await getWorkflowSnapshot({
          repository,
          context: access.context,
          figureId: access.figureId,
        });
        return reply
          .code(result.replayed ? 200 : 201)
          .header('etag', snapshot.etag)
          .send({ run: result.value.run, workflow: snapshot });
      } catch (error) {
        return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
          revisionId,
        ]);
      }
    },
  );

  app.get('/projects/:projectId/figures/:figureId/rule-runs/:ruleRunId', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    const ruleRunId = (request.params as { ruleRunId?: string }).ruleRunId;
    if (!ruleRunId)
      return reply.code(400).send(problem('rule-run-id-required', 400, 'Rule-run ID is required.'));
    const run = await repository.getRuleRun(access.context.projectId, ruleRunId);
    if (!run || run.figureId !== access.figureId) {
      return reply.code(404).send(problem('rule-run-not-found', 404, 'Rule run was not found.'));
    }
    return reply.send({ run });
  });
}

function requireFigureAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): { context: ProjectContext; figureId: string } | null {
  const context = request.projectContext;
  const { projectId, figureId } = request.params as { projectId?: string; figureId?: string };
  if (!context) {
    void reply
      .code(401)
      .send(
        problem(
          'authenticated-project-context-required',
          401,
          'A project-scoped actor context is required.',
        ),
      );
    return null;
  }
  if (!projectId || projectId !== context.projectId || !figureId) {
    void reply
      .code(403)
      .send(
        problem(
          'project-context-mismatch',
          403,
          'The requested project does not match the authenticated project context.',
        ),
      );
    return null;
  }
  if (!context.roles.includes(context.activeRole)) {
    void reply
      .code(403)
      .send(problem('invalid-active-role', 403, 'The active role is not assigned to this actor.'));
    return null;
  }
  return { context, figureId };
}

function expectedVersion(request: FastifyRequest, reply: FastifyReply): number | null {
  const value = request.headers['if-match'];
  const match = typeof value === 'string' ? /^(?:W\/)?"?workflow:(\d+)"?$/.exec(value) : null;
  if (!match) {
    void reply
      .code(428)
      .send(
        problem(
          'workflow-etag-required',
          428,
          'If-Match with the current workflow ETag is required.',
        ),
      );
    return null;
  }
  return Number(match[1]);
}

function idempotencyKey(request: FastifyRequest, reply: FastifyReply): string | null {
  const value = request.headers['idempotency-key'];
  if (typeof value !== 'string' || value.trim().length === 0) {
    void reply
      .code(400)
      .send(
        problem(
          'idempotency-key-required',
          400,
          'Idempotency-Key is required for workflow commands.',
        ),
      );
    return null;
  }
  return value;
}

async function revisionPayload(
  result: CreateFigureRevisionResult,
  repository: SvgWorkflowRepository,
  context: ProjectContext,
  figureId: string,
) {
  const workflow = await getWorkflowSnapshot({ repository, context, figureId });
  return { ...result, workflow };
}

async function sendWorkflowFailure(
  reply: FastifyReply,
  repository: SvgWorkflowRepository,
  context: ProjectContext,
  figureId: string,
  error: unknown,
  targetIds: readonly string[],
) {
  let commandError: WorkflowCommandError;
  if (error instanceof WorkflowCommandError) commandError = error;
  else if (error instanceof StaleWorkflowError) {
    commandError = new WorkflowCommandError(
      'stale-workflow',
      409,
      error.message,
      [],
      await getWorkflowSnapshot({ repository, context, figureId }),
    );
  } else {
    commandError = new WorkflowCommandError(
      'workflow-command-rejected',
      409,
      error instanceof Error ? error.message : 'Workflow command rejected.',
    );
  }
  await recordWorkflowCommandOutcome(repository, {
    projectId: context.projectId,
    figureId,
    eventType: 'workflow-command-denied',
    actorId: context.actorId,
    activeRole: context.activeRole,
    targetIds,
    outcome: 'denied',
    reasonCode: commandError.code,
    reason: commandError.message,
  });
  return reply.code(commandError.status).send(toWorkflowProblem(commandError, reply.request.url));
}

function problem(code: string, status: number, detail: string) {
  return {
    type: `urn:patentdraw:problem:${code}`,
    title:
      status === 404
        ? 'Artifact not found'
        : status >= 500
          ? 'Workflow error'
          : 'Workflow request rejected',
    status,
    code,
    detail,
  };
}

function requestHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}
