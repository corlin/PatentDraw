import { Type, type Static } from '@sinclair/typebox';

export const ProjectRoleSchema = Type.Union([
  Type.Literal('drafter'),
  Type.Literal('technical-reviewer'),
  Type.Literal('attorney-agent'),
  Type.Literal('administrator'),
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

export type ProjectRole = Static<typeof ProjectRoleSchema>;
export type AssistanceType = Static<typeof AssistanceTypeSchema>;
export type AuthorisedSource = Static<typeof AuthorisedSourceSchema>;
export type ConsentRecord = Static<typeof ConsentRecordSchema>;
export type FigurePlanRequest = Static<typeof FigurePlanRequestSchema>;
export type SourceMapping = Static<typeof SourceMappingSchema>;
export type FigurePlanProposal = Static<typeof FigurePlanProposalSchema>;
export type AiRunStatus = Static<typeof AiRunStatusSchema>;
export type AiRun = Static<typeof AiRunSchema>;
export type FigurePlanResult = Static<typeof FigurePlanResultSchema>;
