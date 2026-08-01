import { Type, type Static } from '@sinclair/typebox';

import { ProjectRoleSchema } from './ai-assistance.js';

export const Sha256Schema = Type.String({ pattern: '^sha256:[a-f0-9]{64}$' });
export const IsoDateTimeSchema = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T.+Z$' });
export const LocalDateSchema = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });

export const RuleProfileReferenceSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  version: Type.String({ minLength: 1 }),
  profileHash: Sha256Schema,
});

export const SourceLinkSchema = Type.Object({
  sourceAssetId: Type.String({ minLength: 1 }),
  contentHash: Sha256Schema,
});

export const SheetMetadataSchema = Type.Object({
  standard: Type.Union([Type.Literal('A4'), Type.Literal('US-Letter')]),
  widthMm: Type.Number({ exclusiveMinimum: 0 }),
  heightMm: Type.Number({ exclusiveMinimum: 0 }),
  orientation: Type.Union([Type.Literal('portrait'), Type.Literal('landscape')]),
  viewBox: Type.Tuple([
    Type.Number(),
    Type.Number(),
    Type.Number({ exclusiveMinimum: 0 }),
    Type.Number({ exclusiveMinimum: 0 }),
  ]),
});

export const TextStateSchema = Type.Union([
  Type.Literal('live-text'),
  Type.Literal('outlined-text'),
  Type.Literal('mixed'),
]);

export const SvgSanitizationIssueSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  outcome: Type.Union([
    Type.Literal('removed'),
    Type.Literal('normalized'),
    Type.Literal('rejected'),
  ]),
  elementPath: Type.Optional(Type.String({ minLength: 1 })),
  explanation: Type.String({ minLength: 1 }),
});

export const SvgSanitizationRunSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  inputBlobHash: Sha256Schema,
  sanitizerName: Type.String({ minLength: 1 }),
  sanitizerVersion: Type.String({ minLength: 1 }),
  status: Type.Union([Type.Literal('accepted'), Type.Literal('rejected')]),
  canonicalSvgHash: Type.Optional(Sha256Schema),
  issues: Type.Array(SvgSanitizationIssueSchema),
  detected: Type.Object({
    externalResources: Type.Integer({ minimum: 0 }),
    eventHandlers: Type.Integer({ minimum: 0 }),
    scriptElements: Type.Integer({ minimum: 0 }),
    foreignObjects: Type.Integer({ minimum: 0 }),
    rasterEmbeds: Type.Integer({ minimum: 0 }),
    unsupportedElements: Type.Array(Type.String({ minLength: 1 })),
    textState: TextStateSchema,
  }),
  actorId: Type.String({ minLength: 1 }),
  occurredAt: IsoDateTimeSchema,
});

export const FigureRevisionOriginSchema = Type.Union([
  Type.Object({ kind: Type.Literal('import') }),
  Type.Object({ kind: Type.Literal('editor-save') }),
  Type.Object({
    kind: Type.Literal('ai-draft-reference'),
    generatedDraftAssetId: Type.String({ minLength: 1 }),
  }),
]);

export const FigureRevisionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  parentRevisionId: Type.Optional(Type.String({ minLength: 1 })),
  canonicalSvgHash: Sha256Schema,
  revisionFingerprint: Sha256Schema,
  sanitizationRunId: Type.String({ minLength: 1 }),
  origin: FigureRevisionOriginSchema,
  sourceLinks: Type.Array(SourceLinkSchema, { minItems: 1 }),
  confirmedFigurePlanId: Type.String({ minLength: 1 }),
  referenceRegistryVersionId: Type.String({ minLength: 1 }),
  initialRuleProfile: RuleProfileReferenceSchema,
  sheet: SheetMetadataSchema,
  textState: TextStateSchema,
  semanticGroups: Type.Array(Type.String({ minLength: 1 })),
  createdByActorId: Type.String({ minLength: 1 }),
  createdAt: IsoDateTimeSchema,
});

export const CreateFigureRevisionRequestSchema = Type.Object({
  svgText: Type.String({ minLength: 1, maxLength: 5 * 1024 * 1024 }),
  parentRevisionId: Type.Optional(Type.String({ minLength: 1 })),
  origin: FigureRevisionOriginSchema,
  confirmedFigurePlanId: Type.String({ minLength: 1 }),
  sourceLinks: Type.Array(SourceLinkSchema, { minItems: 1 }),
  referenceRegistryVersionId: Type.String({ minLength: 1 }),
  sheet: Type.Object({
    standard: Type.Union([Type.Literal('A4'), Type.Literal('US-Letter')]),
    widthMm: Type.Number({ exclusiveMinimum: 0 }),
    heightMm: Type.Number({ exclusiveMinimum: 0 }),
    orientation: Type.Union([Type.Literal('portrait'), Type.Literal('landscape')]),
  }),
});

export const CandidateSelectionRequestSchema = Type.Object({
  revisionId: Type.String({ minLength: 1 }),
  revisionFingerprint: Sha256Schema,
  expectedCurrentRevisionId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
});

export const OfficialRuleSourceSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  url: Type.String({ minLength: 1 }),
  section: Type.String({ minLength: 1 }),
  snapshotHash: Sha256Schema,
  effectiveFrom: LocalDateSchema,
});

export const RuleOutcomeSchema = Type.Union([
  Type.Literal('pass'),
  Type.Literal('warning'),
  Type.Literal('manual-review-required'),
  Type.Literal('fail'),
]);

export const RuleFindingSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  ruleRunId: Type.String({ minLength: 1 }),
  ruleId: Type.String({ minLength: 1 }),
  officialSource: OfficialRuleSourceSchema,
  evaluatedInput: Type.Object({
    kind: Type.String({ minLength: 1 }),
    inputHash: Sha256Schema,
    description: Type.String({ minLength: 1 }),
  }),
  predicateOrReviewPolicy: Type.String({ minLength: 1 }),
  outcome: RuleOutcomeSchema,
  severity: Type.Union([
    Type.Literal('info'),
    Type.Literal('minor'),
    Type.Literal('major'),
    Type.Literal('blocking'),
  ]),
  evidence: Type.Array(
    Type.Object({
      kind: Type.Union([
        Type.Literal('bounding-box'),
        Type.Literal('polyline'),
        Type.Literal('sheet-region'),
        Type.Literal('rendered-preview'),
        Type.Literal('registry-entry'),
      ]),
      coordinateSpace: Type.Optional(Type.Literal('svg-view-box')),
      geometry: Type.Optional(Type.Unknown()),
      artifactHash: Type.Optional(Sha256Schema),
      description: Type.String({ minLength: 1 }),
    }),
  ),
  remediation: Type.Object({
    summary: Type.String({ minLength: 1 }),
    suggestedAction: Type.Optional(Type.String({ minLength: 1 })),
  }),
});

export const RuleRunSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  revisionId: Type.String({ minLength: 1 }),
  revisionHash: Sha256Schema,
  revisionFingerprint: Sha256Schema,
  profileId: Type.String({ minLength: 1 }),
  profileVersion: Type.String({ minLength: 1 }),
  profileHash: Sha256Schema,
  profileEffectiveFrom: LocalDateSchema,
  rendererVersion: Type.String({ minLength: 1 }),
  inputFingerprint: Sha256Schema,
  summary: Type.Object({
    pass: Type.Integer({ minimum: 0 }),
    warning: Type.Integer({ minimum: 0 }),
    manualReviewRequired: Type.Integer({ minimum: 0 }),
    fail: Type.Integer({ minimum: 0 }),
  }),
  findings: Type.Array(RuleFindingSchema),
  createdByActorId: Type.String({ minLength: 1 }),
  createdAt: IsoDateTimeSchema,
});

export const CreateRuleRunRequestSchema = Type.Object({
  revisionHash: Sha256Schema,
  profile: RuleProfileReferenceSchema,
});

export const CreateExportCandidateRequestSchema = Type.Object({
  revisionId: Type.String({ minLength: 1 }),
  revisionHash: Sha256Schema,
  revisionFingerprint: Sha256Schema,
  ruleRunId: Type.String({ minLength: 1 }),
  ruleProfileHash: Sha256Schema,
  exportSettings: Type.Object({
    format: Type.Literal('sanitized-svg-master'),
    textState: Type.Union([Type.Literal('live-text'), Type.Literal('outlined-text')]),
  }),
});

export const ExportCandidateSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  revisionId: Type.String({ minLength: 1 }),
  revisionHash: Sha256Schema,
  revisionFingerprint: Sha256Schema,
  ruleRunId: Type.String({ minLength: 1 }),
  ruleProfileHash: Sha256Schema,
  warningFindingIds: Type.Array(Type.String({ minLength: 1 })),
  manualFindingIds: Type.Array(Type.String({ minLength: 1 })),
  exportSettings: Type.Object({
    format: Type.Literal('sanitized-svg-master'),
    textState: Type.Union([Type.Literal('live-text'), Type.Literal('outlined-text')]),
  }),
  exportSettingsHash: Sha256Schema,
  cnipaAssessment: Type.Object({
    label: Type.Union([
      Type.Literal('not-applicable'),
      Type.Literal('not-CNIPA-electronic-submission-ready'),
      Type.Literal('CNIPA-XML-evidence-recorded'),
    ]),
    evidenceId: Type.Optional(Type.String({ minLength: 1 })),
  }),
  candidateFingerprint: Sha256Schema,
  createdByActorId: Type.String({ minLength: 1 }),
  createdAt: IsoDateTimeSchema,
});

export const FindingDispositionSchema = Type.Object({
  findingId: Type.String({ minLength: 1 }),
  disposition: Type.Union([
    Type.Literal('accepted-with-reason'),
    Type.Literal('requires-change'),
    Type.Literal('not-applicable'),
  ]),
  reason: Type.String({ minLength: 1 }),
});

export const TechnicalReviewDecisionRequestSchema = Type.Object({
  candidateFingerprint: Sha256Schema,
  decision: Type.Union([
    Type.Literal('approve-structural-correspondence'),
    Type.Literal('return-for-change'),
  ]),
  reason: Type.String({ minLength: 1 }),
  findingDispositions: Type.Array(FindingDispositionSchema),
});

export const TechnicalReviewDecisionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  candidateId: Type.String({ minLength: 1 }),
  candidateFingerprint: Sha256Schema,
  revisionId: Type.String({ minLength: 1 }),
  ruleRunId: Type.String({ minLength: 1 }),
  decision: Type.Union([
    Type.Literal('approve-structural-correspondence'),
    Type.Literal('return-for-change'),
  ]),
  reason: Type.String({ minLength: 1 }),
  findingDispositions: Type.Array(FindingDispositionSchema),
  actorId: Type.String({ minLength: 1 }),
  activeRole: Type.Literal('technical-reviewer'),
  decidedAt: IsoDateTimeSchema,
});

export const AttorneyApprovalDecisionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  candidateId: Type.String({ minLength: 1 }),
  candidateFingerprint: Sha256Schema,
  technicalDecisionId: Type.String({ minLength: 1 }),
  decision: Type.Union([Type.Literal('approve-export'), Type.Literal('reject-export')]),
  reason: Type.String({ minLength: 1 }),
  acknowledgedWarningFindingIds: Type.Array(Type.String({ minLength: 1 })),
  actorId: Type.String({ minLength: 1 }),
  activeRole: Type.Literal('attorney-agent'),
  decidedAt: IsoDateTimeSchema,
});

export const WorkflowStateSchema = Type.Union([
  Type.Literal('plan'),
  Type.Literal('draft'),
  Type.Literal('canonical-revision'),
  Type.Literal('checks-blocked'),
  Type.Literal('checks-ready'),
  Type.Literal('technical-review'),
  Type.Literal('changes-requested'),
  Type.Literal('attorney-approval'),
  Type.Literal('approved-for-export'),
  Type.Literal('exported'),
  Type.Literal('invalidated'),
]);

export const WorkflowActionNameSchema = Type.Union([
  Type.Literal('request-figure-plan'),
  Type.Literal('resolve-plan-items'),
  Type.Literal('cancel-draft'),
  Type.Literal('retry-draft'),
  Type.Literal('reject-draft'),
  Type.Literal('select-draft'),
  Type.Literal('create-revision'),
  Type.Literal('import-revision'),
  Type.Literal('run-checks'),
  Type.Literal('create-export-candidate'),
  Type.Literal('technical-approve'),
  Type.Literal('technical-return'),
  Type.Literal('attorney-approve'),
  Type.Literal('attorney-reject'),
  Type.Literal('create-export'),
  Type.Literal('download-export'),
  Type.Literal('reload-current-workflow'),
  Type.Literal('await-required-role'),
]);

export const BlockingGateSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
  targetId: Type.Optional(Type.String({ minLength: 1 })),
  recoveryAction: Type.Optional(WorkflowActionNameSchema),
});

export const WorkflowActionSchema = Type.Object({
  action: WorkflowActionNameSchema,
  label: Type.String({ minLength: 1 }),
  availability: Type.Union([
    Type.Literal('enabled'),
    Type.Literal('disabled'),
    Type.Literal('waiting'),
  ]),
  requiredRole: Type.Optional(ProjectRoleSchema),
  targetId: Type.Optional(Type.String({ minLength: 1 })),
  blockingGates: Type.Array(BlockingGateSchema),
});

export const WorkflowSnapshotSchema = Type.Object({
  version: Type.Integer({ minimum: 0 }),
  etag: Type.String({ minLength: 1 }),
  state: WorkflowStateSchema,
  actor: Type.Object({
    id: Type.String({ minLength: 1 }),
    activeRole: ProjectRoleSchema,
    roles: Type.Array(ProjectRoleSchema, { minItems: 1 }),
  }),
  current: Type.Object({
    revisionId: Type.Optional(Type.String({ minLength: 1 })),
    ruleRunId: Type.Optional(Type.String({ minLength: 1 })),
    candidateId: Type.Optional(Type.String({ minLength: 1 })),
    technicalDecisionId: Type.Optional(Type.String({ minLength: 1 })),
    attorneyDecisionId: Type.Optional(Type.String({ minLength: 1 })),
    exportPackageId: Type.Optional(Type.String({ minLength: 1 })),
  }),
  primaryAction: WorkflowActionSchema,
  actions: Type.Array(WorkflowActionSchema),
  blockingGates: Type.Array(BlockingGateSchema),
});

export const WorkflowInvalidationSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  cause: Type.Object({
    kind: Type.Union([
      Type.Literal('source-link'),
      Type.Literal('figure-plan'),
      Type.Literal('canonical-svg'),
      Type.Literal('reference-registry'),
      Type.Literal('sheet-layout'),
      Type.Literal('rule-profile'),
      Type.Literal('export-settings'),
    ]),
    targetId: Type.String({ minLength: 1 }),
    previousFingerprint: Sha256Schema,
    nextFingerprint: Sha256Schema,
  }),
  affected: Type.Object({
    ruleRunIds: Type.Array(Type.String({ minLength: 1 })),
    exportCandidateIds: Type.Array(Type.String({ minLength: 1 })),
    technicalDecisionIds: Type.Array(Type.String({ minLength: 1 })),
    attorneyDecisionIds: Type.Array(Type.String({ minLength: 1 })),
  }),
  earliestRequiredAction: Type.Union([
    Type.Literal('create-or-select-revision'),
    Type.Literal('run-checks'),
    Type.Literal('submit-technical-review'),
    Type.Literal('submit-attorney-approval'),
    Type.Literal('create-export'),
  ]),
  actorId: Type.String({ minLength: 1 }),
  reason: Type.String({ minLength: 1 }),
  occurredAt: IsoDateTimeSchema,
});

export const CnipaEfilingEvidenceSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  applicationDate: LocalDateSchema,
  declaredRoute: Type.Union([
    Type.Literal('standard'),
    Type.Literal('priority-examination'),
    Type.Literal('fast-examination'),
    Type.Literal('pph'),
    Type.Literal('delayed-examination'),
    Type.Literal('concentrated-examination'),
    Type.Literal('pct-national-phase'),
  ]),
  policyEffectiveDate: LocalDateSchema,
  linkedRevisions: Type.Array(
    Type.Object({ revisionId: Type.String({ minLength: 1 }), canonicalSvgHash: Sha256Schema }),
    { minItems: 1 },
  ),
  xmlPackageHash: Sha256Schema,
  converter: Type.Object({
    tool: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
  }),
  dataStandardVersion: Type.String({ minLength: 1 }),
  previewProofreadAttestation: Type.Object({
    confirmed: Type.Literal(true),
    actorId: Type.String({ minLength: 1 }),
    confirmedAt: IsoDateTimeSchema,
  }),
  reviewedByActorId: Type.String({ minLength: 1 }),
  reviewedAt: IsoDateTimeSchema,
  recordedByActorId: Type.String({ minLength: 1 }),
  recordedAt: IsoDateTimeSchema,
});

export const ExportPackageSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  figureId: Type.String({ minLength: 1 }),
  candidateId: Type.String({ minLength: 1 }),
  candidateFingerprint: Sha256Schema,
  revisionId: Type.String({ minLength: 1 }),
  ruleRunId: Type.String({ minLength: 1 }),
  technicalDecisionId: Type.String({ minLength: 1 }),
  attorneyDecisionId: Type.String({ minLength: 1 }),
  svgHash: Sha256Schema,
  manifestHash: Sha256Schema,
  cnipaLabel: Type.Union([
    Type.Literal('not-applicable'),
    Type.Literal('not-CNIPA-electronic-submission-ready'),
    Type.Literal('CNIPA-XML-evidence-recorded'),
  ]),
  createdByActorId: Type.String({ minLength: 1 }),
  createdAt: IsoDateTimeSchema,
});

export const WorkflowAuditEventSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  eventType: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  activeRole: ProjectRoleSchema,
  targetIds: Type.Array(Type.String({ minLength: 1 })),
  outcome: Type.Union([Type.Literal('accepted'), Type.Literal('denied')]),
  reasonCode: Type.String({ minLength: 1 }),
  reason: Type.String({ minLength: 1 }),
  fingerprints: Type.Record(Type.String(), Sha256Schema),
  occurredAt: IsoDateTimeSchema,
});

export const WorkflowProblemSchema = Type.Object({
  type: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  status: Type.Integer({ minimum: 400, maximum: 599 }),
  code: Type.String({ minLength: 1 }),
  detail: Type.String({ minLength: 1 }),
  instance: Type.Optional(Type.String({ minLength: 1 })),
  unmetGates: Type.Optional(Type.Array(BlockingGateSchema)),
  current: Type.Optional(
    Type.Object({
      workflowVersion: Type.Integer({ minimum: 0 }),
      state: WorkflowStateSchema,
      revisionId: Type.Optional(Type.String({ minLength: 1 })),
      ruleRunId: Type.Optional(Type.String({ minLength: 1 })),
      candidateId: Type.Optional(Type.String({ minLength: 1 })),
    }),
  ),
});

export type Sha256 = Static<typeof Sha256Schema>;
export type RuleProfileReference = Static<typeof RuleProfileReferenceSchema>;
export type SheetMetadata = Static<typeof SheetMetadataSchema>;
export type SvgSanitizationRun = Static<typeof SvgSanitizationRunSchema>;
export type FigureRevision = Static<typeof FigureRevisionSchema>;
export type CreateFigureRevisionRequest = Static<typeof CreateFigureRevisionRequestSchema>;
export type CandidateSelectionRequest = Static<typeof CandidateSelectionRequestSchema>;
export type OfficialRuleSource = Static<typeof OfficialRuleSourceSchema>;
export type RuleFinding = Static<typeof RuleFindingSchema>;
export type RuleOutcome = Static<typeof RuleOutcomeSchema>;
export type RuleRun = Static<typeof RuleRunSchema>;
export type CreateRuleRunRequest = Static<typeof CreateRuleRunRequestSchema>;
export type CreateExportCandidateRequest = Static<typeof CreateExportCandidateRequestSchema>;
export type ExportCandidate = Static<typeof ExportCandidateSchema>;
export type FindingDisposition = Static<typeof FindingDispositionSchema>;
export type TechnicalReviewDecisionRequest = Static<typeof TechnicalReviewDecisionRequestSchema>;
export type TechnicalReviewDecision = Static<typeof TechnicalReviewDecisionSchema>;
export type AttorneyApprovalDecision = Static<typeof AttorneyApprovalDecisionSchema>;
export type WorkflowState = Static<typeof WorkflowStateSchema>;
export type WorkflowActionName = Static<typeof WorkflowActionNameSchema>;
export type BlockingGate = Static<typeof BlockingGateSchema>;
export type WorkflowAction = Static<typeof WorkflowActionSchema>;
export type WorkflowSnapshot = Static<typeof WorkflowSnapshotSchema>;
export type WorkflowInvalidation = Static<typeof WorkflowInvalidationSchema>;
export type CnipaEfilingEvidence = Static<typeof CnipaEfilingEvidenceSchema>;
export type ExportPackage = Static<typeof ExportPackageSchema>;
export type WorkflowAuditEvent = Static<typeof WorkflowAuditEventSchema>;
export type WorkflowProblem = Static<typeof WorkflowProblemSchema>;
