# Data model: CNIPA XML evidence in PatentDraw

## Authoritative entities

| Entity | Required fields | Relationships and invariants |
| --- | --- | --- |
| Organisation | id, tenancy state | Owns every project and audit event. |
| Project | id, organisation id, confidentiality class, application date, declared CNIPA route | Owns assets and figures; route/date changes invalidate linked e-filing evidence. |
| SourceAsset | id, project id, original hash, detected type, quarantine state | Original is immutable and not previewable until a safe derivative exists. |
| FigureRevision | id, figure id, parent revision id, canonical SVG hash, revision state | One canonical SVG; changing it invalidates rule runs, approvals and XML evidence links. |
| RuleProfile / RuleRun | profile id/version/source/effective date; revision id/result/evidence geometry | A rule run is immutable and records the exact rendering/rule inputs. |
| CnipaEfilingEvidence | id, project id, revision hashes, route, application date, XML package hash, converter version, data-standard version, proofread attestation, reviewer, state | It is evidence only, never an acceptance or submission assertion. |
| ReviewDecision | id, target type/id, actor, decision, timestamp, invalidated-at | Separate technical and attorney/agent approval roles. |
| ExportPackage | id, revision id, artifact hashes, manifest hash, readiness wording | May state `CNIPA-XML-evidence-recorded`, but never filing acceptance. |
| OfficialReceiptEvidence | id, e-filing evidence id, supplied receipt reference/hash, recorded-by | Optional. It records user-supplied proof; only it may evidence a filing event. |
| AuditEvent | id, organisation id, actor, time, action, prior/next hashes | Append-only; never reconstructed from logs alone. |

## CNIPA evidence states

```text
not-applicable
  └─ (CNIPA electronic route selected) → evidence-required
       ├─ incomplete/mismatched → manual-review-required
       └─ complete + reviewer attestation → CNIPA-XML-evidence-recorded
            └─ user supplies official receipt evidence → filing-event-evidenced
```

`filing-event-evidenced` means an official receipt was recorded, not that PatentDraw filed,
validated or caused acceptance. Any change to application date, route or linked drawing revision
returns the evidence to `evidence-required`.
