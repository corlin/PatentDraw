# P2 Browser Acceptance — Independent technical review

**Date**: 2026-08-01

**Environment**: Local deterministic three-actor fixture runtime (`http://localhost:5173/`)

**Scope**: User Story 2 only. This evidence proves the deterministic domain boundary and does not
claim production identity assurance, attorney approval, export eligibility, CNIPA filing readiness
or office acceptance.

## Result

Passed. A drafter created an exact checked candidate, a separately identified technical reviewer
returned it with a reasoned manual-finding disposition, the drafter created a materially different
child SVG revision, and the same independent reviewer approved the corrected candidate. The UI
then stopped at the separate attorney-agent boundary.

## Observed sequence

1. As `drafter-fixture-01`, imported `pump-v2.svg`, ran `CNIPA-2026.1`, and observed pass `3`,
   warning `1`, manual-review-required `1`, fail `0`.
   - Revision: `revision:43545758-3063-475e-87d4-f6a2dbcbcdc2`
   - Canonical SVG hash:
     `sha256:53a8b603a6eb0b07d7ab63b76af493f57694414fd29ae2e8b45e5c1b89f23b6b`
   - Rule run: `rule-run:be17d59e-389c-4ee0-a0eb-d9273ff97ec4`
   - Candidate: `candidate:a047956c-d3d0-4156-8737-6e8d14eda837`
   - Workflow advanced to `v3`; the drafter saw an explicit waiting boundary and no operational
     technical-approval control.
2. Switched to `technical-reviewer-fixture-01`. Recorded `requires-change` for
   `CNIPA-FIG-006`, supplied both a finding reason and overall return reason, and submitted
   **退回修改**.
   - Immutable return decision:
     `technical-decision:3203cedc-0014-4910-918d-f4a5ef02c66b`
   - Workflow advanced to `v4` and required the drafter to create a successor revision.
3. As the drafter, loaded `pump-review-corrected.svg`. This fixture adds and repositions the
   `110` reference-sign leader, producing a different canonical hash and a visible parent link.
   - Corrected revision: `revision:b29ab298-78c7-4a08-be84-b25e5139f442`
   - Parent: `revision:43545758-3063-475e-87d4-f6a2dbcbcdc2`
   - Corrected canonical SVG hash:
     `sha256:912561f15d325bbff8dfd989eb4eab415a7ec7ee2b3d8374e496efdebdb61ce1`
   - Corrected rule run: `rule-run:3457a545-5647-4fed-9992-e9e81c1d66ba`
   - Corrected candidate: `candidate:ee4132de-0e1f-4e2b-8f21-c6bdc3e473a7`
4. As the independent technical reviewer, recorded `accepted-with-reason` for the manual finding
   and approved structural correspondence.
   - Immutable approval decision:
     `technical-decision:4014c39d-e047-4c26-a1ea-d196decf8a09`
   - Workflow advanced to `v8` and displayed the attorney-agent stage as the next independent
     boundary; the technical reviewer could not perform attorney approval.

## Automated boundary evidence

The P2 contract and integration suites separately verify:

- the revision author cannot technically review their own candidate;
- a wrong active role is denied;
- stale candidate fingerprints and workflow versions are rejected;
- every manual finding requires exactly one reasoned disposition;
- `requires-change` cannot be included in a technical approval;
- denied route attempts append an actor-, role-, target- and reason-bearing audit event;
- decisions bind the exact candidate fingerprint, revision and rule run and remain immutable.

The browser console contained no error-level entries after the final approval. Evidence screenshot:
`artifacts/p2-acceptance-2026-08-01/p2-technical-review-approved.png`.

The generated identifiers belong to this in-memory acceptance session and are not stable production
identifiers.
