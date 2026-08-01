import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDeterministicDemoOptions } from '../../apps/api/src/runtime-composition.js';
import { CNIPA_2026_PROFILE } from '../../apps/api/src/modules/svg-review-export/rule-profile-catalog.js';

import {
  AttorneyApprovalDecisionSchema,
  CandidateSelectionRequestSchema,
  CreateExportCandidateRequestSchema,
  CreateFigureRevisionRequestSchema,
  CreateRuleRunRequestSchema,
  ExportPackageSchema,
  FigureRevisionSchema,
  RuleFindingSchema,
  RuleRunSchema,
  SvgSanitizationRunSchema,
  TechnicalReviewDecisionSchema,
  TechnicalReviewDecisionRequestSchema,
  WorkflowAuditEventSchema,
  WorkflowInvalidationSchema,
  WorkflowProblemSchema,
  WorkflowSnapshotSchema,
} from '../../packages/contracts/src/index.js';

const hash = `sha256:${'a'.repeat(64)}`;
const occurredAt = '2026-08-01T00:00:00.000Z';

describe('SVG review and export contracts', () => {
  it('accepts the canonical revision and sanitization evidence boundary', () => {
    expect(
      Value.Check(SvgSanitizationRunSchema, {
        id: 'sanitize-01',
        projectId: 'project-fixture-pump',
        figureId: 'figure-fixture-pump-01',
        inputBlobHash: hash,
        sanitizerName: 'patentdraw-svg-sanitizer',
        sanitizerVersion: '1',
        status: 'accepted',
        canonicalSvgHash: hash,
        issues: [],
        detected: {
          externalResources: 0,
          eventHandlers: 0,
          scriptElements: 0,
          foreignObjects: 0,
          rasterEmbeds: 0,
          unsupportedElements: [],
          textState: 'live-text',
        },
        actorId: 'drafter-fixture-01',
        occurredAt,
      }),
    ).toBe(true);

    expect(
      Value.Check(FigureRevisionSchema, {
        id: 'revision-01',
        projectId: 'project-fixture-pump',
        figureId: 'figure-fixture-pump-01',
        canonicalSvgHash: hash,
        revisionFingerprint: hash,
        sanitizationRunId: 'sanitize-01',
        origin: { kind: 'import' },
        sourceLinks: [{ sourceAssetId: 'source-01', contentHash: hash }],
        confirmedFigurePlanId: 'plan-01',
        referenceRegistryVersionId: 'registry-01',
        initialRuleProfile: { id: 'CNIPA-2026.1', version: '1', profileHash: hash },
        sheet: {
          standard: 'A4',
          widthMm: 210,
          heightMm: 297,
          orientation: 'portrait',
          viewBox: [0, 0, 210, 297],
        },
        textState: 'live-text',
        semanticGroups: ['figure-content'],
        createdByActorId: 'drafter-fixture-01',
        createdAt: occurredAt,
      }),
    ).toBe(true);
  });

  it('accepts evidence-bearing rule artifacts and separate decisions', () => {
    const finding = {
      id: 'finding-01',
      ruleRunId: 'run-01',
      ruleId: 'CNIPA-FIG-006',
      officialSource: {
        title: 'CNIPA Guidelines',
        url: 'https://www.cnipa.gov.cn/example',
        section: 'Part I Chapter 2 7.3',
        snapshotHash: hash,
        effectiveFrom: '2026-01-01',
      },
      evaluatedInput: { kind: 'text', inputHash: hash, description: 'Drawing annotations' },
      predicateOrReviewPolicy: 'Review whether text is indispensable.',
      outcome: 'manual-review-required',
      severity: 'major',
      evidence: [{ kind: 'sheet-region', description: 'Annotation region' }],
      remediation: { summary: 'Record a named reviewer disposition.' },
    };
    expect(Value.Check(RuleFindingSchema, finding)).toBe(true);
    expect(
      Value.Check(RuleRunSchema, {
        id: 'run-01',
        projectId: 'project-fixture-pump',
        figureId: 'figure-fixture-pump-01',
        revisionId: 'revision-01',
        revisionHash: hash,
        revisionFingerprint: hash,
        profileId: 'CNIPA-2026.1',
        profileVersion: '1',
        profileHash: hash,
        profileEffectiveFrom: '2026-01-01',
        rendererVersion: '1',
        inputFingerprint: hash,
        summary: { pass: 0, warning: 0, manualReviewRequired: 1, fail: 0 },
        findings: [finding],
        createdByActorId: 'drafter-fixture-01',
        createdAt: occurredAt,
      }),
    ).toBe(true);
    expect(
      Value.Check(TechnicalReviewDecisionSchema, {
        id: 'technical-01',
        candidateId: 'candidate-01',
        candidateFingerprint: hash,
        revisionId: 'revision-01',
        ruleRunId: 'run-01',
        decision: 'approve-structural-correspondence',
        reason: 'Source correspondence reviewed.',
        findingDispositions: [
          {
            findingId: 'finding-01',
            disposition: 'accepted-with-reason',
            reason: 'Text is needed inside the flow block.',
          },
        ],
        actorId: 'technical-reviewer-fixture-01',
        activeRole: 'technical-reviewer',
        decidedAt: occurredAt,
      }),
    ).toBe(true);
    expect(
      Value.Check(AttorneyApprovalDecisionSchema, {
        id: 'attorney-01',
        candidateId: 'candidate-01',
        candidateFingerprint: hash,
        technicalDecisionId: 'technical-01',
        decision: 'approve-export',
        reason: 'Reviewed asset approved for internal export.',
        acknowledgedWarningFindingIds: [],
        actorId: 'attorney-fixture-01',
        activeRole: 'attorney-agent',
        decidedAt: occurredAt,
      }),
    ).toBe(true);
  });

  it('accepts workflow projection, invalidation, package, audit and problem records', () => {
    expect(
      Value.Check(WorkflowSnapshotSchema, {
        version: 1,
        etag: 'workflow:1',
        state: 'canonical-revision',
        actor: {
          id: 'drafter-fixture-01',
          activeRole: 'drafter',
          roles: ['drafter'],
        },
        current: { revisionId: 'revision-01' },
        primaryAction: {
          action: 'run-checks',
          label: '运行规则检查',
          availability: 'enabled',
          targetId: 'revision-01',
          blockingGates: [],
        },
        actions: [],
        blockingGates: [],
      }),
    ).toBe(true);
    expect(
      Value.Check(WorkflowInvalidationSchema, {
        id: 'invalidation-01',
        projectId: 'project-fixture-pump',
        figureId: 'figure-fixture-pump-01',
        cause: {
          kind: 'canonical-svg',
          targetId: 'revision-01',
          previousFingerprint: hash,
          nextFingerprint: `sha256:${'b'.repeat(64)}`,
        },
        affected: {
          ruleRunIds: ['run-01'],
          exportCandidateIds: ['candidate-01'],
          technicalDecisionIds: ['technical-01'],
          attorneyDecisionIds: ['attorney-01'],
        },
        earliestRequiredAction: 'run-checks',
        actorId: 'drafter-fixture-01',
        reason: 'Canonical SVG changed.',
        occurredAt,
      }),
    ).toBe(true);
    expect(
      Value.Check(ExportPackageSchema, {
        id: 'package-01',
        projectId: 'project-fixture-pump',
        figureId: 'figure-fixture-pump-01',
        candidateId: 'candidate-01',
        candidateFingerprint: hash,
        revisionId: 'revision-01',
        ruleRunId: 'run-01',
        technicalDecisionId: 'technical-01',
        attorneyDecisionId: 'attorney-01',
        svgHash: hash,
        manifestHash: hash,
        cnipaLabel: 'not-CNIPA-electronic-submission-ready',
        createdByActorId: 'attorney-fixture-01',
        createdAt: occurredAt,
      }),
    ).toBe(true);
    expect(
      Value.Check(WorkflowAuditEventSchema, {
        id: 'audit-01',
        projectId: 'project-fixture-pump',
        eventType: 'workflow-command-denied',
        actorId: 'drafter-fixture-01',
        activeRole: 'drafter',
        targetIds: ['candidate-01'],
        outcome: 'denied',
        reasonCode: 'self-approval-denied',
        reason: 'The revision author cannot approve the candidate.',
        fingerprints: { candidate: hash },
        occurredAt,
      }),
    ).toBe(true);
    expect(
      Value.Check(WorkflowProblemSchema, {
        type: 'urn:patentdraw:problem:stale-workflow',
        title: 'Workflow state changed',
        status: 409,
        code: 'stale-workflow',
        detail: 'Reload the current workflow.',
        current: { workflowVersion: 2, state: 'invalidated' },
      }),
    ).toBe(true);
  });

  it('validates revision, selection and rule-run command boundaries', () => {
    expect(
      Value.Check(CreateFigureRevisionRequestSchema, {
        svgText:
          '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><path d="M20 20h40"/></svg>',
        origin: { kind: 'import' },
        confirmedFigurePlanId: 'proposal-fixture-grounded-01',
        sourceLinks: [{ sourceAssetId: 'source-01', contentHash: hash }],
        referenceRegistryVersionId: 'registry-01',
        sheet: {
          standard: 'A4',
          widthMm: 210,
          heightMm: 297,
          orientation: 'portrait',
        },
      }),
    ).toBe(true);
    expect(
      Value.Check(CandidateSelectionRequestSchema, {
        revisionId: 'revision-01',
        revisionFingerprint: hash,
        expectedCurrentRevisionId: null,
      }),
    ).toBe(true);
    expect(
      Value.Check(CreateRuleRunRequestSchema, {
        revisionHash: hash,
        profile: { id: 'CNIPA-2026.1', version: '1', profileHash: hash },
      }),
    ).toBe(true);
    expect(
      Value.Check(CreateRuleRunRequestSchema, {
        revisionHash: `sha256:${'z'.repeat(64)}`,
        profile: { id: 'CNIPA-2026.1', version: '1', profileHash: hash },
      }),
    ).toBe(false);
  });

  it('validates exact-candidate technical review command boundaries', () => {
    expect(
      Value.Check(CreateExportCandidateRequestSchema, {
        revisionId: 'revision-01',
        revisionHash: hash,
        revisionFingerprint: hash,
        ruleRunId: 'run-01',
        ruleProfileHash: hash,
        exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
      }),
    ).toBe(true);
    expect(
      Value.Check(TechnicalReviewDecisionRequestSchema, {
        candidateFingerprint: hash,
        decision: 'approve-structural-correspondence',
        reason: 'The source, FigurePlan and checked revision correspond.',
        findingDispositions: [
          {
            findingId: 'finding-manual-01',
            disposition: 'accepted-with-reason',
            reason: 'The live label is indispensable to explain the flow path.',
          },
        ],
      }),
    ).toBe(true);
    expect(
      Value.Check(TechnicalReviewDecisionRequestSchema, {
        candidateFingerprint: hash,
        decision: 'return-for-change',
        reason: '',
        findingDispositions: [],
      }),
    ).toBe(false);
    expect(
      Value.Check(TechnicalReviewDecisionRequestSchema, {
        candidateFingerprint: hash,
        decision: 'approve-structural-correspondence',
        reason: 'Reviewed.',
        findingDispositions: [
          {
            findingId: 'finding-manual-01',
            disposition: 'accepted-with-reason',
            reason: '',
          },
        ],
      }),
    ).toBe(false);
  });

  it('returns bounded endpoint contracts for sanitization rejection and stale content hashes', async () => {
    const app = await createApp(await createDeterministicDemoOptions());
    const headers = {
      'x-patentdraw-project-id': 'project-fixture-pump',
      'x-patentdraw-actor-id': 'drafter-fixture-01',
    };
    try {
      const rejected = await app.inject({
        method: 'POST',
        url: '/projects/project-fixture-pump/figures/figure-fixture-pump-01/revisions',
        headers: { ...headers, 'idempotency-key': 'unsafe-revision-contract' },
        payload: revisionRequest('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      });
      expect(rejected.statusCode).toBe(422);
      expect(rejected.json()).toMatchObject({ status: 'rejected' });
      expect(rejected.json().revision).toBeUndefined();

      const created = await app.inject({
        method: 'POST',
        url: '/projects/project-fixture-pump/figures/figure-fixture-pump-01/revisions',
        headers: { ...headers, 'idempotency-key': 'safe-revision-contract' },
        payload: revisionRequest(
          '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect x="20" y="20" width="30" height="20" fill="none" stroke="#000"/></svg>',
        ),
      });
      expect(created.statusCode).toBe(201);
      const revision = created.json().revision;
      const selected = await app.inject({
        method: 'POST',
        url: '/projects/project-fixture-pump/figures/figure-fixture-pump-01/candidate-selections',
        headers: {
          ...headers,
          'if-match': 'workflow:0',
          'idempotency-key': 'select-revision-contract',
        },
        payload: {
          revisionId: revision.id,
          revisionFingerprint: revision.revisionFingerprint,
          expectedCurrentRevisionId: null,
        },
      });
      expect(selected.statusCode).toBe(201);
      const stale = await app.inject({
        method: 'POST',
        url: `/projects/project-fixture-pump/figures/figure-fixture-pump-01/revisions/${revision.id}/rule-runs`,
        headers: {
          ...headers,
          'if-match': 'workflow:1',
          'idempotency-key': 'stale-hash-contract',
        },
        payload: {
          revisionHash: `sha256:${'b'.repeat(64)}`,
          profile: CNIPA_2026_PROFILE.ref,
        },
      });
      expect(stale.statusCode).toBe(409);
      expect(stale.json()).toMatchObject({ code: 'revision-content-mismatch' });
    } finally {
      await app.close();
    }
  });
});

function revisionRequest(svgText: string) {
  return {
    svgText,
    origin: { kind: 'import' },
    confirmedFigurePlanId: 'proposal-fixture-grounded-01',
    sourceLinks: [{ sourceAssetId: 'source-01', contentHash: hash }],
    referenceRegistryVersionId: 'registry-01',
    sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
  };
}
