import { createHash } from 'node:crypto';

import {
  CandidateSelectionRequestSchema,
  AttorneyApprovalDecisionRequestSchema,
  CreateCnipaEfilingEvidenceRequestSchema,
  CreateExportCandidateRequestSchema,
  CreateExportPackageRequestSchema,
  CreateFigureRevisionRequestSchema,
  CreateRuleRunRequestSchema,
  TechnicalReviewDecisionRequestSchema,
  type CandidateSelectionRequest,
  type AttorneyApprovalDecisionRequest,
  type CreateCnipaEfilingEvidenceRequest,
  type CreateExportCandidateRequest,
  type CreateExportPackageRequest,
  type CreateFigureRevisionRequest,
  type CreateRuleRunRequest,
  type TechnicalReviewDecisionRequest,
} from '@patentdraw/contracts';
import { Value } from '@sinclair/typebox/value';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { PrivateObjectStorage } from '../../infrastructure/object-storage.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import type { InMemoryIdempotencyRegistry } from './idempotency.js';
import {
  assessCnipaEfilingEvidence,
  recordCnipaEfilingEvidence,
} from './cnipa-evidence-service.js';
import { createExportPackage } from './export-service.js';
import { WorkflowCommandError, toWorkflowProblem } from './problems.js';
import {
  createFigureRevision,
  selectFigureRevision,
  type CreateFigureRevisionResult,
} from './revision-service.js';
import { StaleWorkflowError, type SvgWorkflowRepository } from './repository.js';
import {
  createExportCandidate,
  submitAttorneyApprovalDecision,
  submitTechnicalReviewDecision,
} from './review-service.js';
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

  app.post('/projects/:projectId/figures/:figureId/export-candidates', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    if (!Value.Check(CreateExportCandidateRequestSchema, request.body)) {
      return reply
        .code(400)
        .send(
          problem('invalid-export-candidate-request', 400, 'Invalid export candidate request.'),
        );
    }
    const version = expectedVersion(request, reply);
    const key = idempotencyKey(request, reply);
    if (version === null || !key) return;
    const body = request.body as CreateExportCandidateRequest;
    try {
      const result = await idempotency.execute({
        projectId: access.context.projectId,
        key,
        requestHash: requestHash({ body, version }),
        operation: () =>
          createExportCandidate({
            repository,
            context: access.context,
            figureId: access.figureId,
            expectedVersion: version,
            request: body,
          }),
      });
      const workflow = await getWorkflowSnapshot({
        repository,
        context: access.context,
        figureId: access.figureId,
      });
      return reply
        .code(result.replayed ? 200 : 201)
        .header('etag', workflow.etag)
        .send({ candidate: result.value.candidate, workflow });
    } catch (error) {
      return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
        body.revisionId,
        body.ruleRunId,
      ]);
    }
  });

  app.get(
    '/projects/:projectId/figures/:figureId/export-candidates/:candidateId',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const candidateId = (request.params as { candidateId?: string }).candidateId;
      if (!candidateId) {
        return reply
          .code(400)
          .send(problem('candidate-id-required', 400, 'Candidate ID is required.'));
      }
      const candidate = await repository.getExportCandidate(access.context.projectId, candidateId);
      if (!candidate || candidate.figureId !== access.figureId) {
        return reply
          .code(404)
          .send(problem('export-candidate-not-found', 404, 'Export candidate was not found.'));
      }
      return reply.send({ candidate });
    },
  );

  app.post(
    '/projects/:projectId/figures/:figureId/export-candidates/:candidateId/technical-decisions',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const candidateId = (request.params as { candidateId?: string }).candidateId;
      if (!candidateId) {
        return reply
          .code(400)
          .send(problem('candidate-id-required', 400, 'Candidate ID is required.'));
      }
      if (!Value.Check(TechnicalReviewDecisionRequestSchema, request.body)) {
        return reply
          .code(400)
          .send(
            problem(
              'invalid-technical-decision-request',
              400,
              'Invalid technical decision request.',
            ),
          );
      }
      const version = expectedVersion(request, reply);
      const key = idempotencyKey(request, reply);
      if (version === null || !key) return;
      const body = request.body as TechnicalReviewDecisionRequest;
      try {
        const result = await idempotency.execute({
          projectId: access.context.projectId,
          key,
          requestHash: requestHash({ body, version, candidateId }),
          operation: () =>
            submitTechnicalReviewDecision({
              repository,
              context: access.context,
              figureId: access.figureId,
              candidateId,
              expectedVersion: version,
              request: body,
            }),
        });
        const workflow = await getWorkflowSnapshot({
          repository,
          context: access.context,
          figureId: access.figureId,
        });
        return reply
          .code(result.replayed ? 200 : 201)
          .header('etag', workflow.etag)
          .send({ decision: result.value.decision, workflow });
      } catch (error) {
        return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
          candidateId,
        ]);
      }
    },
  );

  app.get(
    '/projects/:projectId/figures/:figureId/technical-decisions/:decisionId',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const decisionId = (request.params as { decisionId?: string }).decisionId;
      if (!decisionId) {
        return reply
          .code(400)
          .send(problem('technical-decision-id-required', 400, 'Decision ID is required.'));
      }
      const decision = await repository.getTechnicalDecision(access.context.projectId, decisionId);
      if (!decision) {
        return reply
          .code(404)
          .send(problem('technical-decision-not-found', 404, 'Technical decision was not found.'));
      }
      return reply.send({ decision });
    },
  );

  app.post(
    '/projects/:projectId/figures/:figureId/export-candidates/:candidateId/attorney-decisions',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const candidateId = (request.params as { candidateId?: string }).candidateId;
      if (!candidateId)
        return reply
          .code(400)
          .send(problem('candidate-id-required', 400, 'Candidate ID is required.'));
      if (!Value.Check(AttorneyApprovalDecisionRequestSchema, request.body)) {
        return reply
          .code(400)
          .send(
            problem('invalid-attorney-decision-request', 400, 'Invalid attorney decision request.'),
          );
      }
      const version = expectedVersion(request, reply);
      const key = idempotencyKey(request, reply);
      if (version === null || !key) return;
      const body = request.body as AttorneyApprovalDecisionRequest;
      try {
        const result = await idempotency.execute({
          projectId: access.context.projectId,
          key,
          requestHash: requestHash({ body, version, candidateId }),
          operation: () =>
            submitAttorneyApprovalDecision({
              repository,
              context: access.context,
              figureId: access.figureId,
              candidateId,
              expectedVersion: version,
              request: body,
            }),
        });
        const workflow = await getWorkflowSnapshot({
          repository,
          context: access.context,
          figureId: access.figureId,
        });
        return reply
          .code(result.replayed ? 200 : 201)
          .header('etag', workflow.etag)
          .send({ decision: result.value.decision, workflow });
      } catch (error) {
        return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
          candidateId,
        ]);
      }
    },
  );

  app.get(
    '/projects/:projectId/figures/:figureId/attorney-decisions/:decisionId',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const decisionId = (request.params as { decisionId?: string }).decisionId;
      if (!decisionId)
        return reply
          .code(400)
          .send(problem('attorney-decision-id-required', 400, 'Decision ID is required.'));
      const decision = await repository.getAttorneyDecision(access.context.projectId, decisionId);
      if (!decision)
        return reply
          .code(404)
          .send(problem('attorney-decision-not-found', 404, 'Attorney decision was not found.'));
      return reply.send({ decision });
    },
  );

  app.post(
    '/projects/:projectId/figures/:figureId/export-candidates/:candidateId/export-packages',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const candidateId = (request.params as { candidateId?: string }).candidateId;
      if (!candidateId)
        return reply
          .code(400)
          .send(problem('candidate-id-required', 400, 'Candidate ID is required.'));
      if (!Value.Check(CreateExportPackageRequestSchema, request.body)) {
        return reply
          .code(400)
          .send(problem('invalid-export-package-request', 400, 'Invalid export package request.'));
      }
      const version = expectedVersion(request, reply);
      const key = idempotencyKey(request, reply);
      if (version === null || !key) return;
      const body = request.body as CreateExportPackageRequest;
      try {
        const result = await idempotency.execute({
          projectId: access.context.projectId,
          key,
          requestHash: requestHash({ body, version, candidateId }),
          operation: () =>
            createExportPackage({
              repository,
              storage,
              context: access.context,
              figureId: access.figureId,
              candidateId,
              expectedVersion: version,
              request: body,
            }),
        });
        const workflow = await getWorkflowSnapshot({
          repository,
          context: access.context,
          figureId: access.figureId,
        });
        return reply
          .code(result.replayed ? 200 : 201)
          .header('etag', workflow.etag)
          .send({
            package: result.value.package,
            manifest: result.value.manifest,
            workflow,
          });
      } catch (error) {
        return sendWorkflowFailure(reply, repository, access.context, access.figureId, error, [
          candidateId,
        ]);
      }
    },
  );

  app.get('/projects/:projectId/figures/:figureId/export-packages', async (request, reply) => {
    const access = requireFigureAccess(request, reply);
    if (!access) return;
    return reply.send({
      packages: await repository.listExportPackages(access.context.projectId, access.figureId),
    });
  });

  app.get(
    '/projects/:projectId/figures/:figureId/export-packages/:packageId',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const packageId = (request.params as { packageId?: string }).packageId;
      if (!packageId)
        return reply
          .code(400)
          .send(problem('export-package-id-required', 400, 'Export package ID is required.'));
      const exportPackage = await repository.getExportPackage(access.context.projectId, packageId);
      if (!exportPackage || exportPackage.figureId !== access.figureId)
        return reply
          .code(404)
          .send(problem('export-package-not-found', 404, 'Export package was not found.'));
      return reply.send({ package: exportPackage });
    },
  );

  app.get(
    '/projects/:projectId/figures/:figureId/export-packages/:packageId/svg',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const packageId = (request.params as { packageId?: string }).packageId;
      const exportPackage = packageId
        ? await repository.getExportPackage(access.context.projectId, packageId)
        : null;
      if (!exportPackage || exportPackage.figureId !== access.figureId)
        return reply
          .code(404)
          .send(problem('export-package-not-found', 404, 'Export package was not found.'));
      const bytes = await storage.get(exportPackage.svgHash);
      return reply
        .type('image/svg+xml')
        .header('content-disposition', `attachment; filename="${exportPackage.id}.svg"`)
        .send(Buffer.from(bytes));
    },
  );

  app.get(
    '/projects/:projectId/figures/:figureId/export-packages/:packageId/manifest',
    async (request, reply) => {
      const access = requireFigureAccess(request, reply);
      if (!access) return;
      const packageId = (request.params as { packageId?: string }).packageId;
      const exportPackage = packageId
        ? await repository.getExportPackage(access.context.projectId, packageId)
        : null;
      if (!exportPackage || exportPackage.figureId !== access.figureId)
        return reply
          .code(404)
          .send(problem('export-package-not-found', 404, 'Export package was not found.'));
      const bytes = await storage.get(exportPackage.manifestHash);
      return reply
        .type('application/json')
        .header('content-disposition', `attachment; filename="${exportPackage.id}.manifest.json"`)
        .send(Buffer.from(bytes));
    },
  );

  app.post('/projects/:projectId/cnipa-efiling-evidence', async (request, reply) => {
    const context = requireProjectAccess(request, reply);
    if (!context) return;
    if (!Value.Check(CreateCnipaEfilingEvidenceRequestSchema, request.body)) {
      return reply
        .code(400)
        .send(
          problem(
            'invalid-cnipa-evidence-request',
            400,
            'Invalid external CNIPA evidence request.',
          ),
        );
    }
    const key = idempotencyKey(request, reply);
    if (!key) return;
    const body = request.body as CreateCnipaEfilingEvidenceRequest;
    try {
      const result = await idempotency.execute({
        projectId: context.projectId,
        key,
        requestHash: requestHash(body),
        operation: () => recordCnipaEfilingEvidence({ repository, context, request: body }),
      });
      return reply.code(result.replayed ? 200 : 201).send({ evidence: result.value });
    } catch (error) {
      const commandError =
        error instanceof WorkflowCommandError
          ? error
          : new WorkflowCommandError(
              'cnipa-evidence-rejected',
              422,
              error instanceof Error ? error.message : 'CNIPA evidence rejected.',
            );
      return reply.code(commandError.status).send(toWorkflowProblem(commandError, request.url));
    }
  });

  app.get('/projects/:projectId/cnipa-efiling-assessment', async (request, reply) => {
    const context = requireProjectAccess(request, reply);
    if (!context) return;
    const query = request.query as {
      revisionId?: string;
      revisionHash?: string;
      evidenceId?: string;
    };
    if (!query.revisionId || !query.revisionHash)
      return reply
        .code(400)
        .send(
          problem(
            'cnipa-assessment-input-required',
            400,
            'revisionId and revisionHash are required.',
          ),
        );
    const assessment = await assessCnipaEfilingEvidence({
      repository,
      projectId: context.projectId,
      revisionId: query.revisionId,
      revisionHash: query.revisionHash as `sha256:${string}`,
      ...(query.evidenceId ? { evidenceId: query.evidenceId } : {}),
    });
    return reply.send({ assessment });
  });
}

function requireProjectAccess(request: FastifyRequest, reply: FastifyReply): ProjectContext | null {
  const context = request.projectContext;
  const { projectId } = request.params as { projectId?: string };
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
  if (
    !projectId ||
    projectId !== context.projectId ||
    !context.roles.includes(context.activeRole)
  ) {
    void reply
      .code(403)
      .send(
        problem(
          'project-context-mismatch',
          403,
          'The requested project does not match the active project role.',
        ),
      );
    return null;
  }
  return context;
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
