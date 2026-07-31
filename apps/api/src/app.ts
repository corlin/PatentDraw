import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ProjectContext } from './modules/projects-assets/source-authorisation.js';
import { registerFigurePlanRoutes } from './modules/ai-assistance/routes.js';
import type { FigurePlanProvider } from './modules/ai-assistance/provider.js';

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
  return app;
}
