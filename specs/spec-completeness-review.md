# PatentDraw spec completeness review

**Review decision:** is the current specification ready to drive implementation?
**Verdict:** it is **strong enough for product direction and solution architecture**, but **not yet executable as an engineering delivery specification**. Treat it as a discovery baseline, then close the P0 gaps below before committing to a full workbench build.

## Session summary

1. Publicly mapped `patentfig.ai/tools` and its route taxonomy: filing task, source material, figure type, industry, workspace/comparison, utilities and references.
2. Verified public unauthenticated surfaces: generator demo, figure checker, vectorizer and DPI enhancer. The public generator showed a read-only, versioned multi-figure project; logged-out work is gated.
3. Used PCT Rule 11 plus public USPTO/EPO sources as cited formality baseline; explicitly separated deterministic checks from AI heuristics and human legal/technical judgement.
4. Produced the replica product specification, a risk/return decision memo, and a production model for complex sectional drawings.
5. Generated four fictional visual test specimens: monitor multi-view set, sensor-front-end diagram, folding hinge figure set, and a dense rotary-valve-actuator section. They demonstrate composition capability only; none is validated as a submission-ready figure.

## Completeness by dimension

| Dimension | Assessment | Evidence / gap |
| --- | --- | --- |
| Product boundary and non-goals | Strong | The workbench outcome, review-first position and no-acceptance-guarantee guardrails are explicit. |
| Information architecture and workflows | Strong | Public acquisition plus authenticated workbench; four key flows are defined. |
| Domain/examiner perspective | Strong | Mechanical, electrical, software, medical, biotech/chemical, semiconductor and design packs are present. |
| Data model and traceability | Good | Core objects and lifecycle are defined, but relational schema, retention states and immutable-event semantics are not. |
| Formal-rule model | Good direction, incomplete execution | Requires versioned profiles/evidence, but lacks a jurisdiction-by-jurisdiction rule matrix and machine-readable predicates. |
| AI/generation design | Incomplete | Structured controls and revision lineage exist, but no model contract, quality protocol, prompt/schema, fallback policy or cost budget. |
| Editor and layout mechanics | Incomplete | Desired canvas features are named, but no interaction states, geometry model, vector editing limits, leader-routing algorithm or UI acceptance criteria. |
| Security and governance | Good requirements, incomplete design | Important controls are enumerated; tenant model, threat model, key management, audit access and deletion implementation are absent. |
| API / integration | Incomplete | The product should be API-first but endpoints, auth scopes, idempotency, webhooks, import/export schemas and rate limits are missing. |
| Validation and rollout | Good gates, incomplete test plan | Acceptance gates exist; no test-fixture catalogue, reference outputs, ownership, CI rules or pilot protocol. |
| Economics and commercial policy | Directional only | Risk memo states the unknowns; pricing, entitlement, usage metering, support model and margin targets remain open. |

## P0 gaps that block implementation commitment

1. **MVP jurisdiction decision and rule catalogue.** Select PCT plus exactly one office/application type; for each rule define source, effective date, input field, deterministic predicate or human-review policy, severity, evidence geometry and regression fixture.
2. **Submission-safe architecture.** Specify authoritative source formats, SVG/PDF/TIFF conversion path, geometric coordinate system, rasterization/reduction test, font policy, editable-master preservation and export reproducibility.
3. **Concrete role and permission model.** Define inventor, drafter, attorney/agent, technical reviewer, administrator and external illustrator actions; add project sharing, evidence visibility, signature/approval revocation and retention/deletion states.
4. **Generation and review contract.** Specify input schema, required user confirmations, model/tool version recording, queue/cancellation/retry, abstention criteria, image-to-vector handling, output confidence, human escalation and credit/cost accounting.
5. **Interaction-level MVP.** Wireframe and state-machine the project dashboard, figure-plan editor, canvas, finding panel, review queue, export wizard and error/recovery cases.
6. **Fixture-led test plan.** Acquire authorised/deidentified examples for good, bad and ambiguous cases, including a dense sectional drawing. Establish expected results before implementing detection.

## P1 gaps to close before an enterprise launch

- regional data processing / subprocessor and key-management design;
- SCIM/SAML, audit export, DPA/NDA workflow and policy administration;
- full API contract and integration sandbox;
- office-rule change-management owner, cadence and regression approval;
- support/SLA, incident response, observability, accessibility and localisation acceptance;
- billing entitlement, quota, refund and model-cost controls.

## Recommendation

Do **not** start with the entire competitor-like route catalogue. Start with a utility-drawing PCT-plus-one-office workflow: import → figure plan → manually editable vector/raster revision → numeral registry → deterministic formality checks → signed export manifest. The complex-section sample should become a fixture for annotation-routing and cross-hatch layout, not a promise that generative output is mechanically correct.

The smallest next deliverable is a **MVP rule and interaction package**: (1) jurisdiction rule matrix, (2) canonical data/API schema, (3) six-screen interaction spec, and (4) fifteen-fixture acceptance suite. Completion of those four items would raise the specification from discovery-ready to build-ready.
