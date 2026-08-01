import type {
  DraftAssetRequest,
  FigurePlanRequest,
  FigurePlanResult,
  GeneratedDraftAsset,
} from '@patentdraw/contracts';

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
    limitations: [
      'AI-generated planning aid only; geometry and reference signs require human verification.',
    ],
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

export const abstentionFigurePlanResult: FigurePlanResult = {
  status: 'abstained',
  reason: 'The selected source does not establish enough geometry for a grounded view.',
};

export const contradictionFigurePlanResult: FigurePlanResult = {
  status: 'manual-review-required',
  reason: 'The selected source contains contradictory impeller orientation statements.',
};

export const forbiddenAssertionFigurePlanResult: FigurePlanResult = {
  status: 'proposed',
  proposal: {
    ...groundedFigurePlanResult.proposal,
    components: ['filing-ready undisclosed controller'],
    sourceMappings: [],
  },
};

export const aiAssistanceFixtureCases = [
  {
    id: 'grounding',
    providerResult: groundedFigurePlanResult,
    expectedStatus: 'proposed',
  },
  {
    id: 'refusal',
    providerResult: refusalFigurePlanResult,
    expectedStatus: 'refused',
  },
  {
    id: 'abstention',
    providerResult: abstentionFigurePlanResult,
    expectedStatus: 'abstained',
  },
  {
    id: 'contradiction',
    providerResult: contradictionFigurePlanResult,
    expectedStatus: 'manual-review-required',
  },
  {
    id: 'forbidden-assertion',
    providerResult: forbiddenAssertionFigurePlanResult,
    expectedStatus: 'manual-review-required',
  },
  {
    id: 'post-edit-invalidation',
    providerResult: groundedFigurePlanResult,
    expectedStatus: 'invalidated',
  },
] as const;

export const fixtureDraftAssetRequest: DraftAssetRequest = {
  projectId: 'project-fixture-pump',
  confirmedPlanId: 'proposal-fixture-grounded-01',
  allowedScope: ['housing', 'impeller'],
  instructionVersion: 'fixture-draft-instruction-v1',
  consent: authorisedFigurePlanRequest.consent,
};

export const fixtureDraftAsset: GeneratedDraftAsset = {
  id: 'draft-fixture-01',
  aiRunId: 'run-fixture-draft-01',
  confirmedPlanId: 'proposal-fixture-grounded-01',
  blobHash: 'sha256:fixture-draft-asset-01',
  sourceHashes: ['sha256:fixture-disclosure-01'],
  limitationLabel: 'non-authoritative-ai-draft',
  selectionState: 'unselected',
  exportEligible: false,
};
