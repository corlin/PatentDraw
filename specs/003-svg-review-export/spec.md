# Feature Specification: SVG review and export workflow

**Feature Branch**: `003-svg-review-export`
**Created**: 2026-08-01
**Status**: Draft
**Input**: User description: "Complete and refine the workflow after AI draft handoff so a drafter can create a real canonical SVG, run checks, obtain separate human review and export an auditable SVG package."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach a real, checkable SVG revision (Priority: P1)

A patent drafter reviews FigurePlan items and an optional AI draft, explicitly accepts, rejects or
edits unresolved suggestions, and then creates or imports a sanitized canonical SVG revision. The
drafter can run a named rule profile against that revision and see each result on the figure with
an explanation of what blocks progress.

**Why this priority**: The present workflow stops after a nominal handoff. A real canonical SVG and
visible rule run are the minimum foundation for any defensible review or export.

**Independent Test**: Starting from a selected fictional draft, create a canonical SVG revision,
run the selected profile, inspect one passing result and one blocking result, correct the blocking
condition and rerun the profile without requiring later review or export features.

**Acceptance Scenarios**:

1. **Given** FigurePlan rows marked as unresolved, **When** the drafter attempts to confirm the plan, **Then** the system requires each row to be accepted, rejected, edited or retained as an explicitly named open question.
2. **Given** an AI draft job is queued, running, ready or failed, **When** its state changes, **Then** the drafter is offered only valid actions for that state, including cancellation, rejection, selection or retry where applicable.
3. **Given** a selected AI draft, **When** the drafter starts formal drafting, **Then** the system requires creation or import of a separate sanitized canonical SVG and never promotes the AI asset itself.
4. **Given** a current canonical SVG and selected rule profile, **When** the drafter runs checks, **Then** every finding identifies its rule, evidence, severity, outcome and remediation, and the next valid action is visible.
5. **Given** a blocking finding, **When** the drafter corrects the SVG and reruns checks, **Then** the correction is a new attributable revision and the previous run remains available as history.

---

### User Story 2 - Complete independent technical review (Priority: P2)

A technical reviewer opens the exact checked revision, compares it with its source and FigurePlan,
reviews deterministic and judgment findings, records a decision for every manual-review item, and
either approves structural correspondence or returns the revision to the drafter with reasons.

**Why this priority**: Deterministic formality checks cannot decide technical correspondence,
legibility in context or whether an annotation is indispensable.

**Independent Test**: Use a checked fictional sectional drawing containing one
`manual-review-required` finding. Sign in as a distinct technical reviewer, record a disposition,
return the revision once, then approve the corrected revision.

**Acceptance Scenarios**:

1. **Given** a current rule run with no unresolved `fail` results, **When** a distinct technical reviewer opens it, **Then** the reviewer sees the checked revision, source links, FigurePlan, finding evidence and all unresolved judgments together.
2. **Given** an unresolved `manual-review-required` result, **When** the reviewer attempts approval without a reasoned disposition, **Then** approval is blocked and the missing decision is identified.
3. **Given** a technically incorrect or unclear revision, **When** the reviewer returns it, **Then** a reason is required and the drafter receives an actionable return state rather than an approval state.
4. **Given** the technical reviewer approves structural correspondence, **When** the decision is recorded, **Then** the immutable decision identifies the exact revision and rule run reviewed.

---

### User Story 3 - Approve and export an auditable SVG package (Priority: P3)

An attorney or agent reviews the technically approved export candidate, considers unresolved
warnings and jurisdiction-specific limitations, approves or rejects it, and downloads the
sanitized SVG master together with an audit manifest. The product does not assert filing
acceptance or treat SVG as a CNIPA electronic filing package.

**Why this priority**: An SVG download without an attributable approval chain and manifest cannot
be relied on as a controlled patent-production artifact.

**Independent Test**: With a technically approved fictional revision, record an attorney/agent
approval, export the SVG package, verify its hashes and manifest links, and confirm that a CNIPA
export without external XML evidence is labelled `not-CNIPA-electronic-submission-ready`.

**Acceptance Scenarios**:

1. **Given** a current technical approval, **When** a separately identified attorney/agent reviews the export candidate, **Then** the approver can approve or reject it with a recorded reason.
2. **Given** no attorney/agent approval, a stale approval or a blocking finding, **When** any user requests export, **Then** export is denied and the exact unmet gate is displayed.
3. **Given** a valid attorney/agent approval, **When** export is requested, **Then** the package contains the sanitized SVG master and an audit manifest bound to the same revision, checks and approvals.
4. **Given** a CNIPA profile without complete external XML evidence, **When** the SVG package is exported, **Then** it remains available as a drawing asset but is labelled `not-CNIPA-electronic-submission-ready`.
5. **Given** complete externally produced CNIPA XML evidence, **When** it is reviewed and linked, **Then** the manifest states only `CNIPA-XML-evidence-recorded` and makes no filing or acceptance claim.

---

### User Story 4 - Recover safely after any material change (Priority: P4)

A drafter, reviewer or approver can understand what became stale after a source, plan, SVG,
reference-sign registry, rule profile or export setting changes, and can resume from the earliest
required gate without losing history.

**Why this priority**: Patent figures change repeatedly. Silent reuse of stale checks or approvals
is more dangerous than a visible workflow interruption.

**Independent Test**: Export a fictional approved revision, alter one reference numeral, and verify
that checks, both review decisions and export eligibility are invalidated while the previous
records remain visible and the interface offers a rerun action.

**Acceptance Scenarios**:

1. **Given** a checked or approved revision, **When** geometry, labels, numerals, sheet layout, source links, rule profile or export settings materially change, **Then** dependent checks, reviews and export eligibility are invalidated.
2. **Given** invalidated downstream records, **When** a user opens the project, **Then** the workflow identifies the change, affected records and earliest required recovery action.
3. **Given** an already exported package, **When** a later revision is created, **Then** the prior package remains downloadable as historical evidence but is clearly marked superseded and cannot represent the new revision.

### Edge Cases

- A stale browser tab submits a decision after a newer revision or rule run exists: the decision is rejected and the current revision is shown.
- Two drafters edit from the same parent revision: both children retain their parent relationship, but only an explicitly selected child becomes the current review candidate.
- SVG sanitization removes or rejects active code, external resources, unsupported content or unsafe raster payloads before a revision can become canonical.
- The SVG content hash differs from the hash recorded at check or export time: checks, approvals and export are rejected as stale.
- A rule profile becomes superseded between check and approval: the approver sees the effective-date difference and the project requires a rerun when the current profile is mandatory.
- A `warning` remains unresolved: it does not silently become a pass and remains visible in review and the export manifest.
- A `manual-review-required` result has no named disposition: technical approval and export remain blocked.
- A user has more than one project role: each decision still records the active role, and prohibited self-approval rules apply to the actor, not merely the selected role label.
- The revision author, an inventor or a contributor attempts to approve their own export candidate: approval is denied and audited.
- External CNIPA XML evidence references a different SVG revision or lacks proofread attestation: the evidence is stale or incomplete and cannot change the export label.
- Network interruption occurs during export: no package is reported complete unless the SVG and manifest hashes are both finalized and mutually linked.

## Requirements *(mandatory)*

### Workflow and Interaction Requirements

- **FR-001**: AI assistance MUST be initiated by an explicit user action after source selection and authorisation; opening or refreshing a page MUST NOT create a new AI run.
- **FR-002**: The FigurePlan review MUST provide an explicit accept, reject, edit or open-question disposition for every unresolved proposed item before plan confirmation.
- **FR-003**: Draft-job actions MUST reflect the actual job state and MUST expose cancellation, rejection, selection and retry when those actions are valid.
- **FR-004**: Every reachable workflow state MUST display one clear primary next action; unavailable actions MUST identify the unmet gate rather than appearing as unexplained dead ends.
- **FR-005**: The workflow MUST distinguish `plan`, `draft`, `canonical-revision`, `checks-blocked`, `checks-ready`, `technical-review`, `changes-requested`, `attorney-approval`, `approved-for-export`, `exported` and `invalidated` states. A synchronous check request MAY expose a temporary client loading state, but that state is not authoritative workflow evidence.

### Canonical SVG and Rule Requirements

- **FR-006**: Formal drafting MUST create or import a sanitized canonical SVG revision that is independent from any AI-generated draft asset.
- **FR-007**: Every canonical revision MUST record an immutable identifier, content hash, parent and source relationships, author, timestamp, sheet size, selected rule profile and sanitization result.
- **FR-008**: Canonical SVG content MUST have an explicit physical sheet size and view box and MUST reject active code, event handlers, external resources, unsupported foreign content and unsafe dependencies.
- **FR-009**: A material edit MUST produce an attributable successor revision; the editable SVG master and its historical parents MUST remain recoverable.
- **FR-010**: A drafter MUST be able to run a named, effective-dated PCT/USPTO or CNIPA profile only against the current canonical revision.
- **FR-011**: Every rule finding MUST record the profile and version, effective date, official source, rule identifier, evaluated input, predicate or review policy, outcome, severity, rendered evidence and remediation text.
- **FR-012**: Rule outcomes MUST be limited to `pass`, `warning`, `manual-review-required` or `fail`; unsupported technical or legal judgment MUST NOT be represented as `pass`.
- **FR-013**: An unresolved `fail` MUST block technical approval and export. An unresolved `manual-review-required` result MUST block approval until a named reviewer records a reasoned disposition. A `warning` MAY proceed but MUST remain visible through export.
- **FR-014**: Rerunning checks MUST create a new rule-run record linked to the exact revision; it MUST NOT overwrite prior findings.

### Review and Approval Requirements

- **FR-015**: Technical review MUST be performed by an authenticated actor who is distinct from the current revision author and is acting in the technical-reviewer role.
- **FR-016**: A technical reviewer MUST be able to approve structural correspondence or return the candidate with required reasons and per-finding dispositions.
- **FR-017**: Attorney/agent approval MUST be a separate, immutable decision on the exact technically approved revision and rule run.
- **FR-018**: The attorney/agent approver MUST be distinct from the revision author and technical reviewer for the same export candidate; an inventor or contributor MUST NOT approve an export candidate.
- **FR-019**: Each review decision MUST record the decision type, outcome, reason, actor, active role, timestamp, revision, rule run and any findings it resolves.
- **FR-020**: Role denial, stale-decision rejection, return-for-change and approval invalidation events MUST be visible in the project audit history.

### Export and CNIPA Boundary Requirements

- **FR-021**: Export MUST be allowed only for the current sanitized revision with a current rule run, completed technical review and current attorney/agent approval.
- **FR-022**: The first export slice MUST provide the sanitized SVG master and a machine-readable audit manifest as one attributable package.
- **FR-023**: The manifest MUST identify the project, figure, revision and source hashes; rule profile and rule-run identifiers; unresolved warnings; review and approval identifiers; export actor and time; SVG hash; sheet size; and live-text or outlined-text state.
- **FR-024**: The system MUST verify the exported SVG hash against the manifest and MUST NOT report success when either artifact is incomplete or mismatched.
- **FR-025**: SVG exports MUST be described as editable or reviewed drawing assets, never as automatically USPTO-ready, CNIPA-ready, legally sufficient or accepted for filing.
- **FR-026**: A CNIPA-profile export without complete external XML-package evidence MUST be labelled `not-CNIPA-electronic-submission-ready`.
- **FR-027**: When external CNIPA XML evidence is recorded, it MUST identify the declared route, linked revision, package hash, tool and version, standard version, preview/proofread attestation, reviewer and timestamp; the resulting label MUST be limited to `CNIPA-XML-evidence-recorded`.
- **FR-028**: This feature MUST NOT generate CNIPA XML, transmit an application to an office or claim that an office filing event occurred.

### Invalidation and Provenance Requirements

- **FR-029**: Changes to source links, FigurePlan, canonical SVG content, reference signs, sheet layout, selected rule profile or export settings MUST invalidate dependent rule runs, review decisions and export eligibility.
- **FR-030**: Invalidation MUST preserve historical records and identify the changed object, affected records, actor, timestamp and reason.
- **FR-031**: The workflow MUST route an invalidated candidate to the earliest required action and provide a visible recovery action.
- **FR-032**: Every exported package MUST remain immutable and downloadable as historical evidence; a later revision MUST mark it superseded rather than alter or replace it.
- **FR-033**: Every primary workflow action, finding disposition and review decision MUST be keyboard operable, expose an accessible name and visible focus state, and announce loading, success, failure and invalidation status without relying on colour alone.

### Key Entities

- **Figure revision**: A sanitized canonical SVG version with immutable identity, content hash, parent/source relationships, author, time, physical sheet metadata and current/superseded state.
- **Rule profile**: A named, versioned and effective-dated set of deterministic checks and explicit human-review policies tied to official sources.
- **Rule run**: An immutable evaluation of one rule profile against one exact figure revision.
- **Rule finding**: One evidence-bearing outcome from a rule run, including status, severity, evaluated input, explanation and remediation.
- **Review decision**: A technical-review or attorney/agent decision tied to an exact revision, rule run, actor, active role and stated reason.
- **Export candidate**: The exact current revision, rule run, warning set and approval chain proposed for export.
- **Export package**: An immutable sanitized SVG and audit manifest pair with mutually verified hashes and a supersession state.
- **CNIPA e-filing evidence**: A record of an externally produced XML package and its declared route, revision link, hash, tool/version, standard, proofread attestation and named reviewer; it is not a filing receipt.
- **Workflow invalidation**: An immutable record explaining which material change made which downstream records stale and where the workflow must resume.
- **Workflow audit event**: An immutable record of an accepted or denied command, including actor, active role, target, outcome, reason, timestamp and relevant fingerprints.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every supported workflow state, 100% of supervised users can identify the next valid action or the specific blocking gate without consulting developer documentation.
- **SC-002**: Across all acceptance fixtures, 100% of material SVG, source, plan, profile and export-setting changes invalidate every dependent rule run, review decision and export eligibility state.
- **SC-003**: 100% of rule findings contain the required profile, source, evidence, outcome and remediation fields, and no judgment-only fixture is reported as an automated pass.
- **SC-004**: 100% of prohibited, self-approval and stale-decision attempts are denied and appear in the audit history with actor, role, target and reason.
- **SC-005**: 100% of successful exports contain an SVG and manifest whose recorded hashes match, whose revision/check/approval chain is complete, and whose unresolved warnings are disclosed.
- **SC-006**: In a supervised three-role demonstration, a drafter, technical reviewer and attorney/agent complete the canonical-revision-to-export workflow in under 10 minutes without bypassing a gate.
- **SC-007**: In all CNIPA fixtures, the product never represents SVG as an XML package or filing event; missing or mismatched XML evidence always produces the required limited readiness label.
- **SC-008**: At least 90% of first-time pilot users complete the primary workflow without encountering an unexplained disabled control or workflow dead end.
- **SC-009**: A keyboard-only user can complete every role-appropriate action in the supervised workflow, and every asynchronous or invalidation state is conveyed by text or assistive-technology status rather than colour alone.

## Assumptions

- The implemented `002-ai-figure-assistance` feature remains the upstream source of optional FigurePlan proposals and non-authoritative draft assets.
- Initial validation uses authorised or fictional figures, including the existing complex sectional pump fixture; production release still requires a supervised pilot.
- The first export increment includes the sanitized SVG master and machine-readable audit manifest. PDF, PNG and TIFF derivative generation is deferred to a later feature.
- The initial workflow uses separately authenticated drafter, technical-reviewer and attorney/agent actors; changing the displayed role alone does not change actor identity.
- Existing project authentication, source authorisation, confidential-data controls and retention policy are reused and remain mandatory.
- CNIPA XML is produced and submitted only by an external official or authorised workflow. This feature records evidence and labels limitations but does not generate or transmit XML.
- The selected rule profile and official-source snapshot are already reviewed and versioned before they can be used for a production decision.
- The first pilot interface is Simplified Chinese; immutable identifiers, role names, rule outcomes and manifest fields remain stable language-neutral values.

## Scope Boundary

This feature closes the operational path from a reviewed AI/manual planning result to an auditable
SVG export. It does not add office submission, legal advice, autonomous technical judgment,
automatic final-figure generation, CAD-native editing, PDF/raster export, public APIs, batch
conversion or additional jurisdictions. None of those deferred capabilities may be represented by
placeholder controls as if they were operational.
