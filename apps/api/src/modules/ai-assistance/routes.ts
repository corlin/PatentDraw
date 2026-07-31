import { FigurePlanRequestSchema, type FigurePlanRequest } from '@patentdraw/contracts';
import { Value } from '@sinclair/typebox/value';
import type { FastifyInstance } from 'fastify';

import { requestFigurePlan } from './figure-plan-service.js';
import type { FigurePlanProvider } from './provider.js';

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
