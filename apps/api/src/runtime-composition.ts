import {
  authorisedProjectContext,
  fixtureDraftAsset,
  fixtureFigureId,
  groundedFigurePlanResult,
  workflowActorIds,
} from '@patentdraw/fixtures';

import type { AppOptions, RequestIdentity } from './app.js';
import {
  DeterministicDraftAssetProvider,
  DeterministicFigurePlanProvider,
} from './modules/ai-assistance/provider.js';
import { InMemoryAiAssistanceRepository } from './modules/ai-assistance/repository.js';
import type { ProjectContext } from './modules/projects-assets/source-authorisation.js';
import { InMemorySvgWorkflowRepository } from './modules/svg-review-export/repository.js';
import { InMemoryPrivateObjectStorage } from './infrastructure/object-storage.js';

export async function createDeterministicDemoOptions(): Promise<AppOptions> {
  const repository = new InMemoryAiAssistanceRepository();
  const svgWorkflowRepository = new InMemorySvgWorkflowRepository();
  const svgObjectStorage = new InMemoryPrivateObjectStorage();
  const drafterContext: ProjectContext = {
    ...authorisedProjectContext,
    actorId: workflowActorIds.drafter,
    activeRole: 'drafter',
    roles: ['drafter'],
  };
  const contexts: readonly ProjectContext[] = [
    drafterContext,
    {
      ...authorisedProjectContext,
      actorId: workflowActorIds.technicalReviewer,
      activeRole: 'technical-reviewer',
      roles: ['technical-reviewer'],
      relationships: [],
    },
    {
      ...authorisedProjectContext,
      actorId: workflowActorIds.attorneyAgent,
      activeRole: 'attorney-agent',
      roles: ['attorney-agent'],
      relationships: [],
    },
  ];
  await repository.saveCanonicalFigureRevision({
    id: 'revision-demo-independent-svg-01',
    projectId: drafterContext.projectId,
    canonicalSvgHash: 'sha256:demo-independent-canonical-svg',
    sanitized: true,
    createdByActorId: drafterContext.actorId,
  });
  return {
    repository,
    svgWorkflowRepository,
    svgObjectStorage,
    figurePlanProvider: new DeterministicFigurePlanProvider(groundedFigurePlanResult),
    draftAssetProvider: new DeterministicDraftAssetProvider(fixtureDraftAsset),
    resolveProjectContext: async (identity: RequestIdentity) =>
      contexts.find(
        (context) =>
          identity.projectId === context.projectId && identity.actorId === context.actorId,
      ) ?? null,
  };
}

export { fixtureFigureId };
