---

description: "Dependency-ordered tasks for the SVG review and export workflow"
---

# Tasks: SVG review and export workflow

**Input**: Design documents from `specs/003-svg-review-export/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the specification and constitution. Write each listed test first and confirm
it fails for the intended reason before implementing the corresponding behavior.

**Organization**: Tasks are grouped by user story. Complete Setup and Foundation first, then stop at
each story checkpoint for an independent demonstration.

## Phase 1: Setup

**Purpose**: Add the minimum dependency, fixture and coverage seams without implementing workflow behavior.

- [X] T001 Add the reviewed `@xmldom/xmldom` dependency for server-side SVG parsing in `apps/api/package.json` and lock it in `pnpm-lock.yaml`
- [X] T002 [P] Create the shared contract module export seam in `packages/contracts/src/svg-review-export.ts` and `packages/contracts/src/index.ts`
- [X] T003 [P] Create the fictional workflow fixture module export seam in `packages/fixtures/src/svg-review-export.ts` and `packages/fixtures/src/index.ts`
- [X] T004 [P] Add the planned API and web workflow modules to coverage collection in `vitest.config.ts`

---

## Phase 2: Foundational workflow authority

**Purpose**: Establish shared contracts, persistence, actor separation and a server-authoritative snapshot before any story UI is enabled.

**⚠️ CRITICAL**: No user-story control may be presented as operational until this phase is complete.

- [X] T005 [P] Add failing contract tests for workflow states, actions, blocking gates, revisions, rule artifacts, decisions, invalidations and export records in `tests/contract/svg-review-export.contract.test.ts`
- [X] T006 Implement TypeBox schemas and discriminated TypeScript types for the foundational entities and problem shape in `packages/contracts/src/svg-review-export.ts`
- [X] T007 Expand project roles and actor relationships for `contributor` and `inventor` enforcement in `packages/contracts/src/ai-assistance.ts` and `apps/api/src/modules/projects-assets/source-authorisation.ts`
- [X] T008 Define `SvgWorkflowRepository`, immutable records, compare-and-swap projection methods and an in-memory adapter in `apps/api/src/modules/svg-review-export/repository.ts`
- [X] T009 [P] Create relational tables, foreign keys, uniqueness constraints and append-only guards in `apps/api/src/modules/svg-review-export/migrations/004_svg_review_export.sql`
- [X] T010 Implement the PostgreSQL workflow repository with transactional current-candidate locking in `apps/api/src/infrastructure/postgres-svg-workflow-repository.ts`
- [X] T011 [P] Implement stable workflow problem responses and idempotency-key conflict handling in `apps/api/src/modules/svg-review-export/problems.ts` and `apps/api/src/modules/svg-review-export/idempotency.ts`
- [X] T012 Implement the pure server-derived `WorkflowSnapshot` and role-aware primary-action selector in `apps/api/src/modules/svg-review-export/workflow-state.ts`
- [X] T013 Add three distinct fictional actor contexts, side-effect-free workflow reads and new module composition in `apps/api/src/runtime-composition.ts`, `apps/api/src/modules/svg-review-export/routes.ts` and `apps/api/src/app.ts`
- [X] T014 Implement append-only `WorkflowAuditEvent` contracts, repository methods and accepted/denied command recording in `packages/contracts/src/svg-review-export.ts`, `apps/api/src/modules/svg-review-export/repository.ts` and `apps/api/src/modules/svg-review-export/workflow-audit.ts`

**Checkpoint**: A fixture project returns a typed workflow snapshot for each separate actor; page reads create no workflow mutation.

---

## Phase 3: User Story 1 — Real canonical SVG and rule checks (Priority: P1) 🎯 MVP

**Goal**: Remove the current dead end by making upstream choices explicit, creating a real sanitized SVG revision and running evidence-bearing deterministic checks.

**Independent Test**: From a fictional plan/draft, import `pump-v1.svg`, observe a rejected unsafe input and an accepted canonical revision, run a profile containing all four outcomes, create corrected `pump-v2.svg`, and verify the first run remains historical.

### Tests for User Story 1

- [X] T015 [P] [US1] Add failing revision and rule endpoint contract cases, including sanitization rejection and stale hashes, in `tests/contract/svg-review-export.contract.test.ts`
- [X] T016 [P] [US1] Add failing sanitizer unit cases for DTD/entity, script, handler, external URL, foreign object, animation/filter, raster, dimensions and input limits in `apps/api/src/modules/svg-review-export/svg-sanitizer.test.ts`
- [X] T017 [P] [US1] Add failing canonical revision, parent, candidate-selection and hash integration cases in `tests/integration/svg-revision.integration.test.ts`
- [X] T018 [P] [US1] Add failing repeatable rule-run, evidence, outcome and rerun-history integration cases in `tests/integration/rule-run.integration.test.ts`
- [X] T019 [P] [US1] Add failing component-state tests for revision import, sanitization report, findings and primary-action rendering in `apps/web/src/features/svg-review-export/SvgWorkflowPanels.test.tsx`
- [X] T020 [P] [US1] Add failing upstream contract and regression tests proving page load is read-only and FigurePlan/draft actions expose disposition, cancel, reject, select and retry in `tests/contract/ai-figure-plan.contract.test.ts`, `apps/web/src/features/ai-figure-plan/api-client.test.ts` and `tests/integration/generated-draft-asset.integration.test.ts`

### Implementation for User Story 1

- [X] T021 [US1] Replace auto-request-on-load with an explicit FigurePlan command and implement shared item-disposition plus draft reject/retry contracts and behavior in `packages/contracts/src/ai-assistance.ts`, `apps/web/src/main.tsx`, `apps/web/src/features/ai-figure-plan/api-client.ts` and `apps/api/src/modules/ai-assistance/routes.ts`
- [X] T022 [US1] Implement bounded XML parsing, secure-static allowlist rebuilding, deterministic serialization and sanitization reports in `apps/api/src/modules/svg-review-export/svg-sanitizer.ts`
- [X] T023 [US1] Implement raw-input retention, canonical blob storage, immutable revision creation and candidate selection in `apps/api/src/modules/svg-review-export/revision-service.ts`
- [X] T024 [P] [US1] Define the first reviewed profile metadata and pure SVG safety, sheet, margin, monochrome, label and manual-review policies in `apps/api/src/modules/svg-review-export/rule-profile-catalog.ts`
- [X] T025 [US1] Implement immutable rule runs, typed evidence and summary calculation against canonical bytes in `apps/api/src/modules/svg-review-export/rule-service.ts`
- [X] T026 [US1] Add revision, candidate-selection, rule-run and rule-read HTTP commands with ETag/idempotency enforcement in `apps/api/src/modules/svg-review-export/routes.ts`
- [X] T027 [P] [US1] Implement typed workflow, revision and rule command clients with structured 409/422 handling in `apps/web/src/features/svg-review-export/workflow-api-client.ts`
- [X] T028 [P] [US1] Build the server-driven workflow shell, semantic rail, next-action card and gate checklist in `apps/web/src/features/svg-review-export/WorkflowShell.tsx`, `apps/web/src/features/svg-review-export/WorkflowRail.tsx` and `apps/web/src/features/svg-review-export/NextActionCard.tsx`
- [X] T029 [P] [US1] Build SVG import, revision metadata/history and sanitization report panels in `apps/web/src/features/svg-review-export/SvgRevisionPanel.tsx`, `apps/web/src/features/svg-review-export/SvgImportDialog.tsx` and `apps/web/src/features/svg-review-export/SanitizationReport.tsx`
- [X] T030 [P] [US1] Build rule-profile, finding-list and keyboard-synchronized evidence-overlay panels in `apps/web/src/features/svg-review-export/RuleRunPanel.tsx`, `apps/web/src/features/svg-review-export/FindingList.tsx` and `apps/web/src/features/svg-review-export/FindingOverlay.tsx`
- [X] T031 [US1] Replace the local boolean workflow in `apps/web/src/main.tsx` with `WorkflowShell` while preserving the current artifact-workbench layout in `apps/web/src/styles.css`
- [X] T032 [US1] Run and record the P1 independent browser acceptance through corrected SVG rerun in `specs/003-svg-review-export/p1-acceptance.md`

**Checkpoint**: The left rail reaches “检查”; the right inspector has real findings and recovery actions; no check/review/export placeholder claims exist beyond implemented gates.

---

## Phase 4: User Story 2 — Independent technical review (Priority: P2)

**Goal**: Let a distinct technical reviewer disposition every judgment item, approve structural correspondence or return the exact candidate with reasons.

**Independent Test**: A separate technical-reviewer actor reviews a checked pump candidate, returns it once, then approves a corrected candidate; author, stale and incomplete-disposition attempts are denied and audited.

### Tests for User Story 2

- [X] T033 [P] [US2] Add failing technical-decision and per-finding-disposition contract cases in `tests/contract/svg-review-export.contract.test.ts`
- [X] T034 [P] [US2] Add failing author self-review, wrong-role, stale-candidate, missing-disposition, return and approval cases in `tests/integration/review-approval.integration.test.ts`
- [X] T035 [P] [US2] Add failing technical-review panel and waiting-state component cases in `apps/web/src/features/svg-review-export/TechnicalReviewPanel.test.tsx`

### Implementation for User Story 2

- [X] T036 [US2] Implement export-candidate creation and immutable technical decisions with complete manual-finding dispositions in `apps/api/src/modules/svg-review-export/review-service.ts`
- [X] T037 [US2] Add export-candidate and technical-decision routes with actor/fingerprint/ETag gates in `apps/api/src/modules/svg-review-export/routes.ts`
- [X] T038 [P] [US2] Build the technical review, per-finding disposition and return-for-change UI in `apps/web/src/features/svg-review-export/TechnicalReviewPanel.tsx` and `apps/web/src/features/svg-review-export/FindingDispositionForm.tsx`
- [X] T039 [P] [US2] Render authenticated actor/active-role identity and waiting-for-review boundaries in `apps/web/src/features/svg-review-export/RoleBoundaryNotice.tsx` and `apps/web/src/main.tsx`
- [X] T040 [US2] Run and record the P2 three-actor boundary and return/approve acceptance in `specs/003-svg-review-export/p2-acceptance.md`

**Checkpoint**: The technical-review stage is operable only by the distinct reviewer and produces an immutable, exact-candidate decision.

---

## Phase 5: User Story 3 — Attorney approval and auditable SVG export (Priority: P3)

**Goal**: Bind final human approval to the exact candidate and export verified sanitized SVG plus a hash-linked manifest with correct CNIPA limitation labels.

**Independent Test**: A third actor approves the technically accepted candidate, exports SVG and manifest, verifies both hashes, and observes the correct CNIPA labels with absent, matching and mismatched external XML evidence.

### Tests for User Story 3

- [x] T041 [P] [US3] Validate manifest examples and required limitation labels against `specs/003-svg-review-export/contracts/export-manifest.schema.json` in `tests/contract/svg-export-manifest.contract.test.ts`
- [x] T042 [P] [US3] Add failing attorney separation, warning acknowledgment, export gate, idempotent retry and hash-mismatch cases in `tests/integration/svg-export.integration.test.ts`
- [x] T043 [P] [US3] Add failing CNIPA absent, complete, mismatched-revision and missing-attestation cases in `tests/integration/cnipa-efiling-evidence.integration.test.ts`
- [x] T044 [P] [US3] Add failing attorney-approval and manifest-preview component cases in `apps/web/src/features/svg-review-export/ExportPanels.test.tsx`

### Implementation for User Story 3

- [x] T045 [P] [US3] Add complete and invalid CNIPA evidence fixtures plus export manifest fixtures in `packages/fixtures/src/svg-review-export.ts`
- [x] T046 [US3] Implement validated external CNIPA evidence records and limited readiness assessment in `apps/api/src/modules/svg-review-export/cnipa-evidence-service.ts`
- [x] T047 [US3] Extend immutable attorney approval, distinct-actor enforcement and warning acknowledgment in `apps/api/src/modules/svg-review-export/review-service.ts`
- [x] T048 [US3] Implement canonical manifest generation, SVG/manifest reread verification, package commit and idempotent retry in `apps/api/src/modules/svg-review-export/export-service.ts`
- [x] T049 [US3] Add CNIPA evidence, attorney-decision, package creation and artifact download routes in `apps/api/src/modules/svg-review-export/routes.ts`
- [x] T050 [P] [US3] Build attorney approval and warning/CNIPA acknowledgment UI in `apps/web/src/features/svg-review-export/AttorneyApprovalPanel.tsx`
- [x] T051 [P] [US3] Build export gate, manifest preview and immutable package history/download UI in `apps/web/src/features/svg-review-export/ExportGatePanel.tsx`, `apps/web/src/features/svg-review-export/ManifestPreview.tsx` and `apps/web/src/features/svg-review-export/ExportHistory.tsx`
- [x] T052 [US3] Run and record SVG/manifest hash verification and CNIPA-boundary acceptance in `specs/003-svg-review-export/p3-acceptance.md`

**Checkpoint**: A third actor can export only the exact approved candidate; every successful package has matching artifacts and no office-readiness claim.

---

## Phase 6: User Story 4 — Invalidation and recovery (Priority: P4)

**Goal**: Make every material change invalidate the exact downstream evidence and guide the correct role to the earliest recovery action while preserving history.

**Independent Test**: After export, change one reference numeral, verify checks and both decisions become unusable for the new candidate, keep the old package as superseded history, and reject a stale-tab approval.

### Tests for User Story 4

- [ ] T053 [P] [US4] Add failing dependency-change, idempotent invalidation, earliest-recovery and package-supersession cases in `tests/integration/workflow-invalidation.integration.test.ts`
- [ ] T054 [P] [US4] Add failing stale-conflict, invalidation-banner and historical-package component cases in `apps/web/src/features/svg-review-export/InvalidationRecovery.test.tsx`

### Implementation for User Story 4

- [ ] T055 [US4] Add append-only invalidation and package-supersession persistence methods in `apps/api/src/modules/svg-review-export/repository.ts` and `apps/api/src/infrastructure/postgres-svg-workflow-repository.ts`
- [ ] T056 [US4] Implement fingerprint dependency resolution, atomic invalidation bundles and earliest recovery action in `apps/api/src/modules/svg-review-export/invalidation-service.ts`
- [ ] T057 [US4] Connect source, FigurePlan, canonical SVG, reference registry, sheet, profile and export-setting changes to workflow invalidation in `apps/api/src/modules/svg-review-export/routes.ts` and `apps/api/src/modules/ai-assistance/invalidation-service.ts`
- [ ] T058 [US4] Extend the server workflow projection for invalidated, changes-requested and superseded-history states in `apps/api/src/modules/svg-review-export/workflow-state.ts`
- [ ] T059 [P] [US4] Build invalidation explanation, recovery CTA and stale-conflict reload UI in `apps/web/src/features/svg-review-export/InvalidationBanner.tsx` and `apps/web/src/features/svg-review-export/StaleConflictDialog.tsx`
- [ ] T060 [US4] Run and record the complete export-then-edit recovery scenario in `specs/003-svg-review-export/p4-acceptance.md`

**Checkpoint**: No old rule result, decision or export eligibility silently applies to a changed candidate; history is preserved and recovery is obvious.

---

## Phase 7: Polish and release-boundary validation

**Purpose**: Prove cross-story safety, accessibility, performance and honest release status.

- [ ] T061 [P] Add keyboard, semantic-table, live-region, focus-return, 200%-zoom and reduced-motion component assertions in `apps/web/src/features/svg-review-export/WorkflowAccessibility.test.tsx`
- [ ] T062 [P] Add 5 MiB, 10,000-element, depth, attribute and two-second rule-run limit fixtures in `tests/fixtures/svg-workflow-limits.test.ts`
- [ ] T063 [P] Add malformed-XML and namespace/URL property tests that prove no external fetch or raw unsafe node survives in `apps/api/src/modules/svg-review-export/svg-sanitizer.test.ts`
- [ ] T064 Enforce meaningful coverage thresholds for the new API and web modules in `vitest.config.ts`
- [ ] T065 Run the full `specs/003-svg-review-export/quickstart.md` three-role flow and record supervised evidence and remaining production-auth/profile-review gates in `specs/003-svg-review-export/pilot-evidence.md`
- [ ] T066 Reconcile specification status, verified test counts, limitations and constitutional checks in `specs/003-svg-review-export/spec.md`, then run `$speckit-analyze` and `$speckit-converge`

---

## Dependencies and execution order

### Phase dependencies

```text
Setup T001–T004
  → Foundation T005–T014
    → US1 T015–T032 (real SVG + checks; MVP gate)
      → US2 T033–T040 (technical review)
        → US3 T041–T052 (attorney approval + export)
          → US4 T053–T060 (cross-stage invalidation/recovery)
            → Polish T061–T066
```

- Setup has no dependency.
- Foundation blocks every user story because the server snapshot and immutable repository are the
  shared authority.
- US2 can develop its pure decision logic against fixtures after Foundation, but its UI acceptance
  uses the checked candidate produced by US1.
- US3 requires valid US1 rule evidence and US2 technical approval for end-to-end acceptance.
- US4 tests the completed downstream chain and therefore follows US3, although repository/event
  primitives may be prepared earlier.

### Within each story

- Write and run the listed failing tests first.
- Implement immutable models/repository behavior before services.
- Implement services before routes and UI command wiring.
- Do not advance the left rail or enable a button until its server command and negative tests pass.
- Stop at every checkpoint for the independent browser scenario.

## Parallel examples

### Foundation

```text
T005 contract tests || T009 migration || T011 problem/idempotency
T008 in-memory repository → T010 PostgreSQL repository
T012 workflow selector can proceed after T006 contracts
```

### User Story 1

```text
T015 || T016 || T017 || T018 || T019 || T020
T022 sanitizer || T024 reviewed rule catalog
T027 API client || T028 shell || T029 revision panels || T030 finding panels
```

### User Story 2

```text
T033 || T034 || T035
T038 technical forms || T039 role-boundary UI after contracts stabilize
```

### User Story 3

```text
T041 || T042 || T043 || T044
T045 fixtures || T050 attorney UI || T051 export UI
```

### User Story 4 and polish

```text
T053 || T054
T061 || T062 || T063 after all story components exist
```

## Implementation strategy

### Recommended first batch

Implement **T001–T014 only**, then validate that workflow reads are side-effect free, actors are
distinct and every snapshot contains a primary action or explicit gate. This is the smallest safe
foundation and does not yet claim SVG checking.

### MVP batch

Continue with **T015–T032**. Stop after the P1 acceptance document. At that point the current dead
end is genuinely removed through canonical SVG and deterministic checks, while review/export remain
visibly pending rather than falsely operational.

### Incremental delivery

1. T001–T014: authority and state projection.
2. T015–T032: canonical SVG + checks.
3. T033–T040: independent technical review.
4. T041–T052: attorney approval + SVG/manifest export.
5. T053–T060: complete invalidation/recovery.
6. T061–T066: accessibility, limits, evidence and convergence.

## Notes

- `[P]` tasks touch separate files or can be developed against stable contracts.
- A task may modify multiple explicitly named files when one behavior crosses an existing boundary.
- The current worktree already contains uncommitted 002 and UI changes; preserve them and avoid
  broad formatting or unrelated cleanup.
- The deterministic demo proves domain behavior, not production authentication or filing status.
