import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type {
  ExportCandidate,
  ExportManifest,
  ExportPackage,
  TechnicalReviewDecision,
} from '@patentdraw/contracts';

import { AttorneyApprovalPanel } from './AttorneyApprovalPanel.js';
import { ExportGatePanel } from './ExportGatePanel.js';
import { ExportHistory } from './ExportHistory.js';
import { ManifestPreview } from './ManifestPreview.js';

const hash = `sha256:${'a'.repeat(64)}` as const;

describe('attorney approval and export panels', () => {
  it('renders exact technical approval, warning acknowledgment and limited CNIPA label', () => {
    const html = renderToStaticMarkup(
      <AttorneyApprovalPanel
        candidate={candidate}
        technicalDecision={technicalDecision}
        canApprove
        busy={false}
        onSubmit={() => undefined}
      />,
    );
    expect(html).toContain('代理人独立审批');
    expect(html).toContain(technicalDecision.id);
    expect(html).toContain('warning-01');
    expect(html).toContain('not-CNIPA-electronic-submission-ready');
    expect(html).toContain('批准导出候选');
    expect(html).toContain('拒绝导出');
  });

  it('renders the manifest chain, immutable package history and download actions', () => {
    const html = renderToStaticMarkup(
      <>
        <ExportGatePanel
          candidate={candidate}
          attorneyDecisionId="attorney-01"
          packageRecord={packageRecord}
          busy={false}
          canExport
          onExport={() => undefined}
        />
        <ManifestPreview manifest={manifest} />
        <ExportHistory packages={[packageRecord]} />
      </>,
    );
    expect(html).toContain('生成 SVG + 清单');
    expect(html).toContain('figure.svg');
    expect(html).toContain(packageRecord.svgHash);
    expect(html).toContain('not-an-office-filing-event');
    expect(html).toContain('下载 SVG');
    expect(html).toContain('下载清单');
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
  warningFindingIds: ['warning-01'],
  manualFindingIds: ['manual-01'],
  exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
  exportSettingsHash: hash,
  cnipaAssessment: { label: 'not-CNIPA-electronic-submission-ready' },
  candidateFingerprint: hash,
  createdByActorId: 'drafter-fixture-01',
  createdAt: '2026-08-01T00:00:00.000Z',
};

const technicalDecision: TechnicalReviewDecision = {
  id: 'technical-01',
  candidateId: candidate.id,
  candidateFingerprint: hash,
  revisionId: candidate.revisionId,
  ruleRunId: candidate.ruleRunId,
  decision: 'approve-structural-correspondence',
  reason: 'Structural correspondence reviewed.',
  findingDispositions: [
    { findingId: 'manual-01', disposition: 'accepted-with-reason', reason: 'Indispensable.' },
  ],
  actorId: 'technical-reviewer-fixture-01',
  activeRole: 'technical-reviewer',
  decidedAt: '2026-08-01T01:00:00.000Z',
};

const packageRecord: ExportPackage = {
  id: 'package-01',
  projectId: candidate.projectId,
  figureId: candidate.figureId,
  candidateId: candidate.id,
  candidateFingerprint: hash,
  revisionId: candidate.revisionId,
  ruleRunId: candidate.ruleRunId,
  technicalDecisionId: technicalDecision.id,
  attorneyDecisionId: 'attorney-01',
  svgHash: hash,
  manifestHash: `sha256:${'b'.repeat(64)}`,
  cnipaLabel: 'not-CNIPA-electronic-submission-ready',
  createdByActorId: 'attorney-fixture-01',
  createdAt: '2026-08-01T02:00:00.000Z',
};

const manifest: ExportManifest = {
  schemaVersion: 'patentdraw-export-manifest/1',
  packageId: packageRecord.id,
  candidateFingerprint: hash,
  projectId: candidate.projectId,
  figureId: candidate.figureId,
  revision: { id: candidate.revisionId, canonicalSvgHash: hash, sourceLinks: [] },
  sheet: { standard: 'A4', widthMm: 210, heightMm: 297, viewBox: [0, 0, 210, 297] },
  textState: 'live-text',
  ruleRun: {
    id: candidate.ruleRunId,
    profileId: 'CNIPA-2026.1',
    profileVersion: '1',
    profileHash: hash,
    warnings: [{ findingId: 'warning-01', ruleId: 'CNIPA-FIG-004', summary: 'Colour.' }],
  },
  review: { technicalDecisionId: technicalDecision.id, attorneyDecisionId: 'attorney-01' },
  cnipa: {
    label: 'not-CNIPA-electronic-submission-ready',
    limitation: 'This SVG is not a CNIPA XML filing package.',
  },
  artifacts: [{ path: 'figure.svg', mediaType: 'image/svg+xml', sha256: hash, byteLength: 120 }],
  export: { actorId: 'attorney-fixture-01', occurredAt: packageRecord.createdAt },
  limitations: [
    'reviewed-drawing-asset',
    'not-an-office-filing-event',
    'no-office-acceptance-assertion',
    'not-CNIPA-electronic-submission-ready',
  ],
};
