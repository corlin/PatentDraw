import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ProjectContext } from './modules/projects-assets/source-authorisation.js';
import { registerFigurePlanRoutes } from './modules/ai-assistance/routes.js';
import { registerAiAuditRoutes, registerDraftAssetRoutes } from './modules/ai-assistance/routes.js';
import type { DraftAssetProvider, FigurePlanProvider } from './modules/ai-assistance/provider.js';
import type { ConfirmedFigurePlan } from './modules/ai-assistance/draft-asset-service.js';
import type { AiAuditEvent } from '@patentdraw/contracts';

declare module 'fastify' {
  interface FastifyRequest {
    projectContext: ProjectContext | null;
  }
}

export interface RequestIdentity {
  projectId: string;
  actorId: string;
}

export interface AppOptions {
  resolveProjectContext?: (identity: RequestIdentity) => Promise<ProjectContext | null>;
  figurePlanProvider?: FigurePlanProvider;
  draftAssetProvider?: DraftAssetProvider;
  resolveConfirmedPlan?: (projectId: string, planId: string) => Promise<ConfirmedFigurePlan | null>;
  resolveAiAuditEvents?: (projectId: string) => Promise<readonly AiAuditEvent[]>;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: false });
  app.decorateRequest('projectContext', null);

  app.addHook('onRequest', async (request) => {
    const projectId = request.headers['x-patentdraw-project-id'];
    const actorId = request.headers['x-patentdraw-actor-id'];

    if (
      typeof projectId !== 'string' ||
      typeof actorId !== 'string' ||
      !options.resolveProjectContext
    ) {
      return;
    }

    request.projectContext = await options.resolveProjectContext({ projectId, actorId });
  });

  app.get('/health', async () => ({ status: 'ok' }));
  if (options.figurePlanProvider) {
    registerFigurePlanRoutes(app, options.figurePlanProvider);
  }
  if (options.draftAssetProvider && options.resolveConfirmedPlan) {
    registerDraftAssetRoutes(app, {
      provider: options.draftAssetProvider,
      resolveConfirmedPlan: options.resolveConfirmedPlan,
    });
  }
  if (options.resolveAiAuditEvents) {
    registerAiAuditRoutes(app, options.resolveAiAuditEvents);
  }
  return app;
}
