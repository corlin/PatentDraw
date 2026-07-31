# Validation guide: small, safe AI increments

## Increment 1 — FigurePlan only

1. Load the two fictional grounded-source fixtures.
2. Request a FigurePlan using the deterministic provider test double.
3. Verify all proposed factual elements have mappings; verify an unsupported element returns
   `manual-review-required`.
4. Confirm no result contains a final SVG, approval or filing assertion.

## Increment 2 — draft candidate

1. Confirm a FigurePlan as drafter.
2. Request a fictional line-art draft and inspect the draft label, provenance and limitations.
3. Verify it cannot enter the export workflow until a separate canonical SVG revision exists.

## Increment 3 — audit and invalidation

1. Change one selected source or the FigurePlan scope.
2. Verify every dependent proposal/draft is invalidated without deletion.
3. Inspect the audit record for model, source hashes, consent, instruction version, output hash and
   actor/time.
