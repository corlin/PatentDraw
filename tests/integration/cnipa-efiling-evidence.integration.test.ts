import {
  authorisedProjectContext,
  completeCnipaEvidenceRequest,
  fixtureFigureId,
  invalidCnipaEvidenceRequest,
  pumpReviewCorrectedSvg,
  workflowActorIds,
} from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { InMemoryPrivateObjectStorage } from '../../apps/api/src/infrastructure/object-storage.js';
import {
  assessCnipaEfilingEvidence,
  recordCnipaEfilingEvidence,
} from '../../apps/api/src/modules/svg-review-export/cnipa-evidence-service.js';
import { InMemorySvgWorkflowRepository } from '../../apps/api/src/modules/svg-review-export/repository.js';
import { createFigureRevision } from '../../apps/api/src/modules/svg-review-export/revision-service.js';

const sourceHash = `sha256:${'1'.repeat(64)}` as const;
const attorneyContext = {
  ...authorisedProjectContext,
  actorId: workflowActorIds.attorneyAgent,
  activeRole: 'attorney-agent' as const,
  roles: ['attorney-agent' as const],
  relationships: [],
};

describe('external CNIPA e-filing evidence boundary', () => {
  it('keeps a CNIPA SVG asset explicitly not electronic-submission-ready without evidence', async () => {
    const { repository, revision } = await revisionFixture();
    const assessment = await assessCnipaEfilingEvidence({
      repository,
      projectId: attorneyContext.projectId,
      revisionId: revision.id,
      revisionHash: revision.canonicalSvgHash,
    });
    expect(assessment).toMatchObject({
      label: 'not-CNIPA-electronic-submission-ready',
    });
    expect(assessment).not.toHaveProperty('evidenceId');
  });

  it('records only complete matching external XML evidence and returns a limited label', async () => {
    const { repository, revision } = await revisionFixture();
    const request = evidenceRequest(revision.id, revision.canonicalSvgHash);
    const evidence = await recordCnipaEfilingEvidence({
      repository,
      context: attorneyContext,
      request,
      evidenceId: 'cnipa-evidence-complete-01',
      now: () => new Date('2026-08-01T02:00:00.000Z'),
    });
    expect(evidence.recordedByActorId).toBe(attorneyContext.actorId);
    await expect(
      assessCnipaEfilingEvidence({
        repository,
        projectId: attorneyContext.projectId,
        revisionId: revision.id,
        revisionHash: revision.canonicalSvgHash,
        evidenceId: evidence.id,
      }),
    ).resolves.toEqual({
      label: 'CNIPA-XML-evidence-recorded',
      evidenceId: evidence.id,
      limitation: expect.stringContaining('does not prove filing'),
    });
  });

  it('rejects mismatched revision evidence and missing proofread attestation', async () => {
    const { repository, revision } = await revisionFixture();
    await expect(
      recordCnipaEfilingEvidence({
        repository,
        context: attorneyContext,
        request: evidenceRequest(revision.id, `sha256:${'f'.repeat(64)}`),
      }),
    ).rejects.toMatchObject({ code: 'cnipa-evidence-revision-mismatch', status: 422 });

    await expect(
      recordCnipaEfilingEvidence({
        repository,
        context: attorneyContext,
        request: {
          ...invalidCnipaEvidenceRequest,
          linkedRevisions: [
            { revisionId: revision.id, canonicalSvgHash: revision.canonicalSvgHash },
          ],
        } as never,
      }),
    ).rejects.toMatchObject({ code: 'cnipa-proofread-attestation-required', status: 422 });
  });
});

async function revisionFixture() {
  const repository = new InMemorySvgWorkflowRepository();
  const created = await createFigureRevision({
    repository,
    storage: new InMemoryPrivateObjectStorage(),
    context: { ...attorneyContext, activeRole: 'drafter', roles: ['drafter'] },
    figureId: fixtureFigureId,
    revisionId: 'revision-cnipa-evidence-01',
    sanitizationRunId: 'sanitize-cnipa-evidence-01',
    request: {
      svgText: pumpReviewCorrectedSvg,
      origin: { kind: 'import' },
      confirmedFigurePlanId: 'proposal-fixture-grounded-01',
      sourceLinks: [{ sourceAssetId: 'source-fixture-disclosure-01', contentHash: sourceHash }],
      referenceRegistryVersionId: 'registry-fixture-01',
      sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
    },
  });
  if (created.status !== 'accepted') throw new Error('Expected accepted CNIPA fixture revision.');
  return { repository, revision: created.revision };
}

function evidenceRequest(revisionId: string, canonicalSvgHash: `sha256:${string}`) {
  return {
    ...completeCnipaEvidenceRequest,
    linkedRevisions: [{ revisionId, canonicalSvgHash }],
  };
}
