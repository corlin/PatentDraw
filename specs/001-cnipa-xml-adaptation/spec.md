# Feature Specification: CNIPA XML readiness evidence

**Feature Branch**: `001-cnipa-xml-adaptation`
**Created**: 2026-07-31
**Status**: Draft
**Input**: User description: "Update the specification for CNIPA 2026 drawing and XML electronic-filing conclusions."

**Policy basis**: From 2026-01-01, CNIPA requires XML for electronic patent files and no
longer accepts non-XML electronic files; the mandatory list includes description drawings.
[Official notice](https://www.cnipa.gov.cn/art/2025/11/12/art_75_202551.html)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identify a route requiring XML evidence (Priority: P1)

An attorney or agent records a CNIPA filing route for a utility-figure project and sees that
external XML-package evidence is required before its drawings can enter electronic-filing review.

**Why this priority**: It prevents an editable SVG or raster candidate from being mistaken for
an electronic filing package on routes where CNIPA requires XML.

**Independent Test**: Declare a CNIPA electronic route without XML
evidence and verify that the export is marked for manual review, not electronic submission.

**Acceptance Scenarios**:

1. **Given** a CNIPA project intended for electronic filing on or after 2026-01-01, **When** no XML evidence has been recorded, **Then** the project displays `manual-review-required` and each export states `not-CNIPA-electronic-submission-ready`.
2. **Given** a non-CNIPA project, **When** a user exports a drawing, **Then** CNIPA XML policy does not change its result.

---

### User Story 2 - Preserve externally produced XML evidence (Priority: P2)

An attorney or agent records evidence for an XML package made by an external filing tool, so the
reviewer can assess its provenance without the product claiming that it created or submitted it.

**Why this priority**: Traceability is required before the electronic-readiness status can be
reviewed safely.

**Independent Test**: Attach metadata for an external XML package and verify that all required
evidence fields appear in the audit manifest.

**Acceptance Scenarios**:

1. **Given** a declared CNIPA route and an external XML package, **When** the user records its hash, tool/version, preview/proofread attestation and reviewer, **Then** the audit manifest links that evidence to the declared route.
2. **Given** a record that lacks a proofread attestation, **When** its readiness is assessed, **Then** the result remains `manual-review-required`.

---

### User Story 3 - Distinguish evidence from a filing event (Priority: P3)

An attorney or agent records a complete external XML package without having the product claim
that the package was submitted or accepted by CNIPA.

**Why this priority**: It prevents evidence of a locally prepared package from being confused
with the filing event recorded by the official system.

**Independent Test**: Record complete XML evidence without an official receipt and verify that
the manifest does not claim submission or acceptance.

**Acceptance Scenario**:

1. **Given** complete external XML evidence without an official-system receipt, **When** readiness is assessed, **Then** the product reports `CNIPA-XML-evidence-recorded` and does not assert submission, receipt or acceptance.

### Edge Cases

- An XML package is supplied but belongs to a different figure revision or declared route: it cannot support readiness for the current export.
- A figure changes after XML evidence is recorded: the readiness record is invalidated pending renewed external-package review.
- A user selects a route outside the listed policy routes: the product records the route but requires manual policy confirmation rather than guessing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an authorised user record the CNIPA application date and intended filing route.
- **FR-002**: The system MUST require XML-package evidence for every CNIPA electronic-filing workflow from 2026-01-01 onward.
- **FR-003**: The system MUST treat description drawings as included in the CNIPA mandatory XML-file scope and must not present SVG/PDF/PNG/TIFF as a substitute.
- **FR-004**: The system MUST retain external XML-package evidence with its declared route, package hash, converter/tool version, standard version, preview/proofread attestation, timestamp and named reviewer.
- **FR-005**: The system MUST mark an export `not-CNIPA-electronic-submission-ready` when required XML evidence is absent, incomplete, mismatched or unapproved.
- **FR-006**: The system MUST invalidate related electronic-readiness evidence when its linked figure revision, drawing content, declared route or application date changes.
- **FR-007**: The system MUST keep `CNIPA-FIG-001` through `CNIPA-FIG-009` unchanged and separately identify the XML readiness overlay as electronic-filing policy rather than drawing-formality law.
- **FR-008**: The system MUST not generate XML, transmit an application, or claim CNIPA acceptance.

### Key Entities *(include if feature involves data)*

- **CNIPA filing route**: The declared CNIPA submission context and application date against which current XML policy is assessed.
- **CNIPA e-filing evidence**: An auditable record of an externally produced XML package and the human confirmations needed to review it.
- **Electronic-readiness result**: A route- and revision-specific state that communicates whether further manual review is required, without predicting office acceptance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the four CNIPA XML policy fixtures, 100% produce the prescribed readiness state and no fixture produces an office-acceptance claim.
- **SC-002**: 100% of complete external XML-evidence records expose all seven required provenance fields in their audit manifest.
- **SC-003**: A reviewer can identify the route, policy source, linked revision and any missing evidence from an export manifest in under two minutes.
- **SC-004**: Any linked revision or route change invalidates the prior readiness result in 100% of regression fixtures.

## Assumptions

- The MVP continues to use SVG as an editable master and relies on an external CNIPA-compatible filing tool for XML creation.
- The MVP does not create, upload or submit XML; it records evidence created in an official or authorised external workflow.
- Current official policy sources and their effective dates are stored with the readiness rule profile and reviewed before release.
