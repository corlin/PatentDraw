# Research: SVG review and export workflow

## Decision 1 — Use a separate authoritative workflow module

**Decision**: Add `svg-review-export` beside `ai-assistance`. It owns canonical revisions, rule
runs, human decisions, invalidation and export. AI receives only a lookup for an independently
persisted canonical revision.

**Rationale**: Rules, review and export are sources of authority; the constitution expressly
prohibits AI from owning them. The current AI repository's small revision record is a handoff
fixture, not an adequate authoritative lifecycle.

**Alternatives considered**: Expanding `ai-assistance` would blur the authority boundary. A new
microservice would introduce deployment and transaction complexity without pilot-scale benefit.

## Decision 2 — Server-authoritative derived workflow state

**Decision**: Derive a `WorkflowSnapshot` from the current revision pointer, newest valid rule run,
current decisions, invalidations and packages. The snapshot returns `state`, `primaryAction`,
`allowedActions`, `blockingGates` and `expectedVersion`.

**Rationale**: The current dead end was created by client booleans and hard-coded locked stages.
One server projection keeps authorization, freshness and UI actions consistent.

**Alternatives considered**: A client state machine still cannot authoritatively decide roles or
staleness. XState or a generic workflow engine is unnecessary for a bounded, derivable lifecycle.

## Decision 3 — Parse and rebuild SVG through a secure-static allowlist

**Decision**: Reject DTDs and processing instructions before parsing, parse with
`@xmldom/xmldom`, walk the resulting document, and build a new document containing only approved
SVG elements, attributes, local fragment references and normalized values. Canonical serialization
uses stable namespace, attribute and numeric ordering before hashing.

**Rationale**: SVG can contain scripts, event attributes, animation and external resource fetches.
The W3C secure-static processing model disables script, external references, animation and
interactivity, which matches the product boundary. `@xmldom/xmldom` supplies a maintained Node DOM
parser and serializer; it does not replace the product allowlist or size/depth limits.

**Alternatives considered**: Regex sanitization cannot safely model XML namespaces or nested URLs.
Browser parsing would move the security boundary to the client. `saxes` is strict and streaming but
its repository was archived in 2025 and it would require a custom tree builder.

**Primary sources**:

- [W3C SVG 2 processing modes](https://www.w3.org/TR/SVG2/conform.html#processing-modes)
- [W3C SVG scripting and event attributes](https://www.w3.org/TR/SVG2/interact.html)
- [`@xmldom/xmldom` project](https://github.com/xmldom/xmldom)

## Decision 4 — Immutable metadata plus private content-addressed blobs

**Decision**: Persist lifecycle metadata and relational integrity in PostgreSQL; persist sanitized
SVG, manifests and package bytes through the existing private object-storage port. Revisions,
runs, findings, decisions, invalidations and packages are append-only. A small current-revision
pointer is updated by compare-and-swap.

**Rationale**: This reuses the encrypted, content-addressed blob boundary while making review and
export joins explicit. Append-only evidence prevents silent history rewriting.

**Alternatives considered**: Storing complete SVG in JSON/database rows duplicates blob controls.
Mutating status columns on old decisions or packages loses provenance. Full event sourcing is
unnecessary.

## Decision 5 — Explicit optimistic freshness with transactional gate evaluation

**Decision**: Every mutating command carries expected revision, rule-run and workflow version
identifiers plus an idempotency key. The server re-evaluates gates in one transaction and rejects a
stale command with the current snapshot. Row-level locking is limited to the current-candidate
pointer while immutable records are inserted.

**Rationale**: Review and export are low-volume but correctness-sensitive. PostgreSQL documents
that row locks block conflicting writers; combining a small locked pointer with immutable inserts
prevents two stale tabs from both becoming current.

**Alternatives considered**: Last-write-wins would permit stale approval. Serializing the whole
project or table would be excessive. Client-only version checks are not authoritative.

**Primary source**: [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)

## Decision 6 — TypeBox contracts and thin Fastify routes

**Decision**: Define shared discriminated schemas in `packages/contracts`; route handlers validate
transport shapes and delegate all role, freshness, state and hash decisions to services.

**Rationale**: This matches the current repository and lets contract tests cover every state,
outcome and gate. Fastify recommends JSON Schema for request validation and response serialization.

**Alternatives considered**: Hand-written route parsing duplicates schemas. Moving business gates
into route handlers or React makes reuse and testing harder.

**Primary source**: [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

## Decision 7 — Pure reviewed rule catalog with evidence renderers

**Decision**: Implement each profile as immutable reviewed metadata plus pure rule functions. The
first catalog covers SVG safety/metadata, physical sheet/viewBox, margin/orientation,
monochrome/transparency, figure-label/sequence and explicit manual-review policies. Each rule emits
a typed finding and evidence geometry or element reference.

**Rationale**: Pure rules make repeatability, fixture coverage and official-source attribution
testable. Technical correctness, text indispensability and cross-document correspondence remain
human dispositions.

**Alternatives considered**: AI classification cannot grant rule passes. A generic rule DSL adds
complexity before the first catalog is stable.

## Decision 8 — Three distinct actors and two immutable decisions

**Decision**: The deterministic runtime supplies a drafter, technical reviewer and attorney/agent
as separate identities. Technical approval resolves manual judgments; attorney approval binds the
same revision and run after technical approval. Revision author, technical reviewer and final
approver must be distinct for the candidate.

**Rationale**: Merely changing a role label on one actor does not establish independence and would
make self-approval tests meaningless.

**Alternatives considered**: A single multi-role fixture is convenient but violates the intended
review boundary. Organisation-specific dual-role exceptions require a later constitutional change,
not an implementation shortcut.

## Decision 9 — Atomic export record without circular hashes

**Decision**: Build and hash the exact SVG, build a canonical manifest containing that SVG hash,
store and hash the manifest, then insert one completed package record binding both hashes. A later
revision appends a supersession record. Incomplete or orphaned blobs never become downloadable
packages.

**Rationale**: This makes success unambiguous and avoids embedding a manifest's own hash inside the
bytes being hashed. Historical packages remain immutable.

**Alternatives considered**: A mutable export row could expose partial packages. A zip bundle is
not necessary for the first increment; the paired downloads and package record are sufficient.

## Decision 10 — Keep the artifact workbench, make its inspector state-driven

**Decision**: Retain the left workflow rail, central figure and right inspector. Replace the fixed
FigurePlan inspector with stage-specific panels driven by `WorkflowSnapshot`. Use native tables,
keyboard-operable finding lists, visible gate explanations, live status announcements and a
reduced-motion mode.

**Rationale**: Patent drafting is iterative and version-oriented; a one-way wizard obscures returns
and history. The workbench preserves the figure and evidence context through all roles.

**Alternatives considered**: A linear wizard is poor for rework. A separate review inbox may be a
later navigation feature, but it does not replace the artifact workspace.

## Known release constraints

- Current development authentication trusts identity headers and a fixture resolver; it proves
  authorization logic but is not production identity assurance.
- The first rule catalog and official-source snapshots require named human review before a pilot.
- React server-rendered assertions do not prove interaction; the manual three-role workflow remains
  a release gate until browser automation is separately approved.
- PDF, PNG, TIFF, CNIPA XML generation and office submission are outside this feature.
