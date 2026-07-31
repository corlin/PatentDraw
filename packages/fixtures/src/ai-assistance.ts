import type { FigurePlanRequest, FigurePlanResult } from '@patentdraw/contracts';

export const authorisedFigurePlanRequest: FigurePlanRequest = {
  projectId: 'project-fixture-pump',
  selectedSources: [
    { id: 'source-fixture-disclosure-01', contentHash: 'sha256:fixture-disclosure-01' },
  ],
  figurePurpose: 'Explain the disclosed pump housing and impeller relationship.',
  allowedScope: ['housing', 'impeller'],
  assistanceType: 'figure-plan',
  instructionVersion: 'fixture-instruction-v1',
  consent: {
    id: 'consent-fixture-01',
    recordedAt: '2026-07-31T00:00:00.000Z',
    allowsProviderProcessing: true,
    allowsTraining: false,
  },
};

export const groundedFigurePlanResult: FigurePlanResult = {
  status: 'proposed',
  proposal: {
    id: 'proposal-fixture-grounded-01',
    purpose: authorisedFigurePlanRequest.figurePurpose,
    views: ['view-longitudinal-section'],
    components: ['component-pump-housing', 'component-impeller'],
    signs: ['sign-100', 'sign-110'],
    openQuestions: [],
    sourceMappings: [
      {
        proposalElementId: 'view-longitudinal-section',
        sourceAssetId: 'source-fixture-disclosure-01',
        sourceAssetHash: 'sha256:fixture-disclosure-01',
        locationReference: 'figure 1',
      },
      {
        proposalElementId: 'component-pump-housing',
        sourceAssetId: 'source-fixture-disclosure-01',
        sourceAssetHash: 'sha256:fixture-disclosure-01',
        locationReference: 'paragraph [0021]',
      },
      {
        proposalElementId: 'component-impeller',
        sourceAssetId: 'source-fixture-disclosure-01',
        sourceAssetHash: 'sha256:fixture-disclosure-01',
        locationReference: 'paragraph [0022]',
      },
      {
        proposalElementId: 'sign-100',
        sourceAssetId: 'source-fixture-disclosure-01',
        sourceAssetHash: 'sha256:fixture-disclosure-01',
        locationReference: 'figure 1',
      },
      {
        proposalElementId: 'sign-110',
        sourceAssetId: 'source-fixture-disclosure-01',
        sourceAssetHash: 'sha256:fixture-disclosure-01',
        locationReference: 'figure 1',
      },
    ],
  },
};

export const refusalFigurePlanResult: FigurePlanResult = {
  status: 'refused',
  reason: 'The selected source is not authorised for AI assistance.',
};

export const hallucinatedFigurePlanResult: FigurePlanResult = {
  status: 'manual-review-required',
  reason: 'The requested bearing arrangement is not mapped to a selected source.',
};
