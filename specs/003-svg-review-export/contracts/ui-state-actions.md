# Contract: workflow UI states and actions

The client renders the server `WorkflowSnapshot`; it does not decide eligibility from local state.
The central canvas always shows the artifact under review. The left rail presents lifecycle
progress. The right inspector changes by state.

| State/detail | Primary actor | Primary action | Required secondary behavior |
| --- | --- | --- | --- |
| `plan` / empty | Drafter | `生成 FigurePlan` | Require source authorization; refresh remains read-only. |
| `plan` / review | Drafter | `确认 FigurePlan` | Each unresolved row offers accept, reject, edit and open-question actions. |
| `draft` / queued or running | Drafter | `查看生成进度` | Show real progress and cancellation; keep non-authoritative label. |
| `draft` / failed, refused or cancelled | Drafter | `重试生成` | Offer `跳过 AI，直接创建 SVG`; retain failure reason. |
| `draft` / ready | Drafter | `设为参考` | Offer reject and continue-without-draft; never mark exportable. |
| `canonical-revision` / none | Drafter | `导入或创建 SVG` | Explain format, size, viewBox and security constraints. |
| `canonical-revision` / sanitizing | Drafter | `查看清洗状态` | Prevent duplicate submission and retain input filename. |
| `canonical-revision` / rejected | Drafter | `修正后重新导入` | List safe issue code, element path and remediation. |
| `canonical-revision` / current | Drafter | `运行规则检查` | Show revision hash, parent, sheet and selected profile version/date. |
| `checks-blocked` | Drafter | `创建修订并修复` | Finding list and canvas evidence are mutually focusable. |
| `checks-ready` | Drafter | `提交技术复核` | Warnings remain visible; identify required reviewer role. |
| `technical-review` / reviewer | Technical reviewer | `批准结构对应` | Parallel return action requires a reason; every manual finding needs disposition. |
| `technical-review` / waiting | Other actor | `等待技术复核` | Show reviewer role, revision, rule run and pending count; no fake approval. |
| `changes-requested` | Drafter | `创建修订并处理退回` | Show immutable return/reject reason and affected findings. |
| `attorney-approval` / approver | Attorney-agent | `批准导出候选` | Parallel reject action requires reason; show warnings and CNIPA label. |
| `attorney-approval` / waiting | Other actor | `等待代理人批准` | Show candidate and completed technical decision. |
| `approved-for-export` | Attorney-agent | `生成 SVG + 清单` | Revalidate hashes and approvals immediately before packaging. |
| `exported` | Authorized project member | `下载导出包` | Show SVG/manifest hashes, warnings, limited CNIPA label and history. |
| `invalidated` | Earliest-gate actor | Server-provided recovery action | Explain changed item, invalidated records and retained history. |

## Layout contract

```text
Top bar: project, profile, authenticated actor/active role, export state

Left rail                 Central artifact                    Right inspector
Materials                 Current canonical SVG               Stage-specific evidence
FigurePlan                Finding overlays                    and role actions
Draft                     Revision/history switch
SVG revision
Checks
Technical review
Attorney approval
Export

Bottom: source/provenance summary and immutable audit timeline
```

The rail supports `complete`, `active`, `waiting`, `returned`, `invalidated` and `blocked`. Historical
or invalidated artifacts show a persistent watermark and never inherit the current candidate's
approval controls.

## Loading, empty and error states

- Initial load: skeleton plus `正在读取项目状态`; only the workflow GET request is made.
- Refresh/poll: retain the last snapshot with `aria-busy`; avoid blanking the workbench.
- Synchronous check request: retain the last snapshot with `aria-busy` and `正在运行规则检查`; do
  not fabricate a persisted `checks-running` state or treat partial client data as a completed run.
- `409 stale-workflow`: preserve unsent reason text, show current IDs and offer `载入最新版本`.
- `422 gate denied`: expand the missing gates and link to their target sections.
- Offline/network error: persistent banner and retry; decisions and export remain unavailable.
- No findings: say deterministic checks found no listed defect and show rule-run metadata; never say
  the figure is filing-ready.
- Export failure: show the failed stage and package/candidate IDs; offer idempotent retry and no
  incomplete download.
- Invalidated state: old records remain viewable and the next recovery action is prominent.

## Accessibility contract

- Workflow rail uses `nav`, ordered list and `aria-current="step"`.
- FigurePlan, findings and manifest use native table markup.
- Primary actions and findings are keyboard operable with visible focus and at least 44 by 44 CSS
  pixel pointer targets.
- Loading and success use polite live regions; blocking, invalidation and stale conflicts use
  alerts. No state relies on color alone.
- Every canvas finding has a corresponding keyboard-focusable list entry; focusing either list or
  overlay synchronizes the other.
- Dialog focus enters the title/first field and returns to the triggering control on close.
- The main workflow remains completable at 200% browser zoom and with reduced-motion preference.
- A disabled or waiting action has a persistent visible reason outside the disabled control.

## Component boundary

`main.tsx` composes `WorkflowShell` only. Feature components own rendering and forms but not gate
authority. A single workflow client loads snapshots and commands; a successful command replaces the
snapshot returned by the server. No component fabricates a next state before the command response.
