<!--
Sync Impact Report
Version change: 1.1.1 → 1.2.0
Modified principles: V. Fixtures Prove the Product Boundary expanded for AI evaluation.
Added sections: VI. AI Is a Constrained Drafting Assistant.
Removed sections: none.
Follow-up TODOs: verify CNIPA XML package/data-standard conformance in a real filing channel
before implementing XML generation or electronic submission.
-->
# PatentDraw Constitution

## Core Principles

### I. Provenance Before Automation

Every source asset, generated derivative, human edit, rule run, review decision and
export MUST have immutable identifiers, content hashes, actor and timestamp. The
original source MUST remain recoverable and MUST NOT be silently replaced. This
provenance is necessary because a patent figure is reviewed against its disclosure,
not merely for visual plausibility.

### II. SVG Is a Safe, Canonical Master

Each editable figure revision MUST own a sanitized canonical SVG whose `viewBox`,
physical sheet size and grouped drawing semantics are explicit. SVG import MUST reject
active code, event handlers, external resources, unsupported foreign content and other
unsafe dependencies. Export copies MAY flatten or outline text only as an audited,
non-destructive derivative; the editable SVG master MUST be retained.

### III. Deterministic Rules, Explicit Human Judgment

Each automated formality finding MUST name its office profile, effective date, official source,
rule ID, input, predicate, severity and rendered evidence. The system MUST return
`manual-review-required`, rather than a pass, for claim correspondence, technical
correctness, indispensability of drawing text, filing strategy or any judgement it
cannot determine. No screen, export or API response may promise filing acceptance,
legal sufficiency or patentability.

### IV. Revision and Approval Are Non-Destructive

Every material edit MUST create or update a revision with a visible parent/source
relationship. Changes to geometry, labels, numerals, sheet layout or export settings
MUST invalidate dependent rule runs and approvals. A technical reviewer and an
attorney/agent approver MUST be separately identifiable; an inventor or contributor
MUST NOT self-approve an export candidate.

### V. Fixtures Prove the Product Boundary

Implementation MUST begin with authorised or fictional fixtures covering clean input,
unsafe SVG, deterministic formal defects and ambiguous figures. A test that cannot
identify a rule, fixture and expected outcome does not prove compliance. Complex
sectional drawings MUST be treated as layout and review fixtures, not as evidence that
image generation produces mechanically correct designs. AI fixtures MUST additionally test
source grounding, refusal/abstention, forbidden assertions and invalidation after an edit.

### VI. AI Is a Constrained Drafting Assistant

AI MAY propose a source-linked figure plan, a candidate annotation or a non-authoritative draft
asset only after the user has authorised the source use. Every AI run MUST retain the model and
version, input/source hashes, instruction version, output hashes, actor/time, consent state and
applicable limitations. AI output MUST NOT become a canonical SVG, a rule pass, a review decision
or a filing assertion without the independently required human and deterministic workflow gates.
The system MUST abstain or require manual review when a proposal cannot be grounded in identified
source material. Customer content MUST NOT be used for training without recorded authorisation.

## Scope and Safety Constraints

The initial product scope is utility patent figures under a PCT Rule 11 baseline, a USPTO
utility profile and a CNIPA invention/utility-model profile. SVG is an editable and auditable
master/export format; it MUST NOT be labelled as an automatically USPTO-ready or
CNIPA-ready submission format. Validated PDF, PNG and TIFF candidates remain separate export
paths. Every CNIPA drawing profile and CNIPA electronic-filing readiness state MUST cite its
official source and effective date.

The initial product excludes design, plant, trademark and multi-jurisdiction profiles;
autonomous final-figure generation or approval; CAD-native solid modelling; netlist, clinical or
chemical correctness; office filing submission; legal advice; enterprise SSO/SCIM;
public API; batch conversion; and payments. Any excluded capability requires a separate
specification, rule pack, fixture set and supervised-pilot evidence before release.

Customer invention materials MUST be treated as confidential. The system MUST enforce
tenant/project access boundaries, encrypt data in transit and at rest, log privileged
access, preserve deletion/retention state, and never use customer content for model
training without explicit, recorded customer authorization.

## Development and Quality Workflow

Work MUST proceed through `specify → clarify → plan → tasks → analyze → implement →
converge` for material features. A feature specification MUST identify its rule profile,
data/provenance changes, SVG safety impact, reviewer boundary, fixtures and export
effects before planning starts.

Before merge or release, changes MUST pass relevant unit, integration and fixture tests;
an SVG safety test when import/render/export changes; deterministic rendering/hash tests
when canonical SVG changes; and a manual review of new rule profiles. Production release
requires an auditable export manifest and a supervised pilot outcome demonstrating no
increase in material source-to-figure or numeral-to-description discrepancies.

## Governance

This constitution supersedes conflicting local practices and templates. Every feature
specification, plan, task list, implementation review and release decision MUST record
any constitutional exception and its named approver. Amendments require a written
change, impact assessment for existing rule profiles and exports, and semantic versioning:
MAJOR for removed or incompatible principles, MINOR for new or materially expanded
principles, and PATCH for clarifications that preserve meaning. Compliance is reviewed
during `speckit-analyze` and `speckit-converge`; unresolved conflicts block release.

**Version**: 1.2.0 | **Ratified**: 2026-07-31 | **Last Amended**: 2026-07-31
