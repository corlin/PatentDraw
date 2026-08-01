# Validation guide: SVG review and export workflow

This guide defines acceptance after implementation. It does not claim that the current pre-003 UI
already exposes these operations.

## Prerequisites

- Node.js 24 and pnpm 10
- Repository dependencies installed
- Deterministic development composition only; no customer patent material
- Three fictional actor identities:
  - `drafter-fixture-01`
  - `technical-reviewer-fixture-01`
  - `attorney-fixture-01`
- Fictional pump SVG revisions and reviewed fixture profiles from `packages/fixtures`

## Automated baseline

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Required suites:

1. Contract validation for all workflow states, actions, findings, decisions, errors and the export
   manifest schema.
2. SVG sanitizer tests for clean input, DTD/entity, script, event handler, external URL,
   `foreignObject`, animation/filter, raster payload, invalid dimensions/viewBox and size/depth
   limits.
3. Rule fixtures producing at least one `pass`, `warning`, `manual-review-required` and `fail`, each
   with official-source metadata, evidence and remediation.
4. Role tests for author self-review, same-actor role switching, contributor/inventor approval and
   technical-reviewer-as-attorney denial.
5. Stale-tab tests for revision selection, rule run, both decisions and export.
6. Export tests that reread both artifacts, verify hashes and reject missing, mismatched or partial
   packages.
7. Invalidation tests for source, FigurePlan, SVG, reference registry, sheet, profile and export
   setting changes.
8. CNIPA tests for no evidence, complete matching evidence, mismatched revision and missing
   proofread attestation.

## Fixture matrix

| Fixture | Expected result |
| --- | --- |
| Clean complex pump SVG | Accepted sanitization; deterministic hash and revision metadata. |
| Clean flowchart SVG | Accepted sanitization; required block text remains human-reviewable. |
| SVG with script/onload | Rejected; no canonical revision created. |
| SVG with external `href` | Rejected; no network request occurs. |
| SVG with `foreignObject` or DTD | Rejected before canonical storage. |
| Broken `viewBox` or non-mm sheet | Rejected or normalized only by an explicitly recorded policy. |
| Margin intrusion | `fail` with sheet-region evidence; blocks candidate creation. |
| Transparency/colour | Profile-appropriate warning or manual review with evidence. |
| Technical correspondence | `manual-review-required`; never automated pass. |
| Reference numeral edit | Successor revision; prior checks and decisions become invalid. |
| Same-actor approvals | `403`, no valid decision, denial audit event. |
| Export hash mismatch | `409`, no downloadable package. |
| CNIPA without XML evidence | SVG export allowed with `not-CNIPA-electronic-submission-ready`. |
| Matching external XML evidence | Label becomes only `CNIPA-XML-evidence-recorded`. |

## Manual three-role workflow

Start both services:

```bash
pnpm dev
```

Then complete this supervised sequence in under 10 minutes:

1. Open the fictional pump project as the drafter. Refresh twice and verify that no new AI run or
   write-side audit event is created merely by loading the page.
2. Explicitly request a FigurePlan. Accept one proposal row, edit one, reject one and retain one as
   an open question. Confirm that plan submission is blocked until all rows have a disposition.
3. Request the fictional draft. Observe queued/running progress and the cancel action. Let a second
   request complete, select it as reference and confirm it remains non-exportable.
4. Import `pump-v1.svg`. Verify an accepted sanitization report, explicit millimetre sheet size,
   `viewBox`, canonical hash, independent revision ID and link to the draft only as reference.
5. Run the CNIPA fixture profile. Inspect one pass, warning, manual-review item and fail. Select a
   finding from the list and verify the canvas focuses the same evidence.
6. Import corrected `pump-v2.svg` as a child revision and rerun checks. Verify the first revision and
   rule run remain visible and that only the second revision is current.
7. Submit technical review. Switch to the separate technical-reviewer actor, enter a disposition and
   reason for every manual item, and approve structural correspondence.
8. Switch to the separate attorney actor. Review the exact candidate, technical decision, warnings
   and CNIPA label; acknowledge warnings and approve export.
9. Generate the export package. Download `figure.svg` and `manifest.json`; independently hash the SVG
   and confirm the manifest's SVG hash, revision ID, rule run, both decision IDs, warnings and CNIPA
   limitation match the displayed package.
10. As the drafter, import `pump-v3.svg` changing one reference numeral. Confirm the prior rule run,
    technical decision, attorney decision and export eligibility are invalid for the new candidate;
    the old package remains downloadable and is marked superseded.
11. Attempt technical approval as the author, attorney approval as the technical reviewer and an
    approval from a stale tab. Each attempt must be denied with a visible reason and audit event.

## Accessibility pass

Repeat the primary actions with keyboard only at 200% browser zoom:

- the workflow rail reports its current step;
- focus remains visible and returns correctly after dialogs;
- finding list and canvas overlay synchronize without pointer input;
- loading, success, stale and invalidated states are announced and are not encoded by color alone;
- reduced-motion preference stops nonessential progress animation.

## Export verification example

After downloading the fictional package, compute the SVG hash and compare it with the manifest.
The command and exact hash depend on the downloaded path; the expected string format is
`sha256:<64 lowercase hexadecimal characters>`. A mismatch fails acceptance even if the UI showed
success.

## Release boundary

Passing automated tests and this demonstration proves only the deterministic pilot. Production
identity assurance, named rule-profile review and the supervised pilot outcome remain release
gates. The demonstration does not prove patentability, technical correctness, filing submission or
office acceptance.
