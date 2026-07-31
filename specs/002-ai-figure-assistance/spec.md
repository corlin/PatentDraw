# Feature Specification: AI-assisted patent figure drafting

**Feature Branch**: `002-ai-figure-assistance`
**Created**: 2026-07-31
**Status**: Draft
**Input**: User description: "Integrate AI text-to-image capability safely into the patent-figure workflow."

**Policy basis**: AI output is source-linked drafting assistance, not technical, legal or filing
authority. The specification adopts model provenance and human-oversight controls consistent with
the [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirm a source-grounded figure plan (Priority: P1)

A patent drafter selects authorised source material and a stated figure purpose, then receives an
AI proposal identifying candidate views, components, reference signs and open questions with links
back to those sources.

**Why this priority**: A structured plan reduces drafting effort while making unsupported content
visible before any image is generated.

**Independent Test**: Use a fictional source pack and confirm that every accepted FigurePlan
element has a source reference, while an unlinked component requires manual review.

**Acceptance Scenarios**:

1. **Given** authorised source material and a stated section-view purpose, **When** the drafter requests a plan, **Then** each proposed view, component and reference sign is linked to selected source material or identified as an open question.
2. **Given** no source supports a proposed component, **When** the proposal is shown, **Then** it is marked `manual-review-required` rather than presented as fact.

---

### User Story 2 - Use an AI draft without treating it as a final drawing (Priority: P2)

A drafter requests a line-art draft from a confirmed FigurePlan, chooses or rejects it, and creates
an editable figure revision only through the normal drafting workflow.

**Why this priority**: It captures image-generation value without allowing an opaque image to
bypass SVG safety, formality checks or expert review.

**Independent Test**: Generate a fictional draft, select it, then verify that it remains a
non-authoritative draft asset until the drafter creates a separate canonical SVG revision.

**Acceptance Scenarios**:

1. **Given** a confirmed FigurePlan, **When** a drafter requests a line-art draft, **Then** the output shows its source links and limitations and is labelled as a draft.
2. **Given** a selected AI draft, **When** the drafter begins formal editing, **Then** the system creates a separately attributable revision and requires normal rule runs and reviews.

---

### User Story 3 - Audit, abstain and invalidate assistance safely (Priority: P3)

An attorney/agent or administrator can inspect why an AI suggestion was made, see its source and
model provenance, and confirm that changed source material invalidates dependent assistance.

**Why this priority**: Confidential pre-filing material and review decisions require a reliable
audit trail and a safe response to uncertainty.

**Independent Test**: Change a linked source or FigurePlan and verify that the AI mapping is
invalidated; submit a request lacking authority or source support and verify abstention.

**Acceptance Scenarios**:

1. **Given** a source or allowed scope change, **When** the project is saved, **Then** linked AI proposals/drafts are invalidated and require renewed review.
2. **Given** a request with no authorised source or no supportable mapping, **When** AI assistance is requested, **Then** the result is `abstained` or `manual-review-required` and no content is invented.

### Edge Cases

- A model refuses a request: the user sees the refusal and can continue with manual drafting.
- A model suggests a component that conflicts with a selected source: it is not promoted to the FigurePlan and is recorded for review.
- A source later loses authorisation: its dependent AI outputs cannot be reused until an authorised replacement is selected.
- A user requests an assertion that a drawing is legally sufficient or filing-ready: the request is rejected and directed to the human-review workflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require an authorised source selection and stated figure purpose before an AI proposal or draft request.
- **FR-002**: The system MUST provide source-linked FigurePlan proposals that identify candidate views, components, reference signs, open questions and limitations.
- **FR-003**: The system MUST mark unsupported, contradictory or unmapped proposed content as `abstained` or `manual-review-required`; it MUST NOT silently complete it.
- **FR-004**: The system MUST label every AI image as a non-authoritative draft and require a drafter to create a separate canonical SVG revision before normal checks, review or export.
- **FR-005**: The system MUST record model/provider/version, instruction version, selected-source hashes, consent state, output hashes, source mapping, actor, timestamp and limitations for every AI run.
- **FR-006**: The system MUST invalidate AI mappings and affected reviewer decisions when a selected source, FigurePlan, allowed scope or linked revision changes.
- **FR-007**: The system MUST prohibit AI outputs from asserting technical correctness, claim coverage, legal sufficiency, rule pass, filing readiness, submission or office acceptance.
- **FR-008**: The system MUST require recorded authorisation before customer materials are used for an AI request and MUST not use them for training without recorded customer authorisation.

### Key Entities *(include if feature involves data)*

- **AI run**: The immutable record of one source-bounded assistance request and response.
- **Source mapping**: The association between each AI-proposed element and selected project source supporting it.
- **Generated draft asset**: A non-authoritative image candidate linked to an AI run and confirmed FigurePlan.
- **AI limitation state**: The status explaining whether the system supplied a proposal, abstained, refused or requires manual review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all six AI fixtures, 100% of proposals preserve the required provenance fields and no output bypasses a human or deterministic approval gate.
- **SC-002**: 100% of intentionally unsupported or contradictory fixture elements are labelled `abstained` or `manual-review-required`, never represented as source fact.
- **SC-003**: 100% of selected-source, FigurePlan or linked-revision changes invalidate dependent AI mappings in the regression suite.
- **SC-004**: In the supervised pilot, drafters complete the approved FigurePlan stage at least 20% faster than a manual baseline without an increase in reviewer-rejected unsupported components.

## Assumptions

- AI assistance is opt-in per request and receives only the project sources selected by the user.
- The first release supports plan proposals and line-art draft candidates, not automatic creation of a final filing figure.
- A drafter, technical reviewer and attorney/agent retain their existing separate decisions.
