import {
  ConfirmFigurePlanRequestSchema,
  DraftAssetRequestSchema,
  DraftHandoffRequestSchema,
  DraftRejectRequestSchema,
  DraftRetryRequestSchema,
  FigurePlanDispositionRequestSchema,
  FigurePlanRequestSchema,
  type AiAuditEvent,
  type DraftAssetRequest,
  type DraftRejectRequest,
  type DraftRetryRequest,
  type FigurePlanDispositionRequest,
  type FigurePlanRequest,
} from '@patentdraw/contracts';
import { Value } from '@sinclair/typebox/value';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import { requestFigurePlan } from './figure-plan-service.js';
import type { DraftJobService } from './draft-job-service.js';
import type { FigurePlanProvider } from './provider.js';
import type { AiAssistanceRepository } from './repository.js';

export function registerFigurePlanRoutes(
  app: FastifyInstance,
  provider: FigurePlanProvider,
  repository: AiAssistanceRepository,
): void {
  app.post('/projects/:projectId/ai-figure-plans', async (request, reply) => {
    const context = request.projectContext;
    if (!context) {
      return reply.code(401).send({ error: 'authenticated-project-context-required' });
    }

    const projectId = (request.params as { projectId?: string }).projectId;
    if (!projectId || projectId !== context.projectId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }

    if (!Value.Check(FigurePlanRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-figure-plan-request' });
    }

    const requestBody = request.body as FigurePlanRequest;
    if (requestBody.projectId !== projectId) {
      return reply.code(403).send({ error: 'request-project-mismatch' });
    }

    const response = await requestFigurePlan({
      context,
      request: requestBody,
      provider,
      repository,
    });
    return reply.code(201).send({ run: response.run, result: response.result });
  });

  app.post('/projects/:projectId/ai-figure-plans/:proposalId/confirm', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, proposalId } = request.params as {
      projectId?: string;
      proposalId?: string;
    };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !proposalId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (!Value.Check(ConfirmFigurePlanRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-confirm-figure-plan-request' });
    }
    const body = request.body as { proposalId: string };
    if (body.proposalId !== proposalId) {
      return reply.code(409).send({ error: 'proposal-id-mismatch' });
    }
    try {
      return reply.code(201).send(
        await repository.confirmFigurePlan({
          projectId,
          proposalId,
          actorId: context.actorId,
          confirmedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      return reply.code(409).send({
        error: 'figure-plan-confirmation-rejected',
        message: error instanceof Error ? error.message : 'FigurePlan confirmation rejected.',
      });
    }
  });

  app.post(
    '/projects/:projectId/ai-figure-plans/:proposalId/dispositions',
    async (request, reply) => {
      const context = request.projectContext;
      const { projectId, proposalId } = request.params as {
        projectId?: string;
        proposalId?: string;
      };
      if (!context)
        return reply.code(401).send({ error: 'authenticated-project-context-required' });
      if (!projectId || projectId !== context.projectId || !proposalId) {
        return reply.code(403).send({ error: 'project-context-mismatch' });
      }
      if (!Value.Check(FigurePlanDispositionRequestSchema, request.body)) {
        return reply.code(400).send({ error: 'invalid-figure-plan-disposition-request' });
      }
      const body = request.body as FigurePlanDispositionRequest;
      if (body.proposalId !== proposalId) {
        return reply.code(409).send({ error: 'proposal-id-mismatch' });
      }
      try {
        await repository.saveFigurePlanDispositions({
          projectId,
          proposalId,
          actorId: context.actorId,
          items: body.items,
          recordedAt: new Date().toISOString(),
        });
        return reply.code(201).send({ proposalId, items: body.items });
      } catch (error) {
        return reply.code(422).send({
          error: 'figure-plan-disposition-rejected',
          message: error instanceof Error ? error.message : 'Disposition rejected.',
        });
      }
    },
  );
}

export function registerDraftAssetRoutes(
  app: FastifyInstance,
  options: {
    jobs: DraftJobService;
  },
): void {
  app.post('/projects/:projectId/generated-draft-assets', async (request, reply) => {
    const context = request.projectContext;
    const projectId = (request.params as { projectId?: string }).projectId;
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (!Value.Check(DraftAssetRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-draft-asset-request' });
    }

    const requestBody = request.body as DraftAssetRequest;
    if (requestBody.projectId !== projectId) {
      return reply.code(403).send({ error: 'request-project-mismatch' });
    }
    try {
      return reply.code(202).send(await options.jobs.enqueue({ context, request: requestBody }));
    } catch (error) {
      return reply.code(409).send({
        error: 'draft-job-rejected',
        message: error instanceof Error ? error.message : 'Draft job rejected.',
      });
    }
  });

  app.get('/projects/:projectId/generated-draft-jobs/:jobId', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, jobId } = request.params as { projectId?: string; jobId?: string };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !jobId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    const job = await options.jobs.get(projectId, jobId);
    return job ? reply.send(job) : reply.code(404).send({ error: 'draft-job-not-found' });
  });

  app.delete('/projects/:projectId/generated-draft-jobs/:jobId', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, jobId } = request.params as { projectId?: string; jobId?: string };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !jobId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    try {
      return reply.send(await options.jobs.cancel(projectId, jobId));
    } catch {
      return reply.code(404).send({ error: 'draft-job-not-found' });
    }
  });

  app.post('/projects/:projectId/generated-draft-jobs/:jobId/select', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, jobId } = request.params as { projectId?: string; jobId?: string };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !jobId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    try {
      return reply.send(await options.jobs.select(projectId, jobId));
    } catch (error) {
      return reply.code(409).send({
        error: 'draft-selection-rejected',
        message: error instanceof Error ? error.message : 'Draft selection rejected.',
      });
    }
  });

  app.post('/projects/:projectId/generated-draft-jobs/:jobId/reject', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, jobId } = request.params as { projectId?: string; jobId?: string };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !jobId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (!Value.Check(DraftRejectRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-draft-reject-request' });
    }
    try {
      const body = request.body as DraftRejectRequest;
      return reply.send(await options.jobs.reject(projectId, jobId, body.reason));
    } catch (error) {
      return reply.code(409).send({
        error: 'draft-rejection-rejected',
        message: error instanceof Error ? error.message : 'Draft rejection rejected.',
      });
    }
  });

  app.post('/projects/:projectId/generated-draft-jobs/:jobId/retry', async (request, reply) => {
    const context = request.projectContext;
    const { projectId, jobId } = request.params as { projectId?: string; jobId?: string };
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId || !jobId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (!Value.Check(DraftRetryRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-draft-retry-request' });
    }
    try {
      const body = request.body as DraftRetryRequest;
      if (body.request.projectId !== projectId) {
        return reply.code(403).send({ error: 'request-project-mismatch' });
      }
      return reply
        .code(202)
        .send(await options.jobs.retry({ context, jobId, request: body.request }));
    } catch (error) {
      return reply.code(409).send({
        error: 'draft-retry-rejected',
        message: error instanceof Error ? error.message : 'Draft retry rejected.',
      });
    }
  });

  app.post('/projects/:projectId/generated-draft-assets/handoff', async (request, reply) => {
    const context = request.projectContext;
    const projectId = (request.params as { projectId?: string }).projectId;
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (!Value.Check(DraftHandoffRequestSchema, request.body)) {
      return reply.code(400).send({ error: 'invalid-draft-handoff-request' });
    }
    const body = request.body as { jobId: string; canonicalFigureRevisionId: string };
    try {
      return reply.send(
        await options.jobs.handoff(projectId, body.jobId, body.canonicalFigureRevisionId),
      );
    } catch (error) {
      return reply.code(409).send({
        error: 'draft-handoff-rejected',
        message: error instanceof Error ? error.message : 'Draft handoff rejected.',
      });
    }
  });

  app.post('/projects/:projectId/generated-draft-assets/:assetId/export', async (_request, reply) =>
    reply.code(409).send({
      error: 'generated-draft-asset-not-exportable',
      message: 'Create and independently review a canonical SVG FigureRevision before export.',
    }),
  );
}

export function registerAiAuditRoutes(
  app: FastifyInstance,
  resolveAuditEvents: (projectId: string) => Promise<readonly AiAuditEvent[]>,
  recordAuditAccess: (event: AiAuditEvent) => Promise<void>,
): void {
  app.get('/projects/:projectId/ai-audit', async (request, reply) => {
    const context = request.projectContext;
    const projectId = (request.params as { projectId?: string }).projectId;
    if (!context) return reply.code(401).send({ error: 'authenticated-project-context-required' });
    if (!projectId || projectId !== context.projectId) {
      return reply.code(403).send({ error: 'project-context-mismatch' });
    }
    if (
      !context.roles.some((role) =>
        ['technical-reviewer', 'attorney-agent', 'administrator'].includes(role),
      )
    ) {
      return reply.code(403).send({ error: 'ai-audit-reader-role-required' });
    }
    await recordAuditAccess({
      id: `audit-access:${randomUUID()}`,
      eventType: 'privileged-audit-read',
      projectId,
      actorId: context.actorId,
      occurredAt: new Date().toISOString(),
      targetIds: [projectId],
      reason: 'Authorised actor read the AI provenance timeline.',
      metadata: { accessType: 'ai-audit-read' },
    });
    return reply.send({ events: await resolveAuditEvents(projectId) });
  });
}
