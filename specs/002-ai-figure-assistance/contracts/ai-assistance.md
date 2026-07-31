# Contract: AI assistance boundary

## Request FigurePlan

Required input: project ID, selected authorised source IDs/hashes, figure purpose, allowed scope,
assistance type and user consent record. The result is either a source-mapped proposal,
`abstained`, `refused` or `manual-review-required`.

Before invoking a provider, the system creates and retains an immutable `request_input_hash` over
the canonical request fields: project ID, selected authorised source hashes, figure purpose,
allowed scope, assistance type, instruction version and consent-record identifier. The hash is
linked to the AI run and output; any field change produces a new request and cannot overwrite the
earlier run.

The result MUST NOT contain a formality pass, claim-coverage assertion, technical-correctness
assertion, legal conclusion, filing status or canonical SVG.

## Request draft asset

Required input: a drafter-confirmed FigurePlan and allowed scope. The result is a labelled
`GeneratedDraftAsset` with AI-run provenance or a refusal/abstention result. It cannot be exported
as a patent figure until a drafter separately creates a canonical SVG FigureRevision and records an
explicit handoff. The handoff is a link to that independent revision, not a conversion or approval
of the AI asset. Draft jobs expose queued/running/ready/cancelled/failed progress states and may be
cancelled before an asset is ready.

## Invalidation event

When selected source, source authority, allowed scope, FigurePlan or linked revision changes, emit
an immutable invalidation event. It invalidates dependent AI output and related reviewer decisions;
it does not delete earlier evidence.
