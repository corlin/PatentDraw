# Data model: SVG review and export workflow

## Modeling rules

- Domain evidence is immutable: sanitization runs, revisions, rule runs, findings, candidates,
  decisions, invalidations, CNIPA evidence and export packages are append-only.
- Only projections are mutable: the current candidate pointer, monotonic workflow version and
  cached next-action projection may be replaced transactionally.
- `sha256:` values are lowercase hexadecimal hashes of canonical bytes or canonical JSON.
- Every project-scoped lookup includes both project ID and artifact ID.
- “Invalidated” and “superseded” are derived from append-only events; old evidence rows are not
  updated to rewrite their history.

## Entity relationships

```text
Project ──< Figure ──< SvgSanitizationRun
                    └──< FigureRevision (parent graph)
                              └──< RuleRun ──< RuleFinding
                                        └── ExportCandidate
                                              ├── TechnicalReviewDecision
                                              ├── AttorneyApprovalDecision
                                              └── ExportPackage

Figure ──< CandidateSelectionEvent
Figure ──< WorkflowInvalidation
ExportPackage ──< PackageSupersessionEvent
Project ──< CnipaEfilingEvidence >── FigureRevision
```

## Project actor context

| Field | Meaning |
| --- | --- |
| `projectId` | Tenant/project boundary for every operation. |
| `actorId` | Stable authenticated person identity; changing role does not change actor. |
| `roles` | `contributor`, `drafter`, `technical-reviewer`, `attorney-agent`, `administrator`. |
| `relationships` | Project relationships including `inventor`; used in addition to role checks. |

The deterministic runtime contains separate drafter, technical-reviewer and attorney-agent actor
IDs. The current header-based resolver proves domain authorization only and is not production
identity assurance.

## Figure

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Immutable, unique within project. |
| `projectId` | string | Required project owner. |
| `figureLabel` | string | Human label such as `FIG. 1` or `图1`. |
| `createdByActorId` | string | Authenticated creator. |
| `createdAt` | ISO timestamp | Immutable. |

A figure owns a revision graph. Creating a revision does not automatically make it the current
candidate; that requires a `CandidateSelectionEvent` using the expected workflow version.

## SvgSanitizationRun

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId` | string | Immutable identity and ownership. |
| `inputBlobHash` | SHA-256 | Hash of retained raw input artifact. |
| `sanitizerName`, `sanitizerVersion` | string | Exact reviewed sanitizer identity. |
| `status` | `accepted` or `rejected` | A rejected run creates no revision. |
| `canonicalSvgHash` | optional SHA-256 | Present only when accepted. |
| `issues` | list | Code, outcome (`removed`, `normalized`, `rejected`), safe element path and explanation. |
| `detected` | object | Counts for external resources, handlers, scripts, foreign objects, raster embeds and unsupported elements; text state. |
| `actorId`, `occurredAt` | string/timestamp | Immutable provenance. |

Pre-parse limits reject inputs over 5 MiB. DTDs and processing instructions are rejected before
DOM construction. Traversal rejects more than 10,000 elements, 128 levels or 50,000 attributes.

## FigureRevision

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId` | string | Immutable identity and ownership. |
| `parentRevisionId` | optional string | Same project and figure; siblings are allowed. |
| `canonicalSvgHash` | SHA-256 | Recomputed from deterministic sanitized bytes. |
| `revisionFingerprint` | SHA-256 | Covers SVG hash, sheet, source links, confirmed plan, reference registry version and initial rule-profile binding. |
| `sanitizationRunId` | string | Must reference an accepted run and matching canonical hash. |
| `origin` | union | `import`, `editor-save`, or `ai-draft-reference` with draft asset ID. |
| `sourceLinks` | list | Source asset ID and content hash; all belong to project. |
| `confirmedFigurePlanId` | string | Exact approved planning input. |
| `referenceRegistryVersionId` | string | Exact numeral/term registry version. |
| `initialRuleProfile` | object | Profile ID, version and reviewed profile hash selected when the revision is created. |
| `sheet` | object | `A4` or `US-Letter`, width/height in mm, orientation and four-number view box. |
| `textState` | enum | `live-text`, `outlined-text`, or `mixed`. |
| `semanticGroups` | list | Recognized named groups present in the canonical SVG. |
| `createdByActorId`, `createdAt` | string/timestamp | Immutable provenance. |

An AI draft ID records provenance only. The canonical bytes always originate from the explicit SVG
submission and sanitization path. A material change creates a successor revision.

## CandidateSelectionEvent

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId` | string | Immutable event identity. |
| `revisionId`, `revisionFingerprint` | string/SHA-256 | Candidate selected as current. |
| `previousRevisionId` | optional string | Prior current candidate. |
| `expectedWorkflowVersion`, `nextWorkflowVersion` | integer | Compare-and-swap sequence. |
| `actorId`, `reason`, `occurredAt` | string/timestamp | Required provenance. |

Selecting a new current candidate and recording resulting invalidation occur in one transaction.

## RuleProfile

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `name`, `version` | string | Immutable reviewed version identity. |
| `jurisdiction` | enum | `PCT`, `USPTO`, or `CNIPA`. |
| `effectiveFrom`, `effectiveTo` | date | Effective range; end optional. |
| `officialSources` | list | Title, URL, section and immutable source-snapshot hash. |
| `profileHash` | SHA-256 | Covers full reviewed profile. |
| `reviewState` | enum | Only `reviewed` profiles may support approval/export. |

Superseding a profile creates a new version. Historical runs continue to reference their original
profile fingerprint.

## RuleRun

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId`, `revisionId` | string | Immutable identity and target. |
| `revisionHash`, `revisionFingerprint` | SHA-256 | Must match canonical bytes and revision. |
| `profileId`, `profileVersion`, `profileHash` | string/SHA-256 | Exact reviewed rules used. |
| `profileEffectiveFrom`, `rendererVersion` | date/string | Reproducibility metadata. |
| `inputFingerprint` | SHA-256 | Covers revision/profile/rendering input. |
| `summary` | counts | Counts for pass, warning, manual review and fail. |
| `createdByActorId`, `createdAt` | string/timestamp | Immutable provenance. |

A rerun always creates a new ID, even when inputs match. The newest run is usable only while all
fingerprints still match the current candidate and selected profile.

## RuleFinding

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `ruleRunId`, `ruleId` | string | Immutable identity and parent. |
| `officialSource` | object | Title, URL, section, snapshot hash and effective date. |
| `evaluatedInput` | object | Input kind, input hash and human-readable description. |
| `predicateOrReviewPolicy` | string | Deterministic predicate or explicit human policy. |
| `outcome` | enum | `pass`, `warning`, `manual-review-required`, `fail`. |
| `severity` | enum | `info`, `minor`, `major`, `blocking`. |
| `evidence` | list | Bounding box, polyline, sheet region, rendered preview or registry entry plus description. |
| `remediation` | object | Summary and optional suggested action. |

A `fail` cannot be waived in this MVP. Manual findings are not mutated to resolved; their named
dispositions live in the technical decision. Warnings remain visible through export.

## ExportCandidate

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId` | string | Immutable identity. |
| `revisionId`, `revisionHash`, `revisionFingerprint` | string/SHA-256 | Exact canonical target. |
| `ruleRunId`, `ruleProfileHash` | string/SHA-256 | Exact current check evidence. |
| `warningFindingIds`, `manualFindingIds` | lists | Exact unresolved sets at candidate creation. |
| `exportSettings` | object | Format `sanitized-svg-master` and chosen text state. |
| `exportSettingsHash` | SHA-256 | Invalidates decisions when settings change. |
| `cnipaAssessment` | object | Limited label and optional evidence ID. |
| `candidateFingerprint` | SHA-256 | Covers every field used by review/export gates. |
| `createdByActorId`, `createdAt` | string/timestamp | Immutable provenance. |

Any `fail` blocks candidate creation. Manual findings may be present because the technical reviewer
must disposition them.

## TechnicalReviewDecision

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `candidateId`, `candidateFingerprint` | string/SHA-256 | Exact immutable target. |
| `revisionId`, `ruleRunId` | string | Repeated for direct audit lookup. |
| `decision` | enum | `approve-structural-correspondence` or `return-for-change`. |
| `reason` | string | Required for every outcome. |
| `findingDispositions` | list | Finding ID, `accepted-with-reason`, `requires-change` or `not-applicable`, and reason. |
| `actorId`, `activeRole`, `decidedAt` | values | Role is exactly `technical-reviewer`. |

Approval requires a current candidate, no fail, exactly one reasoned disposition for every manual
finding, no `requires-change` disposition and an actor different from the revision author.

## AttorneyApprovalDecision

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `candidateId`, `candidateFingerprint` | string/SHA-256 | Exact immutable target. |
| `technicalDecisionId` | string | Current valid technical approval. |
| `decision` | enum | `approve-export` or `reject-export`. |
| `reason` | string | Required. |
| `acknowledgedWarningFindingIds` | list | Must equal the current warning set for approval. |
| `actorId`, `activeRole`, `decidedAt` | values | Role is exactly `attorney-agent`. |

Approval requires an actor different from the revision author and technical reviewer and who is not
an inventor or contributor for the project.

## CnipaEfilingEvidence

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId` | string | Immutable identity and project owner. |
| `applicationDate`, `declaredRoute`, `policyEffectiveDate` | values | Required CNIPA route context. |
| `linkedRevisions` | list | Revision ID and canonical SVG hash. |
| `xmlPackageHash` | SHA-256 | Hash of externally created XML package. |
| `converter` | object | Tool name and version. |
| `dataStandardVersion` | string | External standard identity. |
| `previewProofreadAttestation` | object | Confirmed true, actor and time. |
| `reviewedByActorId`, `reviewedAt` | values | Named review. |
| `recordedByActorId`, `recordedAt` | values | Immutable provenance. |

Incomplete or mismatched submissions are rejected and audited; they do not create valid evidence.
Evidence never blocks an ordinary SVG asset export. It can change only the limited manifest label.

## WorkflowInvalidation

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId`, `figureId` | string | Immutable identity. |
| `cause` | object | Kind, target ID, previous fingerprint and next fingerprint. |
| `affected` | object | Rule-run, candidate, technical-decision and attorney-decision IDs. |
| `earliestRequiredAction` | enum | Create/select revision, run checks, technical review, attorney approval or export. |
| `actorId`, `reason`, `occurredAt` | values | Immutable provenance. |

Cause kinds are source link, FigurePlan, canonical SVG, reference registry, sheet layout, rule
profile and export settings. Replaying the same cause/fingerprint is idempotent.

## ExportPackage and PackageSupersessionEvent

`ExportPackage` contains package, project, figure, candidate, revision, rule-run and both decision
IDs; candidate fingerprint; SVG and manifest blob hashes; the limited CNIPA label; actor and time.
The manifest contains the SVG hash. The database package record binds the manifest hash without
placing a circular self-hash inside the manifest.

`PackageSupersessionEvent` records old package ID, successor revision ID, cause invalidation ID,
actor and time. The old package remains downloadable but projections label it superseded.

## WorkflowAuditEvent

| Field | Type | Rules |
| --- | --- | --- |
| `id`, `projectId` | string | Immutable identity and project boundary. |
| `eventType` | string enum | Stable accepted/denied workflow event type. |
| `actorId`, `activeRole` | values | Actual actor and role used for the attempt. |
| `targetIds` | list | Revision, run, candidate, decision, evidence or package targets. |
| `outcome` | `accepted` or `denied` | Denied attempts never create a valid domain decision. |
| `reasonCode`, `reason` | strings | Stable machine code and human-readable explanation. |
| `fingerprints` | map | Relevant expected/current revision, candidate and workflow fingerprints. |
| `occurredAt` | ISO timestamp | Immutable event time. |

The repository exposes append and project-scoped read methods. Accepted commands and denied role,
self-approval, stale, hash-mismatch, evidence and gate attempts append an event without reusing the
AI-specific audit schema.

## Derived workflow projection

| Condition | State | Primary action |
| --- | --- | --- |
| Upstream plan/draft incomplete | `plan` or `draft` | Server-provided upstream action. |
| No selected canonical revision | `canonical-revision` | Import or create SVG. |
| Current revision has no matching run | `canonical-revision` | Run checks. |
| Current run contains fail | `checks-blocked` | Create successor revision and fix. |
| No fail and no candidate | `checks-ready` | Submit technical review. |
| Candidate lacks valid technical approval | `technical-review` | Approve or return, depending on actor. |
| A return/rejection requires a new revision | `changes-requested` | Create successor revision. |
| Valid technical approval lacks attorney pass | `attorney-approval` | Approve or reject export. |
| Valid attorney approval lacks package | `approved-for-export` | Create export package. |
| Current candidate has completed package | `exported` | Download package. |
| Material change made downstream evidence stale | `invalidated` | Execute earliest required recovery action. |

The projection always includes a monotonic version, ETag, current artifact IDs, one primary action,
all role-aware actions and structured blocking gates.
