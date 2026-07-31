import {
  authorisedFigurePlanRequest,
  authorisedProjectContext,
  groundedFigurePlanResult,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

import { requestFigurePlan } from '../../apps/api/src/modules/ai-assistance/figure-plan-service.js';
import { assertFigurePlanRequestSecurity } from '../../apps/api/src/modules/ai-assistance/figure-plan-policy.js';
import {
  executeWithProviderControls,
  ProviderOperationalError,
} from '../../apps/api/src/modules/ai-assistance/provider-policy.js';
import type { FigurePlanProvider } from '../../apps/api/src/modules/ai-assistance/provider.js';

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
  proposeFigurePlan: async () => groundedFigurePlanResult,
};

describe('AI assistance security controls', () => {
  it('rejects oversized source selections before calling a provider', async () => {
    const request = {
      ...authorisedFigurePlanRequest,
      selectedSources: Array.from({ length: 9 }, (_, index) => ({
        id: `source-${index}`,
        contentHash: `sha256:${index}`,
      })),
    };
    await expect(
      requestFigurePlan({ context: authorisedProjectContext, request, provider }),
    ).rejects.toThrow('at most 8 selected sources');
  });

  it('turns forbidden assertions into manual review', async () => {
    if (groundedFigurePlanResult.status !== 'proposed')
      throw new Error('Fixture must be proposed.');
    const unsafeProvider: FigurePlanProvider = {
      ...provider,
      proposeFigurePlan: async () => ({
        ...groundedFigurePlanResult,
        proposal: {
          ...groundedFigurePlanResult.proposal,
          components: ['filing-ready component'],
          sourceMappings: [],
        },
      }),
    };
    const response = await requestFigurePlan({
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider: unsafeProvider,
    });
    expect(response.result.status).toBe('manual-review-required');
  });

  it('rejects an unbounded allowed scope and oversized request payload', () => {
    expect(() =>
      assertFigurePlanRequestSecurity({
        ...authorisedFigurePlanRequest,
        allowedScope: Array.from({ length: 21 }, (_, index) => `scope-${index}`),
      }),
    ).toThrow('bounded assistance scope');
    expect(() =>
      assertFigurePlanRequestSecurity({
        ...authorisedFigurePlanRequest,
        figurePurpose: 'x'.repeat(20_000),
      }),
    ).toThrow('permitted size');
  });

  it('retries bounded operational failures', async () => {
    let calls = 0;
    await expect(
      executeWithProviderControls(
        async () => {
          calls += 1;
          if (calls < 3) throw new ProviderOperationalError('temporary outage');
          return 'recovered';
        },
        { maxRetries: 2, retentionDays: 30 },
      ),
    ).resolves.toBe('recovered');
    expect(calls).toBe(3);
  });
});
