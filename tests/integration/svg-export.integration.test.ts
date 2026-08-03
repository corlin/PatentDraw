import {
  authorisedProjectContext,
  completeCnipaEvidenceRequest,
  fixtureFigureId,
  pumpReviewCorrectedSvg,
  workflowActorIds,
} from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import {
  InMemoryPrivateObjectStorage,
  type PrivateObjectStorage,
} from '../../apps/api/src/infrastructure/object-storage.js';
import type { ProjectContext } from '../../apps/api/src/modules/projects-assets/source-authorisation.js';
import { recordCnipaEfilingEvidence } from '../../apps/api/src/modules/svg-review-export/cnipa-evidence-service.js';
import { createExportPackage } from '../../apps/api/src/modules/svg-review-export/export-service.js';
import {
  createExportCandidate,
  submitAttorneyApprovalDecision,
  submitTechnicalReviewDecision,
} from '../../apps/api/src/modules/svg-review-export/review-service.js';
import { CNIPA_2026_PROFILE } from '../../apps/api/src/modules/svg-review-export/rule-profile-catalog.js';
import { InMemorySvgWorkflowRepository } from '../../apps/api/src/modules/svg-review-export/repository.js';
import {
  createFigureRevision,
  selectFigureRevision,
} from '../../apps/api/src/modules/svg-review-export/revision-service.js';
import { runRevisionRules } from '../../apps/api/src/modules/svg-review-export/rule-service.js';

const sourceHash = `sha256:${'1'.repeat(64)}` as const;

describe('attorney approval and auditable SVG export', () => {
  it('enforces third-actor separation and exact warning acknowledgment', async () => {
    const fixture = await technicallyApprovedFixture('attorney-gates');
    const request = attorneyRequest(fixture);
    await expect(
      submitAttorneyApprovalDecision({
        repository: fixture.repository,
        context: { ...attorneyContext, actorId: drafterContext.actorId },
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 4,
        request,
      }),
    ).rejects.toMatchObject({ code: 'revision-author-cannot-attorney-approve', status: 403 });
    await expect(
      submitAttorneyApprovalDecision({
        repository: fixture.repository,
        context: { ...attorneyContext, actorId: reviewerContext.actorId },
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 4,
        request,
      }),
    ).rejects.toMatchObject({ code: 'technical-reviewer-cannot-attorney-approve', status: 403 });
    await expect(
      submitAttorneyApprovalDecision({
        repository: fixture.repository,
        context: attorneyContext,
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 4,
        request: { ...request, acknowledgedWarningFindingIds: [] },
      }),
    ).rejects.toMatchObject({ code: 'warning-acknowledgment-incomplete', status: 422 });
    await expect(
      submitAttorneyApprovalDecision({
        repository: fixture.repository,
        context: { ...attorneyContext, relationships: ['inventor'] },
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 4,
        request,
      }),
    ).rejects.toMatchObject({ code: 'inventor-or-contributor-cannot-approve', status: 403 });
  });

  it('denies export without approval and when canonical bytes no longer match', async () => {
    const missingApproval = await technicallyApprovedFixture('missing-approval');
    await expect(
      createExportPackage({
        repository: missingApproval.repository,
        storage: missingApproval.storage,
        context: attorneyContext,
        figureId: fixtureFigureId,
        candidateId: missingApproval.candidate.id,
        expectedVersion: 4,
        request: {
          candidateFingerprint: missingApproval.candidate.candidateFingerprint,
          technicalDecisionId: missingApproval.technicalDecision.id,
          attorneyDecisionId: 'missing-attorney-decision',
        },
      }),
    ).rejects.toMatchObject({ code: 'attorney-approval-required', status: 409 });

    const corruptStorage = new CorruptingStorage();
    const corruptFixture = await technicallyApprovedFixture('hash-mismatch', corruptStorage);
    const attorney = await approveAttorney(corruptFixture);
    corruptStorage.corruptReads = true;
    await expect(
      createExportPackage({
        repository: corruptFixture.repository,
        storage: corruptStorage,
        context: attorneyContext,
        figureId: fixtureFigureId,
        candidateId: corruptFixture.candidate.id,
        expectedVersion: 5,
        request: exportRequest(corruptFixture, attorney.decision.id),
      }),
    ).rejects.toMatchObject({ code: 'export-svg-hash-mismatch', status: 409 });
    expect(
      await corruptFixture.repository.getProjection(attorneyContext.projectId, fixtureFigureId),
    ).not.toHaveProperty('currentExportPackageId');
  });

  it('returns one completed package for an idempotent route retry with matching artifacts', async () => {
    const fixture = await technicallyApprovedFixture('idempotent');
    const attorney = await approveAttorney(fixture);
    const app = await createApp({
      svgWorkflowRepository: fixture.repository,
      svgObjectStorage: fixture.storage,
      resolveProjectContext: async ({ projectId, actorId }) =>
        projectId === attorneyContext.projectId && actorId === attorneyContext.actorId
          ? attorneyContext
          : null,
    });
    const url = `/projects/${attorneyContext.projectId}/figures/${fixtureFigureId}/export-candidates/${fixture.candidate.id}/export-packages`;
    const headers = {
      'x-patentdraw-project-id': attorneyContext.projectId,
      'x-patentdraw-actor-id': attorneyContext.actorId,
      'if-match': 'workflow:5',
      'idempotency-key': 'export-package-idempotent-01',
    };
    try {
      const first = await app.inject({
        method: 'POST',
        url,
        headers,
        payload: exportRequest(fixture, attorney.decision.id),
      });
      const replay = await app.inject({
        method: 'POST',
        url,
        headers,
        payload: exportRequest(fixture, attorney.decision.id),
      });
      expect(first.statusCode).toBe(201);
      expect(replay.statusCode).toBe(200);
      expect(replay.json().package.id).toBe(first.json().package.id);

      const svg = await app.inject({
        method: 'GET',
        url: `/projects/${attorneyContext.projectId}/figures/${fixtureFigureId}/export-packages/${first.json().package.id}/svg`,
        headers,
      });
      const manifest = await app.inject({
        method: 'GET',
        url: `/projects/${attorneyContext.projectId}/figures/${fixtureFigureId}/export-packages/${first.json().package.id}/manifest`,
        headers,
      });
      expect(svg.statusCode).toBe(200);
      expect(svg.headers['content-type']).toContain('image/svg+xml');
      expect(manifest.statusCode).toBe(200);
      expect(manifest.json()).toMatchObject({
        packageId: first.json().package.id,
        candidateFingerprint: fixture.candidate.candidateFingerprint,
        artifacts: [{ sha256: first.json().package.svgHash }],
        review: {
          technicalDecisionId: fixture.technicalDecision.id,
          attorneyDecisionId: attorney.decision.id,
        },
        cnipa: { label: 'not-CNIPA-electronic-submission-ready' },
      });
    } finally {
      await app.close();
    }
  });

  it('binds complete matching external XML evidence to the limited manifest label', async () => {
    const fixture = await technicallyApprovedFixture(
      'matching-cnipa-evidence',
      new InMemoryPrivateObjectStorage(),
      true,
    );
    const attorney = await approveAttorney(fixture);
    const exported = await createExportPackage({
      repository: fixture.repository,
      storage: fixture.storage,
      context: attorneyContext,
      figureId: fixtureFigureId,
      candidateId: fixture.candidate.id,
      expectedVersion: 5,
      request: exportRequest(fixture, attorney.decision.id),
    });
    expect(exported.manifest.cnipa).toEqual({
      label: 'CNIPA-XML-evidence-recorded',
      evidenceId: fixture.cnipaEvidenceId,
      limitation: expect.stringContaining('does not prove filing'),
    });
    expect(exported.manifest.limitations).toContain('CNIPA-XML-evidence-recorded');
    expect(JSON.stringify(exported.manifest)).not.toMatch(
      /ready-for-filing|submitted|accepted-by/i,
    );
  });
});

async function technicallyApprovedFixture(
  suffix: string,
  storage: PrivateObjectStorage = new InMemoryPrivateObjectStorage(),
  withCnipaEvidence = false,
) {
  const repository = new InMemorySvgWorkflowRepository();
  const revisionResult = await createFigureRevision({
    repository,
    storage,
    context: drafterContext,
    figureId: fixtureFigureId,
    revisionId: `revision-export-${suffix}`,
    sanitizationRunId: `sanitize-export-${suffix}`,
    request: {
      svgText: pumpReviewCorrectedSvg,
      origin: { kind: 'import' },
      confirmedFigurePlanId: 'proposal-fixture-grounded-01',
      sourceLinks: [{ sourceAssetId: 'source-fixture-disclosure-01', contentHash: sourceHash }],
      referenceRegistryVersionId: 'registry-fixture-01',
      sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
    },
  });
  if (revisionResult.status !== 'accepted') throw new Error('Expected accepted export revision.');
  const evidence = withCnipaEvidence
    ? await recordCnipaEfilingEvidence({
        repository,
        context: attorneyContext,
        evidenceId: `cnipa-evidence-export-${suffix}`,
        request: {
          ...completeCnipaEvidenceRequest,
          linkedRevisions: [
            {
              revisionId: revisionResult.revision.id,
              canonicalSvgHash: revisionResult.revision.canonicalSvgHash,
            },
          ],
        },
      })
    : undefined;
  await selectFigureRevision({
    repository,
    context: drafterContext,
    figureId: fixtureFigureId,
    expectedVersion: 0,
    revisionId: revisionResult.revision.id,
    revisionFingerprint: revisionResult.revision.revisionFingerprint,
    expectedCurrentRevisionId: null,
  });
  const rules = await runRevisionRules({
    repository,
    storage,
    context: drafterContext,
    figureId: fixtureFigureId,
    revisionId: revisionResult.revision.id,
    expectedVersion: 1,
    ruleRunId: `rule-export-${suffix}`,
    request: {
      revisionHash: revisionResult.revision.canonicalSvgHash,
      profile: CNIPA_2026_PROFILE.ref,
    },
  });
  const candidateResult = await createExportCandidate({
    repository,
    context: drafterContext,
    figureId: fixtureFigureId,
    expectedVersion: 2,
    candidateId: `candidate-export-${suffix}`,
    request: {
      revisionId: revisionResult.revision.id,
      revisionHash: revisionResult.revision.canonicalSvgHash,
      revisionFingerprint: revisionResult.revision.revisionFingerprint,
      ruleRunId: rules.run.id,
      ruleProfileHash: rules.run.profileHash,
      exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
      ...(evidence ? { cnipaEvidenceId: evidence.id } : {}),
    },
  });
  const technical = await submitTechnicalReviewDecision({
    repository,
    context: reviewerContext,
    figureId: fixtureFigureId,
    candidateId: candidateResult.candidate.id,
    expectedVersion: 3,
    decisionId: `technical-export-${suffix}`,
    request: {
      candidateFingerprint: candidateResult.candidate.candidateFingerprint,
      decision: 'approve-structural-correspondence',
      reason: 'The corrected fixture corresponds to the fictional source.',
      findingDispositions: candidateResult.candidate.manualFindingIds.map((findingId) => ({
        findingId,
        disposition: 'accepted-with-reason',
        reason: 'The text and leader are indispensable and correspond to the source.',
      })),
    },
  });
  return {
    repository,
    storage,
    revision: revisionResult.revision,
    ruleRun: rules.run,
    candidate: candidateResult.candidate,
    technicalDecision: technical.decision,
    cnipaEvidenceId: evidence?.id,
  };
}

function attorneyRequest(fixture: Awaited<ReturnType<typeof technicallyApprovedFixture>>) {
  return {
    candidateFingerprint: fixture.candidate.candidateFingerprint,
    technicalDecisionId: fixture.technicalDecision.id,
    decision: 'approve-export' as const,
    reason: 'Approved as a reviewed drawing asset with the displayed limitations.',
    acknowledgedWarningFindingIds: [...fixture.candidate.warningFindingIds],
  };
}

function approveAttorney(fixture: Awaited<ReturnType<typeof technicallyApprovedFixture>>) {
  return submitAttorneyApprovalDecision({
    repository: fixture.repository,
    context: attorneyContext,
    figureId: fixtureFigureId,
    candidateId: fixture.candidate.id,
    expectedVersion: 4,
    decisionId: `attorney-${fixture.candidate.id}`,
    request: attorneyRequest(fixture),
  });
}

function exportRequest(
  fixture: Awaited<ReturnType<typeof technicallyApprovedFixture>>,
  attorneyDecisionId: string,
) {
  return {
    candidateFingerprint: fixture.candidate.candidateFingerprint,
    technicalDecisionId: fixture.technicalDecision.id,
    attorneyDecisionId,
  };
}

class CorruptingStorage implements PrivateObjectStorage {
  private readonly delegate = new InMemoryPrivateObjectStorage();
  corruptReads = false;

  put(content: Uint8Array, retentionExpiresAt?: string) {
    return this.delegate.put(content, retentionExpiresAt);
  }

  async get(blobHash: string): Promise<Uint8Array> {
    const content = await this.delegate.get(blobHash);
    return this.corruptReads ? new Uint8Array([...content, 0x20]) : content;
  }

  delete(blobHash: string) {
    return this.delegate.delete(blobHash);
  }

  purgeExpired(now: Date) {
    return this.delegate.purgeExpired(now);
  }
}

const drafterContext: ProjectContext = {
  ...authorisedProjectContext,
  activeRole: 'drafter',
  roles: ['drafter'],
  relationships: [],
};

const reviewerContext: ProjectContext = {
  ...authorisedProjectContext,
  actorId: workflowActorIds.technicalReviewer,
  activeRole: 'technical-reviewer',
  roles: ['technical-reviewer'],
  relationships: [],
};

const attorneyContext: ProjectContext = {
  ...authorisedProjectContext,
  actorId: workflowActorIds.attorneyAgent,
  activeRole: 'attorney-agent',
  roles: ['attorney-agent'],
  relationships: [],
};
