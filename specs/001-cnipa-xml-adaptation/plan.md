# Implementation Plan: CNIPA XML readiness evidence

**Branch**: `001-cnipa-xml-adaptation` | **Date**: 2026-07-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-cnipa-xml-adaptation/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Build PatentDraw as a server-authoritative modular monolith with an isolated, asynchronous
document-processing worker. The product owns drawing revisions, deterministic formality findings,
review and audit evidence; it does **not** own CNIPA XML creation or submission. The CNIPA adapter
records externally produced XML-package evidence and the official system receipt, if supplied.

The recommended implementation is TypeScript for the interactive web application and business
modules, PostgreSQL for transactional state/audit, private S3-compatible object storage for
content-addressed blobs, and a pinned Rust worker for SVG canonicalisation and raster rendering.
This is a recommended target architecture, not an implementation commitment.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x for web/API; Rust stable for document worker

**Primary Dependencies**: React editor; Fastify-class HTTP API; PostgreSQL driver/ORM; OpenID
Connect provider; Rust `usvg`/`resvg` for static-SVG parsing/rasterisation; `svg2pdf` for PDF;
libvips/Sharp-class TIFF encoder

**Storage**: PostgreSQL authoritative metadata/audit/job state; private S3-compatible object
storage for immutable originals and derived artifacts; browser OPFS only for disposable local drafts

**Testing**: TypeScript unit/integration/contract tests; Rust worker tests; malicious-upload
fixtures; deterministic hash and pixel-diff regression fixtures; manual CNIPA evidence review

**Target Platform**: modern desktop browser plus Linux container runtime for API and workers

**Project Type**: multi-tenant web application with asynchronous document-processing worker

**Performance Goals**: interaction remains responsive during canvas edits; deterministic checks
finish in under 3 seconds for a typical single sheet; expensive import/render work is cancellable
and visible as a background job

**Constraints**: untrusted SVG/PDF/TIFF never reaches the app DOM unsanitised; workers have no
network and bounded CPU/RAM/time/output; canonical artifacts are reproducible by pinned renderer,
font, rule-profile and configuration IDs; no CNIPA credentials, certificates or submission API

**Scale/Scope**: MVP collaboration within an organisation; utility figures only; 23 fixtures;
one deployable control plane and separately scalable worker pool

## Constitution Check

*Pre-research gate: PASS.*

| Principle / constraint | Architecture response | Gate |
| --- | --- | --- |
| Provenance before automation | Immutable content hashes link original, canonical SVG, rules, XML evidence, reviews and exports. | Pass |
| Safe SVG canonical master | The worker regenerates a strict allowlisted SVG grammar; original input is never previewed directly. | Pass |
| Deterministic rules and human judgment | Versioned rule packs and evidence geometry run server-side; technical/legal and XML-package judgments remain human gates. | Pass |
| Non-destructive revision/approval | Explicit revision graph invalidates dependent rule runs, XML evidence and approvals in one transaction. | Pass |
| Fixtures prove the boundary | The 23 fixtures include hostile input, raster/export and CNIPA XML-evidence cases. | Pass |
| Filing boundary | CNIPA module records evidence only; it cannot generate, transmit or call a package accepted. | Pass |

*Post-design re-check: PASS. No constitutional exception is proposed.*

## Project Structure

### Documentation (this feature)

```text
specs/001-cnipa-xml-adaptation/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
├── web/                         # React editor and reviewer workspace
└── api/                         # modular-monolith HTTP/BFF control plane
    └── src/modules/
        ├── identity-tenancy/
        ├── projects-assets/
        ├── figure-revisions/
        ├── rule-engine/
        ├── reviews-exports/
        └── cnipa-efiling-evidence/
workers/
└── document-worker/             # isolated Rust import/canonicalise/render process
packages/
├── domain-contracts/            # versioned commands/events and shared schemas
└── rule-profiles/               # effective-dated office rule packs and fixtures
infra/                           # container, storage, queue and deployment definitions
tests/
├── contract/
├── integration/
├── security-fixtures/
└── rendering-fixtures/
```

**Structure Decision**: Use one repository and one server-authoritative modular control plane.
Run the document worker as a separately deployable, least-privilege process because parsing and
rendering untrusted files is the natural isolation/scaling boundary. Do not split business modules
into network services in the MVP.

## Complexity Tracking

No constitutional violation or complexity exception.
