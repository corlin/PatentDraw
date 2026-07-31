import {
  DraftAssetRequestSchema,
  FigurePlanRequestSchema,
  type AiAuditEvent,
  type DraftAssetRequest,
  type FigurePlanRequest,
} from '@patentdraw/contracts';
import { Value } from '@sinclair/typebox/value';
import type { FastifyInstance } from 'fastify';

import { requestFigurePlan } from './figure-plan-service.js';
import { createDraftJob, type ConfirmedFigurePlan } from './draft-asset-service.js';
import type { DraftAssetProvider, FigurePlanProvider } from './provider.js';

export function registerFigurePlanRoutes(app: FastifyInstance, provider: FigurePlanProvider): void {
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

    const response = await requestFigurePlan({ context, request: requestBody, provider });
    return reply.code(201).send({ run: response.run, result: response.result });
  });
}

export function registerDraftAssetRoutes(
  app: FastifyInstance,
  options: {
    provider: DraftAssetProvider;
    resolveConfirmedPlan: (
      projectId: string,
      planId: string,
    ) => Promise<ConfirmedFigurePlan | null>;
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
    const confirmedPlan = await options.resolveConfirmedPlan(
      projectId,
      requestBody.confirmedPlanId,
    );
    if (!confirmedPlan) return reply.code(409).send({ error: 'confirmed-figure-plan-required' });

    return reply.code(201).send(
      await createDraftJob({
        context,
        request: requestBody,
        confirmedPlan,
        provider: options.provider,
      }),
    );
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
    return reply.send({ events: await resolveAuditEvents(projectId) });
  });
}
