# Data model: AI-assisted figure drafting

| Entity | Required fields | Invariants |
| --- | --- | --- |
| `AiRun` | id, project, actor, request-input hash, provider/model/version, instruction version, selected-source hashes, consent state, status, output hash, limitation state | Never overwrites an earlier run; the request-input hash covers the canonical authorised-source selection, figure purpose, allowed scope and assistance type; no source selection or no-training policy means no provider call. |
| `FigurePlanProposal` | id, AI run, purpose, views, components, signs, open questions, source mappings | Every proposed factual element maps to a selected source or is marked unresolved. |
| `SourceMapping` | proposal element, source asset hash, location/quote reference, confidence/limitation | A mapping cannot reference another project or an unauthorised source. |
| `GeneratedDraftAsset` | id, AI run, confirmed plan, blob hash, limitation label, selected/rejected state, independent FigureRevision handoff ID | Cannot be an export candidate or canonical SVG; a handoff ID can only link a separately created revision. |
| `AiInvalidation` | id, changed target, affected runs/proposals/assets, time, actor | Source, plan, allowed-scope or revision changes create an invalidation event. |

```text
requested → validating-sources → proposed | abstained | refused
proposed → drafter-confirmed | rejected
drafter-confirmed → draft-requested → queued → draft-ready | refused | cancelled
any dependent change → invalidated
```
