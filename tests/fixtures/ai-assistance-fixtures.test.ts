import {
  aiAssistanceFixtureCases,
  authorisedFigurePlanRequest,
  authorisedProjectContext,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

import { requestFigurePlan } from '../../apps/api/src/modules/ai-assistance/figure-plan-service.js';
import { invalidateDependencyChange } from '../../apps/api/src/modules/ai-assistance/invalidation-service.js';
import { InMemoryAiAssistanceRepository } from '../../apps/api/src/modules/ai-assistance/repository.js';
import type { FigurePlanProvider } from '../../apps/api/src/modules/ai-assistance/provider.js';

describe('six AI assistance fixtures', () => {
  it.each(aiAssistanceFixtureCases)(
    '$id exercises the service boundary with complete provenance',
    async (fixture) => {
      const repository = new InMemoryAiAssistanceRepository();
      const provider: FigurePlanProvider = {
        provider: 'fixture-provider',
        model: 'fixture-model',
        modelVersion: 'v1',
        dataUsePolicy: {
          provider: 'fixture-provider',
          policyVersion: 'fixture-policy-v1',
          trainingUse: 'prohibited',
          verifiedAt: '2026-07-31T00:00:00.000Z',
        },
        proposeFigurePlan: async () => fixture.providerResult,
      };
      const response = await requestFigurePlan({
        context: authorisedProjectContext,
        request: authorisedFigurePlanRequest,
        provider,
        repository,
        runId: `run-fixture-${fixture.id}`,
        now: () => new Date('2026-07-31T00:00:00.000Z'),
      });

      if (fixture.id === 'post-edit-invalidation') {
        const invalidation = await invalidateDependencyChange({
          repository,
          projectId: authorisedProjectContext.projectId,
          kind: 'source',
          changedTargetId: authorisedFigurePlanRequest.selectedSources[0]!.id,
          actorId: authorisedProjectContext.actorId,
          reason: 'Fixture source changed after generation.',
          now: () => new Date('2026-07-31T00:01:00.000Z'),
        });
        expect(invalidation.invalidation?.affectedAiRunIds).toEqual([response.run.id]);
      } else {
        expect(response.result.status).toBe(fixture.expectedStatus);
      }

      const createdEvent = (
        await repository.listAuditEvents(authorisedProjectContext.projectId)
      ).find((event) => event.eventType === 'ai-run-created');
      expect(createdEvent?.provenance).toMatchObject({
        provider: 'fixture-provider',
        model: 'fixture-model',
        modelVersion: 'v1',
        instructionVersion: authorisedFigurePlanRequest.instructionVersion,
        consentRecordId: authorisedFigurePlanRequest.consent.id,
        selectedSourceHashes: ['sha256:fixture-disclosure-01'],
      });
      expect(createdEvent?.provenance?.requestInputHash).toMatch(/^sha256:/);
      expect(createdEvent?.provenance?.outputHash).toMatch(/^sha256:/);
      expect(createdEvent?.provenance?.retentionExpiresAt).toBe('2026-08-30T00:00:00.000Z');
    },
  );
});
