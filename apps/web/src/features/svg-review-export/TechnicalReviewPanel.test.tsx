import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ExportCandidate, RuleRun, WorkflowSnapshot } from '@patentdraw/contracts';

import { RoleBoundaryNotice } from './RoleBoundaryNotice.js';
import { TechnicalReviewPanel } from './TechnicalReviewPanel.js';

const hash = `sha256:${'a'.repeat(64)}` as const;

describe('technical review workbench', () => {
  it('renders every manual finding with reasoned approve and return controls for the reviewer', () => {
    const html = renderToStaticMarkup(
      <TechnicalReviewPanel
        candidate={candidate}
        ruleRun={ruleRun}
        canReview
        busy={false}
        onSubmit={() => undefined}
      />,
    );
    expect(html).toContain('独立技术复核');
    expect(html).toContain('CNIPA-FIG-006');
    expect(html).toContain('逐项判断');
    expect(html).toContain('批准结构对应');
    expect(html).toContain('退回修改');
  });

  it('renders an authenticated waiting boundary without operational approval controls', () => {
    const waitingWorkflow: WorkflowSnapshot = {
      version: 3,
      etag: 'workflow:3',
      state: 'technical-review',
      actor: { id: 'drafter-fixture-01', activeRole: 'drafter', roles: ['drafter'] },
      current: {
        revisionId: 'revision-01',
        ruleRunId: 'run-01',
        candidateId: 'candidate-01',
      },
      primaryAction: {
        action: 'technical-approve',
        label: '提交技术审核',
        availability: 'waiting',
        requiredRole: 'technical-reviewer',
        targetId: 'candidate-01',
        blockingGates: [
          {
            code: 'required-active-role',
            message: 'Switch to or wait for the required technical-reviewer role.',
            recoveryAction: 'await-required-role',
          },
        ],
      },
      actions: [],
      blockingGates: [],
    };
    const html = renderToStaticMarkup(
      <>
        <RoleBoundaryNotice workflow={waitingWorkflow} />
        <TechnicalReviewPanel
          candidate={candidate}
          ruleRun={ruleRun}
          canReview={false}
          busy={false}
          onSubmit={() => undefined}
        />
      </>,
    );
    expect(html).toContain('drafter-fixture-01');
    expect(html).toContain('等待技术复核');
    expect(html).toContain('candidate-01');
    expect(html).not.toContain('批准结构对应</button>');
  });
});

const candidate: ExportCandidate = {
  id: 'candidate-01',
  projectId: 'project-fixture-pump',
  figureId: 'figure-fixture-pump-01',
  revisionId: 'revision-01',
  revisionHash: hash,
  revisionFingerprint: hash,
  ruleRunId: 'run-01',
  ruleProfileHash: hash,
  warningFindingIds: ['finding-warning-01'],
  manualFindingIds: ['finding-manual-01'],
  exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
  exportSettingsHash: hash,
  cnipaAssessment: { label: 'not-CNIPA-electronic-submission-ready' },
  candidateFingerprint: hash,
  createdByActorId: 'drafter-fixture-01',
  createdAt: '2026-08-01T00:00:00.000Z',
};

const ruleRun: RuleRun = {
  id: 'run-01',
  projectId: candidate.projectId,
  figureId: candidate.figureId,
  revisionId: candidate.revisionId,
  revisionHash: hash,
  revisionFingerprint: hash,
  profileId: 'CNIPA-2026.1',
  profileVersion: '1',
  profileHash: hash,
  profileEffectiveFrom: '2026-01-01',
  rendererVersion: '1',
  inputFingerprint: hash,
  summary: { pass: 3, warning: 1, manualReviewRequired: 1, fail: 0 },
  findings: [
    {
      id: 'finding-manual-01',
      ruleRunId: 'run-01',
      ruleId: 'CNIPA-FIG-006',
      officialSource: {
        title: 'CNIPA Guidelines',
        url: 'https://www.cnipa.gov.cn/example',
        section: '7.3',
        snapshotHash: hash,
        effectiveFrom: '2026-01-01',
      },
      evaluatedInput: { kind: 'text', inputHash: hash, description: 'Live drawing text' },
      predicateOrReviewPolicy: 'A named reviewer must decide whether text is indispensable.',
      outcome: 'manual-review-required',
      severity: 'major',
      evidence: [{ kind: 'bounding-box', description: 'Label 100' }],
      remediation: { summary: 'Record a reasoned disposition.' },
    },
  ],
  createdByActorId: 'drafter-fixture-01',
  createdAt: '2026-08-01T00:00:00.000Z',
};
