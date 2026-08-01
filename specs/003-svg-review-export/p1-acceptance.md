# P1 Browser Acceptance — Canonical SVG and rule checks

**Date**: 2026-08-01

**Environment**: Local deterministic fixture runtime (`http://localhost:5173/`)

**Scope**: User Story 1 only; this evidence does not claim technical review, attorney approval,
export eligibility, or CNIPA filing readiness.

## Result

Passed. The browser workflow remained read-only on initial load, accepted a safe canonical SVG,
preserved the first immutable rule run, created a corrected child revision, and produced a second
rule run with no blocking finding.

## Observed sequence

1. Opened the workbench and observed workflow version `v0`, no current SVG revision, and the
   explicit message that page loading had not created an AI run or write-side audit.
2. Loaded `pump-v1.svg`, then explicitly selected **导入并选择修订**.
   - Revision: `revision:e5a68821-6a64-4a6a-a048-5412da4c161e`
   - Canonical SVG hash:
     `sha256:36431370c1a7df06085e5bb339709e4439a65e78439b6f288f9a42faa651ac27`
   - Workflow advanced to `v1`.
3. Ran the named `CNIPA-2026.1` profile.
   - Summary: pass `2`, warning `1`, manual-review-required `1`, fail `1`.
   - The margin failure exposed source, evidence and remediation in the inspector.
   - Workflow advanced to `v2` and the semantic rail reached **规则检查**.
4. Loaded `pump-v2.svg` and explicitly created a child revision.
   - Revision: `revision:3e113cbd-65ae-4305-8c74-5193b65ef9d1`
   - Parent: `revision:e5a68821-6a64-4a6a-a048-5412da4c161e`
   - Canonical SVG hash:
     `sha256:53a8b603a6eb0b07d7ab63b76af493f57694414fd29ae2e8b45e5c1b89f23b6b`
   - Revision history displayed both immutable revisions; workflow advanced to `v3`.
5. Ran the same profile against the corrected revision.
   - Summary: pass `3`, warning `1`, manual-review-required `1`, fail `0`.
   - Rule-run history displayed both immutable runs; workflow advanced to `v4`.
   - The next server-derived action was **创建送审候选**, visibly marking the unimplemented
     User Story 2 boundary instead of claiming that review or export had completed.

## Additional checks

- Unsafe-input rejection, stale hash conflicts, parent/fingerprint validation, immutable history,
  and deterministic reruns are covered by the US1 contract, sanitizer and integration suites.
- Browser console contained no error-level entries after the corrected rerun.
- Evidence screenshot:
  `artifacts/p1-acceptance-2026-08-01/p1-workflow-v2-no-fail.png`.

The generated revision identifiers above belong to this in-memory acceptance session and are not
stable production identifiers.
