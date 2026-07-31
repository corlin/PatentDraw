import {
  authorisedProjectContext,
  fixtureDraftAsset,
  fixtureDraftAssetRequest,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import {
  cancelDraftJob,
  createDraftJob,
  handoffToIndependentFigureRevision,
  selectDraftAsset,
} from '../../apps/api/src/modules/ai-assistance/draft-asset-service.js';

describe('generated draft asset boundary', () => {
  it('keeps a selected fixture draft ineligible for export after an independent SVG handoff', async () => {
    const job = await createDraftJob({
      context: authorisedProjectContext,
      request: fixtureDraftAssetRequest,
      confirmedPlan: {
        id: fixtureDraftAssetRequest.confirmedPlanId,
        projectId: authorisedProjectContext.projectId,
      },
      provider: {
        provider: 'deterministic-test-double',
        model: 'fixture-draft-model',
        modelVersion: 'v1',
        mode: 'deterministic-test-double',
        dataUsePolicy: {
          provider: 'deterministic-test-double',
          policyVersion: 'fixture-policy-v1',
          trainingUse: 'prohibited',
          verifiedAt: '2026-07-31T00:00:00.000Z',
        },
        createDraftAsset: async () => fixtureDraftAsset,
      },
    });

    const selected = selectDraftAsset(job);
    const handedOff = handoffToIndependentFigureRevision(selected, {
      id: 'revision-fixture-svg-01',
      canonicalSvgHash: 'sha256:independently-authored-svg-01',
      createdIndependently: true,
    });

    expect(handedOff.asset?.selectionState).toBe('selected');
    expect(handedOff.asset?.independentFigureRevisionId).toBe('revision-fixture-svg-01');
    expect(handedOff.asset?.exportEligible).toBe(false);
  });

  it('allows a queued job to be cancelled without creating a draft asset', async () => {
    expect(cancelDraftJob({ id: 'job-fixture-02', status: 'queued', progressPercent: 0 })).toEqual({
      id: 'job-fixture-02',
      status: 'cancelled',
      progressPercent: 0,
    });
  });

  it('denies export through the API even when a draft asset has been selected', async () => {
    const app = await createApp({
      draftAssetProvider: {
        provider: 'deterministic-test-double',
        model: 'fixture-draft-model',
        modelVersion: 'v1',
        mode: 'deterministic-test-double',
        dataUsePolicy: {
          provider: 'deterministic-test-double',
          policyVersion: 'fixture-policy-v1',
          trainingUse: 'prohibited',
          verifiedAt: '2026-07-31T00:00:00.000Z',
        },
        createDraftAsset: async () => fixtureDraftAsset,
      },
      resolveConfirmedPlan: async () => ({
        id: fixtureDraftAssetRequest.confirmedPlanId,
        projectId: authorisedProjectContext.projectId,
      }),
      resolveProjectContext: async () => authorisedProjectContext,
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-assets/${fixtureDraftAsset.id}/export`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe('generated-draft-asset-not-exportable');
    } finally {
      await app.close();
    }
  });
});
