# Implementation Plan: SVG review and export workflow

**Branch**: `003-svg-review-export` | **Date**: 2026-08-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-svg-review-export/spec.md`

## Summary

Close the operational gap after AI draft handoff with a server-authoritative workflow for real
canonical SVG revisions, deterministic rule runs, independent technical and attorney/agent
decisions, append-only invalidation and an SVG-plus-manifest export package. Keep this lifecycle in
a new `svg-review-export` bounded context; the AI module remains an upstream producer of optional,
non-authoritative references. The web client renders a server-provided workflow snapshot and
role-appropriate next actions instead of inferring gates from local booleans.

## Technical Context

**Language/Version**: TypeScript 5.9 in strict mode; Node.js 24 development runtime

**Primary Dependencies**: React 19 and Vite 7 for the web client; Fastify 5 and TypeBox JSON
schemas for server and shared contracts; PostgreSQL through `pg`; `@xmldom/xmldom` for parsing
untrusted SVG into a DOM that is then rebuilt through an explicit safe allowlist; Node cryptography
for content hashes and canonical manifest hashes

**Storage**: PostgreSQL for authoritative metadata, current-revision pointers, rule runs,
decisions, invalidations and export indexes; existing private content-addressed object storage for
sanitized SVG, manifests and completed packages; in-memory adapters only for deterministic tests

**Testing**: Vitest unit, contract, integration and fixture suites with V8 coverage; React
server-rendered component assertions for stable states; one supervised browser workflow retained in
`quickstart.md`

**Target Platform**: Modern desktop browsers and a Linux-compatible Node server runtime; the local
deterministic composition remains non-production

**Project Type**: pnpm TypeScript monorepo containing a React web application, Fastify modular
monolith, shared contracts and fictional fixtures

**Performance Goals**: For an SVG up to 5 MiB and 10,000 elements, sanitization and the initial
deterministic rule pack each complete within 2 seconds at p95 in the pilot environment; workflow
snapshot reads complete within 500 ms at p95; users receive an immediate pending state for longer
operations; completed SVG-plus-manifest packaging finishes within 3 seconds at p95

**Constraints**: Maximum 5 MiB input, 10,000 SVG elements, 128 nesting levels and 50,000 total
attributes; secure-static SVG only; explicit element, attribute and URL allowlists; no DTD,
entities, scripts, event attributes, animation, external references, `foreignObject`, filter graphs
or raster payloads in the canonical master; immutable revisions and decisions; three distinct actor
identities; compare-and-swap freshness checks on every review/export mutation; no filing-readiness
claim

**Scale/Scope**: One supervised pilot organisation; up to 20 figures per project, 100 revisions per
figure, 100 findings per rule run and 100 historical export packages per project. The first export
increment contains sanitized SVG plus a JSON audit manifest only.

## Constitution Check

*Pre-design gate: PASS. Post-design gate: PASS.*

| Principle | Design response |
| --- | --- |
| I. Provenance before automation | Revisions, runs, findings, decisions, invalidations and packages are append-only, actor/time stamped and hash-linked to their exact inputs. Original input and sanitized SVG are distinct objects. |
| II. SVG is a safe canonical master | The server parses SVG, rejects unsafe constructs and rebuilds an allowlisted secure-static document with explicit `viewBox` and millimetre sheet dimensions before hashing or storing it as canonical. |
| III. Deterministic rules, explicit judgment | A reviewed rule catalog emits only the four permitted outcomes with official-source metadata and rendered evidence. Judgment-only questions require a named technical disposition. |
| IV. Revision and approval are non-destructive | Material changes append a successor revision and invalidation record. Technical reviewer and attorney/agent are distinct actors; stale or self-approval attempts are denied and audited. |
| V. Fixtures prove the product boundary | Safety, rule, role, staleness, hash, CNIPA-boundary and complex-sectional fixtures precede UI claims. The pump figure remains a review fixture, not proof of mechanical correctness. |
| VI. AI is constrained assistance | AI output remains an upstream draft reference. The canonical SVG store is owned by this module and AI handoff receives only a lookup port; no AI output creates a rule result, decision or export. |
| Scope and safety | Only utility-figure PCT/USPTO and CNIPA profiles are supported. SVG and manifest are internal reviewed assets; XML generation, submission and acceptance claims remain excluded. |
| Development workflow | This feature proceeds through specify, clarify, plan, tasks, analyze, implement and converge. No constitutional exception is requested. |

## Project Structure

### Documentation (this feature)

```text
specs/003-svg-review-export/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── workflow-api.md
│   ├── ui-state-actions.md
│   └── export-manifest.schema.json
└── tasks.md                  # generated by $speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── api/src/
│   ├── modules/svg-review-export/
│   │   ├── repository.ts
│   │   ├── revision-service.ts
│   │   ├── svg-sanitizer.ts
│   │   ├── rule-profile-catalog.ts
│   │   ├── rule-service.ts
│   │   ├── workflow-state.ts
│   │   ├── review-service.ts
│   │   ├── invalidation-service.ts
│   │   ├── workflow-audit.ts
│   │   ├── export-service.ts
│   │   ├── routes.ts
│   │   └── migrations/004_svg_review_export.sql
│   └── infrastructure/
│       └── postgres-svg-workflow-repository.ts
└── web/src/features/
    ├── workflow/
    │   ├── WorkflowShell.tsx
    │   ├── WorkflowRail.tsx
    │   ├── NextActionCard.tsx
    │   ├── GateChecklist.tsx
    │   ├── InvalidationBanner.tsx
    │   └── workflow-api-client.ts
    ├── svg-revision/
    │   ├── SvgRevisionPanel.tsx
    │   ├── SvgImportDialog.tsx
    │   └── SanitizationReport.tsx
    ├── rule-checks/
    │   ├── RuleRunPanel.tsx
    │   ├── FindingList.tsx
    │   └── FindingOverlay.tsx
    ├── reviews/
    │   ├── TechnicalReviewPanel.tsx
    │   └── AttorneyApprovalPanel.tsx
    └── export/
        ├── ExportGatePanel.tsx
        ├── ManifestPreview.tsx
        └── ExportHistory.tsx
packages/
├── contracts/src/svg-review-export.ts
└── fixtures/src/svg-review-export.ts
tests/
├── contract/svg-review-export.contract.test.ts
├── fixtures/svg-review-export-fixtures.test.ts
└── integration/
    ├── svg-revision.integration.test.ts
    ├── rule-run.integration.test.ts
    ├── review-approval.integration.test.ts
    ├── workflow-invalidation.integration.test.ts
    └── svg-export.integration.test.ts
```

**Structure Decision**: Add one authoritative bounded context to the existing API modular
monolith. Extract canonical-revision ownership from `ai-assistance` into a narrow repository port
shared only by explicit composition. Keep the rule catalog module-local for this slice; do not add
a new workspace package or generic workflow framework. The web root becomes composition only and
all workflow eligibility comes from a typed server snapshot.

## Design Sequence

1. Repair the upstream workflow bridge: initial page load becomes read-only; unresolved FigurePlan
   rows and draft select/reject/cancel/retry states receive explicit actions.
2. Establish contracts, the canonical revision store, SVG sanitizer/canonicalizer and server-driven
   workflow snapshot.
3. Add the smallest reviewed deterministic profile and evidence-bearing rule runs; connect the
   dynamic findings panel and revision recovery loop.
4. Add distinct technical and attorney/agent decisions with freshness and role gates.
5. Add atomic SVG-plus-manifest export, CNIPA evidence labels, append-only supersession and
   cross-stage invalidation.
6. Complete fixture, contract, integration, accessibility and supervised browser validation before
   any full-workflow claim.

## Complexity Tracking

No constitutional exception. The design intentionally rejects a generic state-machine framework,
event-sourcing platform, AI-owned revision store, client-authoritative gating and PDF/raster/XML
generation for this increment.
