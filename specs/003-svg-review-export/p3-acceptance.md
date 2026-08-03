# P3 attorney approval and SVG export acceptance

**Accepted:** 2026-08-01 (Asia/Singapore)
**Environment:** local deterministic demo, `http://localhost:5173/`
**Result:** PASS

## Browser workflow

The browser acceptance used three distinct fixture identities and completed the visible workflow without direct repository mutation:

1. `drafter-fixture-01` imported `pump-v2.svg`, selected its canonical revision, ran `CNIPA-2026.1`, and created the exact export candidate.
2. `technical-reviewer-fixture-01` recorded a reasoned disposition for `CNIPA-FIG-006` and approved structural correspondence.
3. `attorney-fixture-01` observed `not-CNIPA-electronic-submission-ready`, acknowledged the current `CNIPA-FIG-004` warning, recorded a separate attorney reason, and approved export.
4. The attorney generated the SVG plus canonical manifest. The UI exposed both immutable history entries and download actions.

Accepted evidence chain:

- Revision: `revision:fdca3e0a-5a13-4243-b5e2-daad746380b1`
- Rule run: `rule-run:91ac1b37-9f72-4e96-8459-9b5b752ae2a7`
- Candidate: `candidate:013311a9-70d4-4338-a052-569e716bc802`
- Technical decision: `technical-decision:e9a0d0c4-65c5-4934-ba0f-3ad19fda890a`
- Attorney decision: `attorney-decision:ff3e5225-d16d-4498-8e24-4091a1b7bfe0`
- Export package: `export-package:316a4c92-23f6-4084-959a-de53d228b579`

## Independent artifact verification

Both artifacts were downloaded from the authenticated package routes and hashed independently with `shasum -a 256`.

| Check                    | Recomputed                                                                | Recorded                                                   | Result |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| SVG bytes (900 bytes)    | `sha256:53a8b603a6eb0b07d7ab63b76af493f57694414fd29ae2e8b45e5c1b89f23b6b` | package `svgHash` and manifest artifact hash are identical | PASS   |
| Canonical manifest       | `sha256:d45208609089c8cd07751b236d2b5ef3ce4b548aeabe08f65bbaee8ba0419ca2` | package `manifestHash` is identical                        | PASS   |
| Manifest package binding | `export-package:316a4c92-23f6-4084-959a-de53d228b579`                     | requested package ID is identical                          | PASS   |

## CNIPA boundary acceptance

The live UI and downloaded manifest both showed:

- label: `not-CNIPA-electronic-submission-ready`
- limitations: `reviewed-drawing-asset`, `not-an-office-filing-event`, `no-office-acceptance-assertion`, and `not-CNIPA-electronic-submission-ready`
- no claim of electronic-filing readiness, filing, receipt, office acceptance, or grant

Automated acceptance additionally covers external-evidence absence, complete matching evidence, revision mismatch, and missing proofread attestation in `tests/integration/cnipa-efiling-evidence.integration.test.ts`. Matching evidence is limited to `CNIPA-XML-evidence-recorded`; it does not prove filing or office acceptance.

## Verification commands

- `pnpm typecheck` — PASS
- `pnpm test` — PASS, 27 files / 99 tests
- `git diff --check` — PASS
