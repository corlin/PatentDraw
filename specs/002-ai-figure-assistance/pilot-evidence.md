# FigurePlan-only pilot evidence

**Recorded**: 2026-07-31
**Scope**: local, deterministic, fictional-fixture FigurePlan/draft/audit demonstration

## Human demonstration result

The project user confirmed that the front-end manual demonstration passed. The observed screen
showed one selected authorised fictional source, a stated Chinese figure purpose, and a proposed
FigurePlan with mappings for the sectional view, two components and two reference signs. It also
showed the non-authoritative draft label, `export eligible: false`, and an independent FigureRevision
handoff identifier.

## Reproducible automated evidence

`pnpm test` and `pnpm test:coverage` completed with 50 passing tests on 2026-07-31.
The enforced V8 coverage result for the scoped AI modules, project-source boundary and UI
components was 87.77% statements/lines, 69.28% branches and 94.38% functions. The checks cover:

- grounded FigurePlan proposal, provider refusal and unmapped-content manual review;
- immutable request-input provenance and source mappings;
- non-authoritative draft selection and independent-SVG handoff without export eligibility;
- source-authorisation revocation, AI-run/reviewer-decision invalidation and authorised audit reads;
- six end-to-end fixture states with full provenance: grounding, refusal, abstention,
  contradiction, forbidden assertion and post-edit invalidation;
- bounded provider retry, persisted retention expiry, private blob expiry,
  request-size/source-scope limits and forbidden-assertion filtering;
- queued/running/ready/cancelled draft jobs, progress/result routes and a persisted canonical-SVG
  handoff that never makes the generated draft exportable;
- the browser-to-API path for FigurePlan, asynchronous draft, selection, cancellation, handoff and
  audit refresh through the Vite development proxy, including explicit human plan confirmation;
- encrypted-at-rest local private objects and append-only privileged audit-read records;
- source, allowed-scope, FigurePlan and linked-revision dependency hooks with transactional
  dependency resolution in the PostgreSQL adapter.

## Quickstart conclusions

The FigurePlan-only acceptance criteria are demonstrated for fictional data: the proposal is
source-mapped, unsupported content requires manual review, and the visible result makes no final
SVG, approval or filing assertion.

## Limitations and next gate

This is not a production or supervised efficiency pilot. No customer material, real image provider,
provider credential, live PostgreSQL instance, production object store, live reviewer identity, or
timing baseline was used. PostgreSQL and private object-storage adapters are implemented and
typechecked, but their deployment integration remains an environment/release concern.
Consequently it does not establish SC-004, filing readiness, technical correctness, or legal
sufficiency. Any real-provider pilot requires separately recorded authority, retention terms,
provider approval, baseline timing and reviewer-rejection measurement.

## SC-004 supervised-pilot protocol

1. Recruit at least two qualified patent drafters and one independent technical reviewer.
2. Prepare at least ten fictional or explicitly authorised figure-planning cases, stratified by
   mechanical, electrical/electronic and software/process subject matter.
3. Randomly assign each drafter five manual-baseline cases and five AI-assisted cases, then
   cross over the assignment so every case is measured once in each condition.
4. Start timing when the authorised source pack is available and stop when the drafter submits an
   approved FigurePlan for reviewer inspection. Exclude tool outages and record exclusions.
5. The reviewer, blinded to condition where practical, records unsupported-component rejections
   using the same rubric for both conditions.
6. Compute median completion time by condition and the unsupported-component rejection rate.
   SC-004 passes only if median assisted time is at least 20% lower and the rejection rate does not
   increase. Preserve anonymised case-level timings, exclusions and reviewer decisions.

**Current SC-004 result**: not measured; supervised pilot required.
