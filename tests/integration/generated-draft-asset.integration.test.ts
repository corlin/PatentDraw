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
  handoffToPersistedCanonicalRevision,
  handoffToIndependentFigureRevision,
  selectDraftAsset,
} from '../../apps/api/src/modules/ai-assistance/draft-asset-service.js';
import { InMemoryAiAssistanceRepository } from '../../apps/api/src/modules/ai-assistance/repository.js';
import { DeterministicDraftAssetProvider } from '../../apps/api/src/modules/ai-assistance/provider.js';
import { DraftJobService } from '../../apps/api/src/modules/ai-assistance/draft-job-service.js';

describe('generated draft asset boundary', () => {
  it('keeps a selected fixture draft ineligible for export after an independent SVG handoff', async () => {
    const job = await createDraftJob({
      context: authorisedProjectContext,
      request: fixtureDraftAssetRequest,
      confirmedPlan: {
        id: fixtureDraftAssetRequest.confirmedPlanId,
        projectId: authorisedProjectContext.projectId,
        purpose: 'Fixture confirmed plan.',
        selectedSources: authorisedProjectContext.authorisedSources,
        confirmedByActorId: authorisedProjectContext.actorId,
        confirmedAt: '2026-07-31T00:00:00.000Z',
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

  it('revalidates confirmed-plan source authority before invoking the draft provider', async () => {
    let providerCalled = false;
    const provider = new DeterministicDraftAssetProvider(fixtureDraftAsset);
    provider.createDraftAsset = async () => {
      providerCalled = true;
      return fixtureDraftAsset;
    };
    await expect(
      createDraftJob({
        context: {
          ...authorisedProjectContext,
          authorisedSources: authorisedProjectContext.authorisedSources.map((source) => ({
            ...source,
            revokedAt: '2026-07-31T00:00:00.000Z',
          })),
        },
        request: fixtureDraftAssetRequest,
        confirmedPlan: {
          id: fixtureDraftAssetRequest.confirmedPlanId,
          projectId: authorisedProjectContext.projectId,
          purpose: 'Fixture confirmed plan.',
          selectedSources: authorisedProjectContext.authorisedSources,
          confirmedByActorId: authorisedProjectContext.actorId,
          confirmedAt: '2026-07-31T00:00:00.000Z',
        },
        provider,
      }),
    ).rejects.toThrow('not authorised');
    expect(providerCalled).toBe(false);
  });

  it('keeps a persisted running job cancelled when the provider finishes later', async () => {
    const repository = new InMemoryAiAssistanceRepository();
    await repository.saveConfirmedPlan({
      id: fixtureDraftAssetRequest.confirmedPlanId,
      projectId: authorisedProjectContext.projectId,
      purpose: 'Fixture confirmed plan.',
      selectedSources: authorisedProjectContext.authorisedSources,
      confirmedByActorId: authorisedProjectContext.actorId,
      confirmedAt: '2026-07-31T00:00:00.000Z',
    });
    let releaseProvider!: () => void;
    const providerDone = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const provider = new DeterministicDraftAssetProvider(fixtureDraftAsset);
    provider.createDraftAsset = async () => {
      await providerDone;
      return fixtureDraftAsset;
    };
    const service = new DraftJobService(repository, provider);
    const queued = await service.enqueue({
      context: authorisedProjectContext,
      request: fixtureDraftAssetRequest,
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect((await service.get(authorisedProjectContext.projectId, queued.id))?.status).toBe(
      'running',
    );
    expect((await service.cancel(authorisedProjectContext.projectId, queued.id)).status).toBe(
      'cancelled',
    );
    releaseProvider();
    await new Promise((resolve) => setImmediate(resolve));
    expect((await service.get(authorisedProjectContext.projectId, queued.id))?.status).toBe(
      'cancelled',
    );
  });

  it('runs a queued draft asynchronously and reports its persisted result', async () => {
    const repository = new InMemoryAiAssistanceRepository();
    await repository.saveConfirmedPlan({
      id: fixtureDraftAssetRequest.confirmedPlanId,
      projectId: authorisedProjectContext.projectId,
      purpose: 'Fixture confirmed plan.',
      selectedSources: authorisedProjectContext.authorisedSources,
      confirmedByActorId: authorisedProjectContext.actorId,
      confirmedAt: '2026-07-31T00:00:00.000Z',
    });
    await repository.saveCanonicalFigureRevision({
      id: 'revision-fixture-route-svg-01',
      projectId: authorisedProjectContext.projectId,
      canonicalSvgHash: 'sha256:canonical-svg-route-fixture',
      sanitized: true,
      createdByActorId: authorisedProjectContext.actorId,
    });
    const app = await createApp({
      repository,
      draftAssetProvider: new DeterministicDraftAssetProvider(fixtureDraftAsset),
      resolveProjectContext: async () => authorisedProjectContext,
    });
    try {
      const created = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-assets`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
        payload: fixtureDraftAssetRequest,
      });
      expect(created.statusCode).toBe(202);
      expect(created.json().status).toBe('queued');

      await new Promise((resolve) => setImmediate(resolve));
      const result = await app.inject({
        method: 'GET',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-jobs/${created.json().id}`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
      });
      expect(result.statusCode).toBe(200);
      expect(result.json().status).toBe('ready');
      expect(result.json().asset.aiRunId).not.toBe(fixtureDraftAsset.aiRunId);
      expect(
        (await repository.listAuditEvents(authorisedProjectContext.projectId))[0]?.provenance
          ?.selectedSourceHashes,
      ).toEqual(['sha256:fixture-disclosure-01']);
      const selected = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-jobs/${created.json().id}/select`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
      });
      expect(selected.statusCode).toBe(200);
      expect(selected.json().asset.selectionState).toBe('selected');
      const handoff = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-assets/handoff`,
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
        payload: {
          jobId: created.json().id,
          canonicalFigureRevisionId: 'revision-fixture-route-svg-01',
        },
      });
      expect(handoff.statusCode).toBe(200);
      expect(handoff.json().exportEligible).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('accepts only a separately persisted sanitized canonical SVG revision', async () => {
    const repository = new InMemoryAiAssistanceRepository();
    const job = await createDraftJob({
      context: authorisedProjectContext,
      request: fixtureDraftAssetRequest,
      confirmedPlan: {
        id: fixtureDraftAssetRequest.confirmedPlanId,
        projectId: authorisedProjectContext.projectId,
        purpose: 'Fixture confirmed plan.',
        selectedSources: authorisedProjectContext.authorisedSources,
        confirmedByActorId: authorisedProjectContext.actorId,
        confirmedAt: '2026-07-31T00:00:00.000Z',
      },
      provider: new DeterministicDraftAssetProvider(fixtureDraftAsset),
      repository,
    });
    await repository.saveCanonicalFigureRevision({
      id: 'revision-fixture-persisted-svg-01',
      projectId: authorisedProjectContext.projectId,
      canonicalSvgHash: 'sha256:canonical-svg-fixture',
      sanitized: true,
      createdByActorId: authorisedProjectContext.actorId,
    });
    const result = await handoffToPersistedCanonicalRevision({
      repository,
      projectId: authorisedProjectContext.projectId,
      job: selectDraftAsset(job),
      revisionId: 'revision-fixture-persisted-svg-01',
    });
    expect(result.exportEligible).toBe(false);
    expect(result.canonicalFigureRevisionId).toBe('revision-fixture-persisted-svg-01');
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

  it('supports explicit rejection and retry only from recoverable draft states', async () => {
    const repository = new InMemoryAiAssistanceRepository();
    await repository.saveConfirmedPlan({
      id: fixtureDraftAssetRequest.confirmedPlanId,
      projectId: authorisedProjectContext.projectId,
      purpose: 'Fixture confirmed plan.',
      selectedSources: authorisedProjectContext.authorisedSources,
      confirmedByActorId: authorisedProjectContext.actorId,
      confirmedAt: '2026-07-31T00:00:00.000Z',
    });
    const service = new DraftJobService(
      repository,
      new DeterministicDraftAssetProvider(fixtureDraftAsset),
    );
    await repository.saveDraftJob(authorisedProjectContext.projectId, {
      id: 'job-ready-for-rejection',
      status: 'ready',
      progressPercent: 100,
      asset: fixtureDraftAsset,
    });
    expect(
      (await service.reject(authorisedProjectContext.projectId, 'job-ready-for-rejection', 'Not suitable.')).status,
    ).toBe('rejected');
    const retried = await service.retry({
      context: authorisedProjectContext,
      jobId: 'job-ready-for-rejection',
      request: fixtureDraftAssetRequest,
    });
    expect(retried.status).toBe('queued');
    expect(retried.id).not.toBe('job-ready-for-rejection');
  });
});
