export const fixtureFigureId = 'figure-fixture-pump-01';

export const workflowActorIds = {
  drafter: 'drafter-fixture-01',
  technicalReviewer: 'technical-reviewer-fixture-01',
  attorneyAgent: 'attorney-fixture-01',
} as const;

export const pumpV1Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="5" y="28" width="48" height="202"/><circle cx="105" cy="126" r="42" fill="#d69e2e"/><text x="70" y="70" fill="#000">100</text></g></svg>`;

export const pumpV2Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="15" y="28" width="38" height="202"/><circle cx="105" cy="126" r="42" fill="#777"/><text x="70" y="70" fill="#000">100</text></g></svg>`;

export const pumpReviewCorrectedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="15" y="28" width="38" height="202"/><circle cx="105" cy="126" r="42" fill="#777"/><polyline id="sign-110-leader" points="126,108 136,98 147,98"/><text x="70" y="70" fill="#000">100</text><text x="149" y="100" fill="#000">110</text></g></svg>`;

export const unsafePumpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" onload="alert(1)"><script>alert(1)</script></svg>`;

const fixtureHashA = `sha256:${'a'.repeat(64)}` as const;
const fixtureHashB = `sha256:${'b'.repeat(64)}` as const;
const fixtureHashC = `sha256:${'c'.repeat(64)}` as const;

export const completeCnipaEvidenceRequest = {
  applicationDate: '2026-08-01',
  declaredRoute: 'standard' as const,
  policyEffectiveDate: '2026-01-01',
  linkedRevisions: [{ revisionId: 'revision-fixture-pump-01', canonicalSvgHash: fixtureHashA }],
  xmlPackageHash: fixtureHashB,
  converter: { tool: 'CNIPA external converter', version: '2026.1' },
  dataStandardVersion: 'CNIPA-XML-2026',
  previewProofreadAttestation: {
    confirmed: true as const,
    actorId: workflowActorIds.attorneyAgent,
    confirmedAt: '2026-08-01T01:55:00.000Z',
  },
  reviewedByActorId: workflowActorIds.attorneyAgent,
  reviewedAt: '2026-08-01T01:56:00.000Z',
};

export const invalidCnipaEvidenceRequest = {
  ...completeCnipaEvidenceRequest,
  previewProofreadAttestation: {
    ...completeCnipaEvidenceRequest.previewProofreadAttestation,
    confirmed: false,
  },
};

const manifestBase = {
  schemaVersion: 'patentdraw-export-manifest/1',
  packageId: 'export-package-fixture-01',
  candidateFingerprint: fixtureHashC,
  projectId: 'project-fixture-01',
  figureId: fixtureFigureId,
  revision: {
    id: 'revision-fixture-pump-01',
    canonicalSvgHash: fixtureHashA,
    sourceLinks: [{ id: 'source-fixture-disclosure-01', hash: fixtureHashB }],
  },
  sheet: { standard: 'A4', widthMm: 210, heightMm: 297, viewBox: [0, 0, 210, 297] },
  textState: 'live-text',
  ruleRun: {
    id: 'rule-run-fixture-01',
    profileId: 'CNIPA-2026',
    profileVersion: '2026.1',
    profileHash: fixtureHashB,
    warnings: [
      { findingId: 'finding-warning-01', ruleId: 'CNIPA-SVG-01', summary: '人工确认线宽。' },
    ],
  },
  review: {
    technicalDecisionId: 'technical-decision-fixture-01',
    attorneyDecisionId: 'attorney-decision-fixture-01',
  },
  artifacts: [
    { path: 'figure.svg', mediaType: 'image/svg+xml', sha256: fixtureHashA, byteLength: 512 },
  ],
  export: { actorId: workflowActorIds.attorneyAgent, occurredAt: '2026-08-01T02:00:00.000Z' },
};

export const fixtureExportManifest = {
  ...manifestBase,
  cnipa: {
    label: 'not-CNIPA-electronic-submission-ready',
    limitation:
      'This SVG asset is not a CNIPA XML electronic filing package and does not prove filing.',
  },
  limitations: [
    'reviewed-drawing-asset',
    'not-an-office-filing-event',
    'no-office-acceptance-assertion',
    'not-CNIPA-electronic-submission-ready',
  ],
};

export const fixtureExportManifestWithCnipaEvidence = {
  ...manifestBase,
  cnipa: {
    label: 'CNIPA-XML-evidence-recorded',
    evidenceId: 'cnipa-evidence-fixture-01',
    limitation:
      'External XML evidence was recorded; it does not prove filing or office acceptance.',
  },
  limitations: [
    'reviewed-drawing-asset',
    'not-an-office-filing-event',
    'no-office-acceptance-assertion',
    'CNIPA-XML-evidence-recorded',
  ],
};

export const invalidReadyClaimManifest = {
  ...fixtureExportManifest,
  cnipa: {
    label: 'ready-for-CNIPA-filing',
    limitation: 'Ready for filing.',
  },
};
