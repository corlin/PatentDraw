# Architecture validation guide

This guide validates the proposed boundary before implementation; it does not submit to CNIPA.

## Preconditions

- The 23 authorised or fictional fixtures described in [the MVP spec](../mvp-utility-svg-spec.md)
  are available.
- A test organisation, drafter, technical reviewer and attorney/agent reviewer exist.
- The worker has no network access, a fixed font set and recorded renderer configuration ID.

## Validation scenarios

1. Import each unsafe SVG fixture. Confirm the original remains immutable, no active/external
   content executes, and only a safe canonical derivative may reach the preview.
2. Render one clean SVG twice using the same worker configuration. Confirm identical canonical
   and export hashes, and verify the required PDF/PNG/TIFF page bounds and two-thirds preview.
3. Edit a numeral or drawing path. Confirm all linked rule runs, review decisions, export
   candidates and CNIPA XML-evidence records are invalidated in the same workflow.
4. Select a CNIPA electronic route without XML evidence. Confirm the export says
   `not-CNIPA-electronic-submission-ready`.
5. Record complete external XML evidence matching the current revision. Confirm the result is
   `CNIPA-XML-evidence-recorded`, not submission-ready or accepted.
6. Change the route or revision, then confirm the evidence becomes `evidence-required`.
7. Record a user-supplied official receipt. Confirm it is labelled filing-event evidence and
   never claims that PatentDraw submitted the file.

## Evidence to retain

For every scenario retain the source/canonical/export hashes, worker image and font IDs, rule
profile version, audit-event IDs, reviewer decisions and the rendered manifest. Fail the gate if
any output claims filing acceptance or if an original untrusted file is rendered in the app.
