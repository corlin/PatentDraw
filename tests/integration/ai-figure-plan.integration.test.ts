import {
  authorisedFigurePlanRequest,
  authorisedProjectContext,
  groundedFigurePlanResult,
  hallucinatedFigurePlanResult,
  unauthorisedProjectContext,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import type { FigurePlanProvider } from '../../apps/api/src/modules/ai-assistance/provider.js';
import { requestFigurePlan } from '../../apps/api/src/modules/ai-assistance/figure-plan-service.js';

function providerFor(result: typeof groundedFigurePlanResult): FigurePlanProvider {
  return {
    provider: 'fixture-provider',
    model: 'fixture-model',
    modelVersion: 'v1',
    dataUsePolicy: {
      provider: 'fixture-provider',
      policyVersion: 'fixture-policy-v1',
      trainingUse: 'prohibited',
      verifiedAt: '2026-07-31T00:00:00.000Z',
    },
    proposeFigurePlan: async () => result,
  };
}

describe('FigurePlan source-grounding boundary', () => {
  it('records a source-mapped proposal with a request-input hash', async () => {
    const response = await requestFigurePlan({
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider: providerFor(groundedFigurePlanResult),
      now: () => new Date('2026-07-31T00:00:00.000Z'),
    });

    expect(response.result.status).toBe('proposed');
    expect(response.run.requestInputHash).toMatch(/^sha256:/);
    expect(response.auditEvents).toHaveLength(1);
  });

  it('requires manual review for unlinked or forbidden provider content', async () => {
    const unlinked = {
      ...groundedFigurePlanResult,
      proposal: { ...groundedFigurePlanResult.proposal, sourceMappings: [] },
    };
    const forbidden = {
      ...groundedFigurePlanResult,
      proposal: {
        ...groundedFigurePlanResult.proposal,
        components: ['component-filing-ready-pump-housing'],
        sourceMappings: [
          {
            ...groundedFigurePlanResult.proposal.sourceMappings[0]!,
            proposalElementId: 'component-filing-ready-pump-housing',
          },
        ],
      },
    };

    const unlinkedResponse = await requestFigurePlan({
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider: providerFor(unlinked),
    });
    const forbiddenResponse = await requestFigurePlan({
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider: providerFor(forbidden),
    });

    expect(unlinkedResponse.result.status).toBe('manual-review-required');
    expect(forbiddenResponse.result.status).toBe('manual-review-required');
  });

  it('does not invoke a provider without source authority and preserves provider abstention', async () => {
    let called = false;
    const provider = providerFor(hallucinatedFigurePlanResult);
    provider.proposeFigurePlan = async () => {
      called = true;
      return hallucinatedFigurePlanResult;
    };

    await expect(
      requestFigurePlan({
        context: unauthorisedProjectContext,
        request: authorisedFigurePlanRequest,
        provider,
      }),
    ).rejects.toThrow('not authorised');
    expect(called).toBe(false);

    const response = await requestFigurePlan({
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider,
    });
    expect(response.result.status).toBe('manual-review-required');
  });

  it('rejects any provider policy that permits training use', async () => {
    const unsafeProvider = {
      ...providerFor(groundedFigurePlanResult),
      dataUsePolicy: {
        provider: 'unsafe-fixture-provider',
        policyVersion: 'unsafe-policy-v1',
        trainingUse: 'permitted',
        verifiedAt: '2026-07-31T00:00:00.000Z',
      },
    } as unknown as FigurePlanProvider;

    await expect(
      requestFigurePlan({
        context: authorisedProjectContext,
        request: authorisedFigurePlanRequest,
        provider: unsafeProvider,
      }),
    ).rejects.toThrow('must prohibit training use');
  });

  it('exposes only an authorised project-scoped FigurePlan request route', async () => {
    const app = await createApp({
      figurePlanProvider: providerFor(groundedFigurePlanResult),
      resolveProjectContext: async () => authorisedProjectContext,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/ai-figure-plans`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
        payload: authorisedFigurePlanRequest,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().result.status).toBe('proposed');
      expect(response.json().run.requestInputHash).toMatch(/^sha256:/);
    } finally {
      await app.close();
    }
  });
});
