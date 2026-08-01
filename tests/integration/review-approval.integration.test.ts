import {
  authorisedProjectContext,
  fixtureFigureId,
  pumpReviewCorrectedSvg,
  pumpV2Svg,
  workflowActorIds,
} from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import { InMemoryPrivateObjectStorage } from '../../apps/api/src/infrastructure/object-storage.js';
import type { ProjectContext } from '../../apps/api/src/modules/projects-assets/source-authorisation.js';
import { CNIPA_2026_PROFILE } from '../../apps/api/src/modules/svg-review-export/rule-profile-catalog.js';
import { InMemorySvgWorkflowRepository } from '../../apps/api/src/modules/svg-review-export/repository.js';
import {
  createExportCandidate,
  submitTechnicalReviewDecision,
} from '../../apps/api/src/modules/svg-review-export/review-service.js';
import {
  createFigureRevision,
  selectFigureRevision,
} from '../../apps/api/src/modules/svg-review-export/revision-service.js';
import { runRevisionRules } from '../../apps/api/src/modules/svg-review-export/rule-service.js';
import { getWorkflowSnapshot } from '../../apps/api/src/modules/svg-review-export/workflow-state.js';

const sourceHash = `sha256:${'1'.repeat(64)}` as const;

describe('independent technical review', () => {
  it('denies wrong-role, author self-review, stale-candidate and incomplete dispositions', async () => {
    const fixture = await checkedCandidate('denials');
    const completeDispositions = fixture.manualFindingIds.map((findingId) => ({
      findingId,
      disposition: 'accepted-with-reason' as const,
      reason: 'The label is indispensable and corresponds to the fictional source.',
    }));

    await expect(
      submitTechnicalReviewDecision({
        repository: fixture.repository,
        context: drafterContext,
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 3,
        request: decisionRequest(fixture.candidate.candidateFingerprint, completeDispositions),
      }),
    ).rejects.toMatchObject({ code: 'technical-reviewer-role-required', status: 403 });

    await expect(
      submitTechnicalReviewDecision({
        repository: fixture.repository,
        context: { ...reviewerContext, actorId: drafterContext.actorId },
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 3,
        request: decisionRequest(fixture.candidate.candidateFingerprint, completeDispositions),
      }),
    ).rejects.toMatchObject({ code: 'revision-author-cannot-technically-approve', status: 403 });

    await expect(
      submitTechnicalReviewDecision({
        repository: fixture.repository,
        context: reviewerContext,
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 3,
        request: decisionRequest(`sha256:${'f'.repeat(64)}`, completeDispositions),
      }),
    ).rejects.toMatchObject({ code: 'candidate-fingerprint-mismatch', status: 409 });

    await expect(
      submitTechnicalReviewDecision({
        repository: fixture.repository,
        context: reviewerContext,
        figureId: fixtureFigureId,
        candidateId: fixture.candidate.id,
        expectedVersion: 3,
        request: decisionRequest(fixture.candidate.candidateFingerprint, []),
      }),
    ).rejects.toMatchObject({ code: 'incomplete-finding-dispositions', status: 422 });
  });

  it('returns one exact candidate and approves a separately corrected candidate immutably', async () => {
    const returnedFixture = await checkedCandidate('returned');
    const returned = await submitTechnicalReviewDecision({
      repository: returnedFixture.repository,
      context: reviewerContext,
      figureId: fixtureFigureId,
      candidateId: returnedFixture.candidate.id,
      expectedVersion: 3,
      decisionId: 'technical-return-01',
      now: () => new Date('2026-08-01T01:00:00.000Z'),
      request: decisionRequest(
        returnedFixture.candidate.candidateFingerprint,
        returnedFixture.manualFindingIds.map((findingId) => ({
          findingId,
          disposition: 'requires-change',
          reason: 'Move the label leader so its correspondence is unambiguous.',
        })),
        'return-for-change',
        'The label-to-part correspondence must be clarified.',
      ),
    });
    expect(returned.decision.decision).toBe('return-for-change');
    expect(returned.projection.currentTechnicalDecisionId).toBe(returned.decision.id);
    expect(
      (
        await getWorkflowSnapshot({
          repository: returnedFixture.repository,
          context: drafterContext,
          figureId: fixtureFigureId,
        })
      ).state,
    ).toBe('changes-requested');

    const correctedFixture = await checkedCandidate('approved');
    const approved = await submitTechnicalReviewDecision({
      repository: correctedFixture.repository,
      context: reviewerContext,
      figureId: fixtureFigureId,
      candidateId: correctedFixture.candidate.id,
      expectedVersion: 3,
      decisionId: 'technical-approve-01',
      now: () => new Date('2026-08-01T01:05:00.000Z'),
      request: decisionRequest(
        correctedFixture.candidate.candidateFingerprint,
        correctedFixture.manualFindingIds.map((findingId) => ({
          findingId,
          disposition: 'accepted-with-reason',
          reason: 'The label is indispensable and matches the fictional disclosure.',
        })),
      ),
    });
    expect(approved.decision.decision).toBe('approve-structural-correspondence');
    expect(approved.decision.revisionId).toBe(correctedFixture.revision.id);
    expect(approved.decision.ruleRunId).toBe(correctedFixture.ruleRun.id);
    expect(
      await correctedFixture.repository.getTechnicalDecision(
        drafterContext.projectId,
        approved.decision.id,
      ),
    ).toEqual(approved.decision);
    expect(
      (
        await getWorkflowSnapshot({
          repository: correctedFixture.repository,
          context: reviewerContext,
          figureId: fixtureFigureId,
        })
      ).state,
    ).toBe('attorney-approval');
  });

  it('enforces the review route boundary and audits denied self-review attempts', async () => {
    const fixture = await checkedCandidate('route');
    const selfReviewerContext: ProjectContext = {
      ...reviewerContext,
      actorId: drafterContext.actorId,
    };
    const app = await createApp({
      svgWorkflowRepository: fixture.repository,
      resolveProjectContext: async ({ projectId, actorId }) => {
        if (projectId !== drafterContext.projectId) return null;
        if (actorId === selfReviewerContext.actorId) return selfReviewerContext;
        if (actorId === reviewerContext.actorId) return reviewerContext;
        return null;
      },
    });
    const url = `/projects/${drafterContext.projectId}/figures/${fixtureFigureId}/export-candidates/${fixture.candidate.id}/technical-decisions`;
    const dispositions = fixture.manualFindingIds.map((findingId) => ({
      findingId,
      disposition: 'accepted-with-reason' as const,
      reason: 'The live label corresponds to the fictional source.',
    }));
    try {
      const denied = await app.inject({
        method: 'POST',
        url,
        headers: {
          'x-patentdraw-project-id': drafterContext.projectId,
          'x-patentdraw-actor-id': selfReviewerContext.actorId,
          'if-match': 'workflow:3',
          'idempotency-key': 'self-review-route',
        },
        payload: decisionRequest(fixture.candidate.candidateFingerprint, dispositions),
      });
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({
        code: 'revision-author-cannot-technically-approve',
      });
      expect(
        (await fixture.repository.listAuditEvents(drafterContext.projectId, fixtureFigureId)).at(
          -1,
        ),
      ).toMatchObject({
        actorId: selfReviewerContext.actorId,
        activeRole: 'technical-reviewer',
        outcome: 'denied',
        reasonCode: 'revision-author-cannot-technically-approve',
      });

      const approved = await app.inject({
        method: 'POST',
        url,
        headers: {
          'x-patentdraw-project-id': drafterContext.projectId,
          'x-patentdraw-actor-id': reviewerContext.actorId,
          'if-match': 'workflow:3',
          'idempotency-key': 'approve-review-route',
        },
        payload: decisionRequest(fixture.candidate.candidateFingerprint, dispositions),
      });
      expect(approved.statusCode).toBe(201);
      expect(approved.json()).toMatchObject({
        decision: {
          candidateId: fixture.candidate.id,
          revisionId: fixture.revision.id,
          ruleRunId: fixture.ruleRun.id,
          actorId: reviewerContext.actorId,
        },
        workflow: { state: 'attorney-approval' },
      });
    } finally {
      await app.close();
    }
  });
});

async function checkedCandidate(suffix: string) {
  const repository = new InMemorySvgWorkflowRepository();
  const storage = new InMemoryPrivateObjectStorage();
  const created = await createFigureRevision({
    repository,
    storage,
    context: drafterContext,
    figureId: fixtureFigureId,
    revisionId: `revision-${suffix}`,
    sanitizationRunId: `sanitize-${suffix}`,
    request: {
      svgText: suffix === 'approved' ? pumpReviewCorrectedSvg : pumpV2Svg,
      origin: { kind: 'import' },
      confirmedFigurePlanId: 'proposal-fixture-grounded-01',
      sourceLinks: [{ sourceAssetId: 'source-fixture-disclosure-01', contentHash: sourceHash }],
      referenceRegistryVersionId: 'registry-fixture-01',
      sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
    },
  });
  if (created.status !== 'accepted') throw new Error('Expected accepted review fixture.');
  await selectFigureRevision({
    repository,
    context: drafterContext,
    figureId: fixtureFigureId,
    expectedVersion: 0,
    revisionId: created.revision.id,
    revisionFingerprint: created.revision.revisionFingerprint,
    expectedCurrentRevisionId: null,
  });
  const checked = await runRevisionRules({
    repository,
    storage,
    context: drafterContext,
    figureId: fixtureFigureId,
    revisionId: created.revision.id,
    expectedVersion: 1,
    ruleRunId: `rule-run-${suffix}`,
    request: {
      revisionHash: created.revision.canonicalSvgHash,
      profile: CNIPA_2026_PROFILE.ref,
    },
  });
  expect(checked.run.summary.fail).toBe(0);
  const candidate = await createExportCandidate({
    repository,
    context: drafterContext,
    figureId: fixtureFigureId,
    expectedVersion: 2,
    candidateId: `candidate-${suffix}`,
    request: {
      revisionId: created.revision.id,
      revisionHash: created.revision.canonicalSvgHash,
      revisionFingerprint: created.revision.revisionFingerprint,
      ruleRunId: checked.run.id,
      ruleProfileHash: checked.run.profileHash,
      exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
    },
  });
  return {
    repository,
    revision: created.revision,
    ruleRun: checked.run,
    candidate: candidate.candidate,
    manualFindingIds: checked.run.findings
      .filter((finding) => finding.outcome === 'manual-review-required')
      .map((finding) => finding.id),
  };
}

function decisionRequest(
  candidateFingerprint: `sha256:${string}`,
  findingDispositions: Array<{
    findingId: string;
    disposition: 'accepted-with-reason' | 'requires-change' | 'not-applicable';
    reason: string;
  }>,
  decision:
    'approve-structural-correspondence' | 'return-for-change' = 'approve-structural-correspondence',
  reason = 'The checked revision corresponds to the fictional source and FigurePlan.',
) {
  return { candidateFingerprint, decision, reason, findingDispositions };
}

const drafterContext: ProjectContext = {
  ...authorisedProjectContext,
  activeRole: 'drafter',
  roles: ['drafter'],
};

const reviewerContext: ProjectContext = {
  ...authorisedProjectContext,
  actorId: workflowActorIds.technicalReviewer,
  activeRole: 'technical-reviewer',
  roles: ['technical-reviewer'],
  relationships: [],
};
