import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ProjectContext } from './modules/projects-assets/source-authorisation.js';
import { registerFigurePlanRoutes } from './modules/ai-assistance/routes.js';
import { registerAiAuditRoutes, registerDraftAssetRoutes } from './modules/ai-assistance/routes.js';
import type { DraftAssetProvider, FigurePlanProvider } from './modules/ai-assistance/provider.js';
import type { AiAuditEvent } from '@patentdraw/contracts';
import {
  InMemoryAiAssistanceRepository,
  type AiAssistanceRepository,
} from './modules/ai-assistance/repository.js';
import { DraftJobService } from './modules/ai-assistance/draft-job-service.js';
import {
  InMemoryPrivateObjectStorage,
  type PrivateObjectStorage,
} from './infrastructure/object-storage.js';
import {
  InMemorySvgWorkflowRepository,
  type SvgWorkflowRepository,
} from './modules/svg-review-export/repository.js';
import { registerSvgWorkflowRoutes } from './modules/svg-review-export/routes.js';
import { InMemoryIdempotencyRegistry } from './modules/svg-review-export/idempotency.js';

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
  repository?: AiAssistanceRepository;
  svgWorkflowRepository?: SvgWorkflowRepository;
  svgObjectStorage?: PrivateObjectStorage;
  svgIdempotencyRegistry?: InMemoryIdempotencyRegistry;
  resolveAiAuditEvents?: (projectId: string) => Promise<readonly AiAuditEvent[]>;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const repository = options.repository ?? new InMemoryAiAssistanceRepository();
  const svgWorkflowRepository =
    options.svgWorkflowRepository ?? new InMemorySvgWorkflowRepository();
  const svgObjectStorage = options.svgObjectStorage ?? new InMemoryPrivateObjectStorage();
  const svgIdempotencyRegistry =
    options.svgIdempotencyRegistry ?? new InMemoryIdempotencyRegistry();
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
  registerSvgWorkflowRoutes(app, {
    repository: svgWorkflowRepository,
    storage: svgObjectStorage,
    idempotency: svgIdempotencyRegistry,
  });
  if (options.figurePlanProvider) {
    registerFigurePlanRoutes(app, options.figurePlanProvider, repository);
  }
  if (options.draftAssetProvider) {
    registerDraftAssetRoutes(app, {
      jobs: new DraftJobService(repository, options.draftAssetProvider),
    });
  }
  if (options.resolveAiAuditEvents ?? options.repository) {
    registerAiAuditRoutes(
      app,
      options.resolveAiAuditEvents ?? ((projectId) => repository.listAuditEvents(projectId)),
      (event) => repository.saveAuditEvents([event]),
    );
  }
  return app;
}
