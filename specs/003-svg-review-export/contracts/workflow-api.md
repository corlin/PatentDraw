# Contract: SVG review and export workflow

This is an internal application contract. It does not create a public API commitment.

## Common command rules

Every mutating request requires an authenticated project context plus:

- `Idempotency-Key`: unique command key. Repeating the same key and canonical request returns the
  original result; reusing it with different content returns `409 idempotency-key-conflict`.
- `If-Match: "<workflow-etag>"`: expected server workflow version. Stale values return the current
  snapshot with `409 stale-workflow`.
- Explicit target IDs and fingerprints: the server never interprets “current” from a client alone.

All role, project, self-approval, freshness, hash and workflow-transition checks are enforced by
domain services inside the same transaction that appends the result.

## Error shape

```json
{
  "type": "urn:patentdraw:problem:stale-workflow",
  "title": "Workflow state changed",
  "status": 409,
  "code": "stale-workflow",
  "detail": "Revision revision-03 is now current.",
  "instance": "/projects/project-01/figures/figure-01",
  "unmetGates": [
    { "code": "rule-run-stale", "message": "Run checks on revision-03.", "targetId": "revision-03" }
  ],
  "current": {
    "workflowVersion": 12,
    "state": "canonical-revision",
    "revisionId": "revision-03"
  }
}
```

Status usage:

- `400`: malformed request contract;
- `401`: missing authenticated project context;
- `403`: project/role/self-approval/inventor-or-contributor denial;
- `404`: project-scoped artifact absent;
- `409`: stale workflow/candidate, wrong transition, idempotency conflict or content mismatch;
- `422`: SVG sanitization failure, invalid finding dispositions or incomplete/mismatched CNIPA evidence.

## Workflow projection

```http
GET /api/projects/:projectId/figures/:figureId/workflow
```

The read is side-effect free. Page load and refresh must not create an AI run, revision or audit
event other than an explicitly privileged audit-read event if policy requires one.

```ts
type WorkflowSnapshot = {
  version: number;
  etag: string;
  state:
    | 'plan'
    | 'draft'
    | 'canonical-revision'
    | 'checks-blocked'
    | 'checks-ready'
    | 'technical-review'
    | 'changes-requested'
    | 'attorney-approval'
    | 'approved-for-export'
    | 'exported'
    | 'invalidated';
  actor: { id: string; activeRole: ProjectRole; roles: ProjectRole[] };
  current: {
    revisionId?: string;
    ruleRunId?: string;
    candidateId?: string;
    technicalDecisionId?: string;
    attorneyDecisionId?: string;
    exportPackageId?: string;
  };
  primaryAction: WorkflowAction;
  actions: WorkflowAction[];
  blockingGates: BlockingGate[];
};

type WorkflowAction = {
  action: string;
  label: string;
  availability: 'enabled' | 'disabled' | 'waiting';
  requiredRole?: ProjectRole;
  targetId?: string;
  blockingGates: BlockingGate[];
};

type BlockingGate = {
  code: string;
  message: string;
  targetId?: string;
  recoveryAction?: string;
};
```

Every snapshot has one primary action. When the actor lacks the required role, the primary action
uses `waiting` and identifies the required actor/role instead of presenting an unexplained disabled
button.

## Upstream plan and draft bridge

Existing AI contracts remain authoritative, with these corrections:

```http
POST /api/projects/:projectId/ai-figure-plans/:proposalId/dispositions
POST /api/projects/:projectId/generated-draft-jobs/:jobId/reject
```

FigurePlan disposition request:

```ts
{
  proposalId: string;
  items: Array<{
    proposalElementId: string;
    disposition: 'accepted' | 'rejected' | 'edited' | 'open-question';
    editedValue?: string;
    reason?: string;
  }>;
}
```

Every unresolved proposal item requires one disposition before confirmation. Draft state controls
must expose existing cancel/select operations plus reject and retry where the current job permits.

## Canonical revision endpoints

```http
POST /api/projects/:projectId/figures/:figureId/revisions
GET  /api/projects/:projectId/figures/:figureId/revisions/:revisionId
POST /api/projects/:projectId/figures/:figureId/candidate-selections
```

Create revision request for the first slice:

```ts
{
  svgText: string;
  parentRevisionId?: string;
  origin:
    | { kind: 'import' }
    | { kind: 'editor-save' }
    | { kind: 'ai-draft-reference'; generatedDraftAssetId: string };
  confirmedFigurePlanId: string;
  sourceLinks: Array<{ sourceAssetId: string; contentHash: Sha256 }>;
  referenceRegistryVersionId: string;
  sheet: {
    standard: 'A4' | 'US-Letter';
    widthMm: number;
    heightMm: number;
    orientation: 'portrait' | 'landscape';
  };
}
```

Successful creation returns `201` with the accepted sanitization report, revision metadata and new
workflow snapshot. An idempotent replay returns `200`. Sanitization rejection returns `422` with
safe issue codes/paths and no revision ID. Parent or workflow staleness returns `409`.

Candidate selection request binds `revisionId`, `revisionFingerprint` and expected current revision
ID. Selection plus downstream invalidation is atomic.

## Rule-run endpoints

```http
POST /api/projects/:projectId/figures/:figureId/revisions/:revisionId/rule-runs
GET  /api/projects/:projectId/figures/:figureId/rule-runs/:ruleRunId
```

```ts
{
  revisionHash: Sha256;
  profile: { id: string; version: string; profileHash: Sha256 };
}
```

The first rule pack runs synchronously within the defined 2-second target and returns `201` with an
immutable run and findings. The server reloads and rehashes canonical bytes before evaluation.
Mismatch returns `409 revision-content-mismatch` and is audited. A rerun always creates another
rule-run ID. While the request is in flight, the client may show `aria-busy` and a temporary loading
message, but it must not persist or present `checks-running` as an authoritative workflow state.

## Export candidate and review endpoints

```http
POST /api/projects/:projectId/figures/:figureId/export-candidates
POST /api/projects/:projectId/figures/:figureId/export-candidates/:candidateId/technical-decisions
POST /api/projects/:projectId/figures/:figureId/export-candidates/:candidateId/attorney-decisions
```

Candidate request binds revision ID/hash/fingerprint, rule-run ID/profile hash, export settings and
optional CNIPA evidence ID. Any fail prevents creation.

Technical decision request:

```ts
{
  candidateFingerprint: Sha256;
  decision: 'approve-structural-correspondence' | 'return-for-change';
  reason: string;
  findingDispositions: Array<{
    findingId: string;
    disposition: 'accepted-with-reason' | 'requires-change' | 'not-applicable';
    reason: string;
  }>;
}
```

Technical approval requires exactly one reasoned disposition per manual finding and a reviewer who
is not the revision author.

Attorney decision request:

```ts
{
  candidateFingerprint: Sha256;
  technicalDecisionId: string;
  decision: 'approve-export' | 'reject-export';
  reason: string;
  acknowledgedWarningFindingIds: string[];
}
```

Attorney approval requires the exact current technical approval, acknowledgment of the current
warning set and an actor distinct from both author and technical reviewer. The actor cannot be an
inventor or contributor for the project.

Use separate technical and attorney schemas even if persistence uses a common decision envelope;
invalid role/outcome combinations must be unrepresentable.

## CNIPA evidence endpoints

```http
POST /api/projects/:projectId/cnipa-efiling-evidence
GET  /api/projects/:projectId/cnipa-efiling-assessment
```

Only the attorney-agent role records and reviews evidence in the first slice. The request includes
application date, declared route, policy-effective date, linked revision IDs/hashes, XML package
hash, converter tool/version, data-standard version, proofread attestation and named reviewer.

Incomplete or mismatched evidence returns `422` and is audited; it does not create a valid evidence
record. Valid evidence changes only the label to `CNIPA-XML-evidence-recorded`. No response may use
`ready`, `submitted` or `accepted` as a filing state.

## Export endpoints

```http
POST /api/projects/:projectId/figures/:figureId/export-candidates/:candidateId/export-packages
GET  /api/projects/:projectId/figures/:figureId/export-packages/:packageId
GET  /api/projects/:projectId/figures/:figureId/export-packages/:packageId/svg
GET  /api/projects/:projectId/figures/:figureId/export-packages/:packageId/manifest
```

Create request binds candidate fingerprint, technical decision ID and attorney decision ID. The
server reloads and hashes canonical SVG, re-evaluates all gates, builds canonical manifest JSON,
stores and rereads both artifacts, verifies hashes, and only then commits a completed package
record. A disconnected client can retry with the same idempotency key and receive the completed
record.

The SVG response is `image/svg+xml` with attachment disposition. The manifest response is
`application/json`. Both use the immutable package ID; no partial package is downloadable.

## Audit requirements

Every accepted command and every denied role, self-approval, stale, content-mismatch, evidence or
gate attempt emits a project-scoped workflow audit event containing event ID/type, actor/active
role, target IDs, outcome, reason, time and relevant fingerprints. AI events may be projected into
the same UI timeline but remain separate contract records.
