# Contract: CNIPA e-filing evidence boundary

This is a domain contract, not a public API or a CNIPA integration.

## Record evidence command

An authorised attorney/agent records:

- project and figure-revision identifiers;
- application date and declared CNIPA route;
- external XML package hash;
- conversion tool and version;
- CNIPA data-standard version;
- preview/proofread attestation, timestamp and named reviewer;
- optional official-system receipt reference/hash.

The command rejects evidence that belongs to another organisation, project, route or figure
revision, or lacks required evidence fields. It does not accept credentials, certificates, an
official-system session, a submission request, or a claim that CNIPA accepted the package.

## Result contract

| Result | Meaning | Forbidden wording |
| --- | --- | --- |
| `evidence-required` | No complete matching external XML evidence exists. | ready, submitted, accepted |
| `manual-review-required` | Evidence is incomplete, mismatched or invalidated. | ready, submitted, accepted |
| `CNIPA-XML-evidence-recorded` | Complete matching external XML evidence has a recorded reviewer. | CNIPA-ready, submitted, accepted |
| `filing-event-evidenced` | User supplied an official-system receipt reference. | PatentDraw filed, CNIPA accepted |
