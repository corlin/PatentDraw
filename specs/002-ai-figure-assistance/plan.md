# Implementation Plan: AI-assisted patent figure drafting

**Branch**: `002-ai-figure-assistance` | **Date**: 2026-07-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ai-figure-assistance/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Introduce AI as a source-bounded drafting assistant. The first increment produces an auditable,
source-linked FigurePlan and safe abstentions. The second increment adds non-authoritative line-art
draft assets. Neither increment creates a final SVG, formality pass, approval or filing assertion.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js LTS

**Primary Dependencies**: React/Vite web UI; Fastify HTTP API; PostgreSQL; JSON Schema contracts;
provider adapter with a deterministic test double; image-provider adapter only in User Story 2

**Storage**: PostgreSQL for authoritative state/audit; private object storage for source and draft
artifacts; object hashes stored with every linkage

**Testing**: Vitest unit tests, API integration tests, contract tests and six fictional AI fixtures

**Target Platform**: modern desktop browser and Linux container runtime

**Project Type**: web application with a server-authoritative modular API

**Performance Goals**: local FigurePlan validation under 1 second. P1 uses only a deterministic,
short-running test double; before any real provider/draft job is enabled in P2, jobs must be
cancellable, surface progress and never block editing.

**Constraints**: selected-source allowlist; a provider data-use policy that defaults to no training
without recorded authorisation; provider/model/instruction/source/output provenance; AI abstention
on unmapped content; no client-side model credentials; no automatic canonical SVG or approval;
source, plan or revision edit invalidates dependent AI results

**Scale/Scope**: one organisation-level pilot; P1 FigurePlan vertical slice first; P2 draft-image
candidate second; P3 audit/invalidation hardening third

## Constitution Check

*Pre- and post-design gate: PASS.*

| Principle | Design response |
| --- | --- |
| Provenance before automation | `AiRun`, source mappings and draft assets are immutable, hash-linked audit objects. |
| Safe canonical SVG | AI output cannot become a canonical SVG; only normal revision workflow can create one. |
| Deterministic rules/human judgment | Source mapping is checked deterministically; unsupported content abstains; reviewers retain decisions. |
| Non-destructive approvals | Source/plan/revision changes invalidate dependent AI results and decisions. |
| Fixtures prove boundary | Six AI fixtures exercise grounding, refusal, hallucination and invalidation. |
| AI constrained drafting | Provider access is server-side and opt-in; enforced no-training policy and tests precede any real provider. |

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-figure-assistance/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
```text
apps/
├── web/src/features/ai-figure-plan/      # request/review UI
└── api/src/modules/
    ├── projects-assets/                  # authorised source selection
    ├── figure-plans/                     # approved plan lifecycle
    └── ai-assistance/                    # provider adapter, provenance, policy gate
packages/
├── contracts/                            # shared command/result schemas
└── fixtures/                             # fictional source and AI response fixtures
tests/
├── contract/
├── integration/
└── fixtures/
```

**Structure Decision**: Keep the AI module in the API modular monolith. It owns no final drawing
or approval state; it invokes a provider adapter asynchronously and records bounded results.

## Complexity Tracking

No constitutional exception. A single provider adapter and deterministic test double are used
instead of multi-provider routing, agent orchestration, vector auto-finalisation or CRDT editing.
