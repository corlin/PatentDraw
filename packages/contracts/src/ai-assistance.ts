import { Type, type Static } from '@sinclair/typebox';

export const ProjectRoleSchema = Type.Union([
  Type.Literal('drafter'),
  Type.Literal('contributor'),
  Type.Literal('technical-reviewer'),
  Type.Literal('attorney-agent'),
  Type.Literal('administrator'),
]);

export const ProjectRelationshipSchema = Type.Union([
  Type.Literal('inventor'),
  Type.Literal('contributor'),
]);

export const AssistanceTypeSchema = Type.Literal('figure-plan');

export const AuthorisedSourceSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  contentHash: Type.String({ minLength: 1 }),
});

export const ConsentRecordSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  recordedAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
  allowsProviderProcessing: Type.Literal(true),
  allowsTraining: Type.Literal(false),
});

export const FigurePlanRequestSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  selectedSources: Type.Array(AuthorisedSourceSchema, { minItems: 1 }),
  figurePurpose: Type.String({ minLength: 1 }),
  allowedScope: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  assistanceType: AssistanceTypeSchema,
  instructionVersion: Type.String({ minLength: 1 }),
  consent: ConsentRecordSchema,
});

export const SourceMappingSchema = Type.Object({
  proposalElementId: Type.String({ minLength: 1 }),
  sourceAssetId: Type.String({ minLength: 1 }),
  sourceAssetHash: Type.String({ minLength: 1 }),
  locationReference: Type.String({ minLength: 1 }),
  limitation: Type.Optional(Type.String({ minLength: 1 })),
});

export const FigurePlanProposalSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  purpose: Type.String({ minLength: 1 }),
  views: Type.Array(Type.String({ minLength: 1 })),
  components: Type.Array(Type.String({ minLength: 1 })),
  signs: Type.Array(Type.String({ minLength: 1 })),
  openQuestions: Type.Array(Type.String({ minLength: 1 })),
  limitations: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  sourceMappings: Type.Array(SourceMappingSchema),
});

export const AiRunStatusSchema = Type.Union([
  Type.Literal('proposed'),
  Type.Literal('abstained'),
  Type.Literal('refused'),
  Type.Literal('manual-review-required'),
  Type.Literal('invalidated'),
]);

export const AiRunSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  requestInputHash: Type.String({ minLength: 1 }),
  provider: Type.String({ minLength: 1 }),
  model: Type.String({ minLength: 1 }),
  modelVersion: Type.String({ minLength: 1 }),
  instructionVersion: Type.String({ minLength: 1 }),
  selectedSourceHashes: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  consentRecordId: Type.String({ minLength: 1 }),
  outputHash: Type.Optional(Type.String({ minLength: 1 })),
  status: AiRunStatusSchema,
  limitationState: Type.String({ minLength: 1 }),
  createdAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
  retentionExpiresAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
});

export const FigurePlanResultSchema = Type.Union([
  Type.Object({ status: Type.Literal('proposed'), proposal: FigurePlanProposalSchema }),
  Type.Object({
    status: Type.Union([
      Type.Literal('abstained'),
      Type.Literal('refused'),
      Type.Literal('manual-review-required'),
    ]),
    reason: Type.String({ minLength: 1 }),
  }),
]);

export const ConfirmFigurePlanRequestSchema = Type.Object({
  proposalId: Type.String({ minLength: 1 }),
});

export const FigurePlanItemDispositionSchema = Type.Object({
  proposalElementId: Type.String({ minLength: 1 }),
  disposition: Type.Union([
    Type.Literal('accepted'),
    Type.Literal('rejected'),
    Type.Literal('edited'),
    Type.Literal('open-question'),
  ]),
  editedValue: Type.Optional(Type.String({ minLength: 1 })),
  reason: Type.Optional(Type.String({ minLength: 1 })),
});

export const FigurePlanDispositionRequestSchema = Type.Object({
  proposalId: Type.String({ minLength: 1 }),
  items: Type.Array(FigurePlanItemDispositionSchema, { minItems: 1 }),
});

export const DraftJobStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('ready'),
  Type.Literal('cancelled'),
  Type.Literal('rejected'),
  Type.Literal('failed'),
  Type.Literal('refused'),
  Type.Literal('invalidated'),
]);

export const GeneratedDraftAssetSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  aiRunId: Type.String({ minLength: 1 }),
  confirmedPlanId: Type.String({ minLength: 1 }),
  blobHash: Type.String({ minLength: 1 }),
  sourceHashes: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  limitationLabel: Type.Literal('non-authoritative-ai-draft'),
  selectionState: Type.Union([
    Type.Literal('unselected'),
    Type.Literal('selected'),
    Type.Literal('rejected'),
  ]),
  exportEligible: Type.Literal(false),
  independentFigureRevisionId: Type.Optional(Type.String({ minLength: 1 })),
});

export const DraftAssetRequestSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  confirmedPlanId: Type.String({ minLength: 1 }),
  allowedScope: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  instructionVersion: Type.String({ minLength: 1 }),
  consent: ConsentRecordSchema,
});

export const DraftJobSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  status: DraftJobStatusSchema,
  progressPercent: Type.Integer({ minimum: 0, maximum: 100 }),
  asset: Type.Optional(GeneratedDraftAssetSchema),
  reason: Type.Optional(Type.String({ minLength: 1 })),
});

export const DraftRejectRequestSchema = Type.Object({
  reason: Type.String({ minLength: 1 }),
});

export const DraftRetryRequestSchema = Type.Object({
  request: DraftAssetRequestSchema,
});

export const AiAuditEventSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  eventType: Type.Union([
    Type.Literal('ai-run-created'),
    Type.Literal('ai-run-invalidated'),
    Type.Literal('source-authorisation-revoked'),
    Type.Literal('reviewer-decision-invalidated'),
    Type.Literal('privileged-audit-read'),
  ]),
  projectId: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  occurredAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
  targetIds: Type.Array(Type.String({ minLength: 1 })),
  reason: Type.String({ minLength: 1 }),
  metadata: Type.Record(Type.String(), Type.String()),
  provenance: Type.Optional(
    Type.Object({
      provider: Type.String({ minLength: 1 }),
      model: Type.String({ minLength: 1 }),
      modelVersion: Type.String({ minLength: 1 }),
      instructionVersion: Type.String({ minLength: 1 }),
      requestInputHash: Type.String({ minLength: 1 }),
      selectedSourceHashes: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
      consentRecordId: Type.String({ minLength: 1 }),
      outputHash: Type.String({ minLength: 1 }),
      limitationState: Type.String({ minLength: 1 }),
      retentionExpiresAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
    }),
  ),
});

export const DraftHandoffRequestSchema = Type.Object({
  jobId: Type.String({ minLength: 1 }),
  canonicalFigureRevisionId: Type.String({ minLength: 1 }),
});

export const DraftHandoffResultSchema = Type.Object({
  jobId: Type.String({ minLength: 1 }),
  assetId: Type.String({ minLength: 1 }),
  canonicalFigureRevisionId: Type.String({ minLength: 1 }),
  exportEligible: Type.Literal(false),
});

export const AiInvalidationSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  changedTargetId: Type.String({ minLength: 1 }),
  affectedAiRunIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  actorId: Type.String({ minLength: 1 }),
  occurredAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' }),
  reason: Type.String({ minLength: 1 }),
});

export type ProjectRole = Static<typeof ProjectRoleSchema>;
export type ProjectRelationship = Static<typeof ProjectRelationshipSchema>;
export type AssistanceType = Static<typeof AssistanceTypeSchema>;
export type AuthorisedSource = Static<typeof AuthorisedSourceSchema>;
export type ConsentRecord = Static<typeof ConsentRecordSchema>;
export type FigurePlanRequest = Static<typeof FigurePlanRequestSchema>;
export type SourceMapping = Static<typeof SourceMappingSchema>;
export type FigurePlanProposal = Static<typeof FigurePlanProposalSchema>;
export type AiRunStatus = Static<typeof AiRunStatusSchema>;
export type AiRun = Static<typeof AiRunSchema>;
export type FigurePlanResult = Static<typeof FigurePlanResultSchema>;
export type ConfirmFigurePlanRequest = Static<typeof ConfirmFigurePlanRequestSchema>;
export type FigurePlanItemDisposition = Static<typeof FigurePlanItemDispositionSchema>;
export type FigurePlanDispositionRequest = Static<typeof FigurePlanDispositionRequestSchema>;
export type DraftJobStatus = Static<typeof DraftJobStatusSchema>;
export type GeneratedDraftAsset = Static<typeof GeneratedDraftAssetSchema>;
export type DraftAssetRequest = Static<typeof DraftAssetRequestSchema>;
export type DraftJob = Static<typeof DraftJobSchema>;
export type DraftRejectRequest = Static<typeof DraftRejectRequestSchema>;
export type DraftRetryRequest = Static<typeof DraftRetryRequestSchema>;
export type AiAuditEvent = Static<typeof AiAuditEventSchema>;
export type AiInvalidation = Static<typeof AiInvalidationSchema>;
export type DraftHandoffRequest = Static<typeof DraftHandoffRequestSchema>;
export type DraftHandoffResult = Static<typeof DraftHandoffResultSchema>;
