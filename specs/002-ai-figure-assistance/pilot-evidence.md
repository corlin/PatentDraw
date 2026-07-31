# FigurePlan-only pilot evidence

**Recorded**: 2026-07-31
**Scope**: local, deterministic, fictional-fixture FigurePlan demonstration only

## Human demonstration result

The project user confirmed that the front-end manual demonstration passed. The observed screen
showed one selected authorised fictional source, a stated Chinese figure purpose, and a proposed
FigurePlan with mappings for the sectional view, two components and two reference signs. It also
showed the non-authoritative draft label, `export eligible: false`, and an independent FigureRevision
handoff identifier.

## Reproducible automated evidence

`pnpm test --run` completed with 34 passing tests on 2026-07-31. The relevant checks cover:

- grounded FigurePlan proposal, provider refusal and unmapped-content manual review;
- immutable request-input provenance and source mappings;
- non-authoritative draft selection and independent-SVG handoff without export eligibility;
- source-authorisation revocation, AI-run/reviewer-decision invalidation and authorised audit reads;
- six fixture expected states, bounded retry/retention controls, request-size/source-scope limits,
  and forbidden-assertion filtering.

## Quickstart conclusions

The FigurePlan-only acceptance criteria are demonstrated for fictional data: the proposal is
source-mapped, unsupported content requires manual review, and the visible result makes no final
SVG, approval or filing assertion.

## Limitations and next gate

This is not a production or supervised efficiency pilot. No customer material, real image provider,
provider credential, persistent database, live reviewer identity, or timing baseline was used.
Consequently it does not establish SC-004, filing readiness, technical correctness, or legal
sufficiency. Any real-provider pilot requires separately recorded authority, retention terms,
provider approval, baseline timing and reviewer-rejection measurement.
