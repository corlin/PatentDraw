# Tasks: AI-assisted patent figure drafting

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contract](contracts/ai-assistance.md) and
[quickstart.md](quickstart.md)

**Strategy**: Deliver User Story 1 alone first. It proves authorised-source selection, auditable
FigurePlan proposals and safe abstention with a deterministic test double. Do not begin image
generation until that slice is accepted by a drafter and reviewer.

## Phase 1: Setup

- [X] T001 Create the TypeScript workspace and package scripts in `package.json`.
- [X] T002 Create the web/API package manifests in `apps/web/package.json` and `apps/api/package.json`.
- [X] T003 [P] Create shared contracts and fictional-fixture package manifests in `packages/contracts/package.json` and `packages/fixtures/package.json`.
- [X] T004 [P] Configure formatting, linting and TypeScript checking in `eslint.config.js`, `prettier.config.cjs` and `tsconfig.base.json`.
- [X] T005 Configure Vitest workspaces and coverage commands in `vitest.workspace.ts`.

## Phase 2: Foundational safeguards

- [X] T006 Create minimal project, authorised-source and role test fixtures plus the source-authorisation boundary in `apps/api/src/modules/projects-assets/source-authorisation.ts` and `packages/fixtures/src/project-context.ts`.
- [X] T007 Create shared FigurePlan, AI-run, source-mapping and result schemas in `packages/contracts/src/ai-assistance.ts`.
- [X] T008 Create immutable audit-event and invalidation primitives in `apps/api/src/modules/ai-assistance/audit.ts`.
- [X] T009 Create the AI provider adapter interface, enforced no-training data-use policy and deterministic test double in `apps/api/src/modules/ai-assistance/provider.ts` and `apps/api/src/modules/ai-assistance/provider-policy.ts`.
- [X] T010 Create fictional authorised-source, refusal and hallucination fixtures in `packages/fixtures/src/ai-assistance.ts`.
- [X] T011 Create base Fastify application wiring with authenticated project context in `apps/api/src/app.ts`.

**Checkpoint**: no provider request can occur without authorised source selection, recorded consent and the tested no-training data-use policy.

## Phase 3: User Story 1 — source-grounded FigurePlan (P1)

**Goal**: A drafter receives a source-mapped FigurePlan or an explicit abstention; nothing is
silently invented.

**Independent Test**: Run the grounded/unlinked/hallucinated fixtures against the deterministic
provider and inspect the result and audit record.

- [X] T012 [P] [US1] Add FigurePlan contract tests, including immutable `request_input_hash` coverage, in `tests/contract/ai-figure-plan.contract.test.ts`.
- [X] T013 [P] [US1] Add source-grounding, abstention, forbidden-assertion and no-training-policy tests in `tests/integration/ai-figure-plan.integration.test.ts`.
- [X] T014 [US1] Create AI-run and FigurePlan persistence migrations, including immutable `request_input_hash`, in `apps/api/src/modules/ai-assistance/migrations/001_ai_runs.sql`.
- [X] T015 [US1] Implement source-mapping validation and forbidden-assertion filtering in `apps/api/src/modules/ai-assistance/figure-plan-policy.ts`.
- [X] T016 [US1] Implement the FigurePlan request/propose/abstain service in `apps/api/src/modules/ai-assistance/figure-plan-service.ts`.
- [X] T017 [US1] Expose authorised FigurePlan request and result routes in `apps/api/src/modules/ai-assistance/routes.ts`.
- [X] T018 [US1] Build source selection, purpose entry and FigurePlan review UI in `apps/web/src/features/ai-figure-plan/FigurePlanPanel.tsx`.
- [X] T019 [US1] Add source mapping, open-question and abstention states to `apps/web/src/features/ai-figure-plan/FigurePlanPanel.test.tsx`.

**Checkpoint**: Demo P1 to a drafter and technical reviewer before enabling any image provider.

## Phase 4: User Story 2 — non-authoritative draft asset (P2)

**Goal**: A confirmed FigurePlan can yield a clearly labelled draft candidate that cannot bypass
the canonical SVG/review workflow.

**Independent Test**: Request a fixture draft, select it, and verify it remains ineligible for
export until a separately created canonical SVG revision exists.

- [X] T020 [P] [US2] Add generated-draft contract tests in `tests/contract/generated-draft-asset.contract.test.ts`.
- [X] T021 [P] [US2] Add draft-ineligibility and draft-to-independent-SVG-handoff integration tests in `tests/integration/generated-draft-asset.integration.test.ts`.
- [X] T022 [US2] Add confirmed-plan and draft-asset persistence in `apps/api/src/modules/ai-assistance/migrations/002_generated_draft_assets.sql`.
- [X] T023 [US2] Implement cancellable draft-job state, progress reporting, draft request policy and provider adapter gate in `apps/api/src/modules/ai-assistance/draft-asset-service.ts`.
- [X] T024 [US2] Add draft-asset request/result routes, export denial and an explicit handoff contract to an independent FigureRevision in `apps/api/src/modules/ai-assistance/routes.ts` and `packages/contracts/src/ai-assistance.ts`.
- [X] T025 [US2] Build draft selection, limitation label and handoff UI in `apps/web/src/features/ai-figure-plan/DraftAssetPanel.tsx`.

**Checkpoint**: Verify that every selected draft is still a source asset, not an export candidate.

## Phase 5: User Story 3 — audit and invalidation (P3)

**Goal**: Every AI run is inspectable, and a source/plan/revision change invalidates dependent AI
outputs and reviewer decisions without deleting history.

**Independent Test**: After T022 has created draft-asset persistence, change an authorised source,
scope or FigurePlan and verify every dependent proposal/draft invalidates; inspect the complete
audit record.

- [X] T026 [P] [US3] Add invalidation-chain and source-authorisation-revocation integration tests in `tests/integration/ai-invalidation.integration.test.ts`.
- [X] T027 [P] [US3] Add audit-view contract tests in `tests/contract/ai-audit.contract.test.ts`.
- [X] T028 [US3] Implement dependency invalidation and reviewer-decision invalidation in `apps/api/src/modules/ai-assistance/invalidation-service.ts`.
- [X] T029 [US3] Implement an authorised read-only AI audit view route in `apps/api/src/modules/ai-assistance/routes.ts`.
- [X] T030 [US3] Build the source/model/consent/limitation audit timeline in `apps/web/src/features/ai-figure-plan/AiAuditTimeline.tsx`.

## Phase 6: Pilot gate and hardening

- [ ] T031 [P] Add all six AI fixtures and expected states to `tests/fixtures/ai-assistance-fixtures.test.ts`.
- [ ] T032 Add provider retry, retention and operational failure controls in `apps/api/src/modules/ai-assistance/provider-policy.ts`.
- [ ] T033 Add request-size, source-scope and forbidden-assertion security tests in `tests/integration/ai-assistance-security.integration.test.ts`.
- [ ] T034 Run the FigurePlan-only validation in `specs/002-ai-figure-assistance/quickstart.md` and record results in `specs/002-ai-figure-assistance/pilot-evidence.md`.

## Dependencies and execution order

```text
T001–T005 → T006–T011 → US1 (T012–T019) → P1 demo gate → US2
                                                         T020/T021 → T022
                                                                       ├→ T023–T025
                                                                       └→ US3 (T026–T030)
US2 + US3 → T031–T034
```

US2 begins only after P1 is accepted. US3's draft-asset invalidation work begins only after T022;
T023–T025 and T026–T030 may then proceed in parallel. The recommended small-step scope is
**T001–T019 only**. Stop there, validate User Story 1 with fictional fixtures and a human review,
then explicitly decide whether live model access and draft-image work are warranted.

## Parallel examples

```text
After setup: T006, T007, T008, T009 and T010 can run in parallel.
Within US1: T012 and T013 can run in parallel before T014–T018.
After the P1 demo gate: T020 and T021 can run in parallel; after T022, T023 and T026/T027 can run in parallel.
```

## Format validation

All tasks use the required checkbox, sequential ID, optional parallel marker, user-story label
where applicable, and an exact file path.
