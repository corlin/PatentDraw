import type { WorkflowState } from '@patentdraw/contracts';

const stages: readonly { state: WorkflowState; label: string }[] = [
  { state: 'plan', label: 'FigurePlan' },
  { state: 'draft', label: '草图参考' },
  { state: 'canonical-revision', label: 'SVG 修订' },
  { state: 'checks-ready', label: '规则检查' },
  { state: 'technical-review', label: '技术复核' },
  { state: 'attorney-approval', label: '代理人审批' },
  { state: 'exported', label: '导出' },
];

const stateOrder: Record<WorkflowState, number> = {
  plan: 0,
  draft: 1,
  'canonical-revision': 2,
  'checks-blocked': 3,
  'checks-ready': 3,
  'technical-review': 4,
  'changes-requested': 4,
  'attorney-approval': 5,
  'approved-for-export': 6,
  exported: 6,
  invalidated: 2,
};

export function WorkflowRail({ state }: { state: WorkflowState }) {
  const current = stateOrder[state];
  return (
    <nav className="stage-rail" aria-label="专利附图工作流">
      <p className="rail-title">附图生产流程</p>
      <ol>
        {stages.map((stage, index) => {
          const active = index === current;
          const complete = index < current;
          return (
            <li
              key={stage.state}
              className={`stage-item ${active ? 'stage-active' : complete ? 'stage-complete' : 'stage-locked'}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="stage-marker">{complete ? '✓' : index + 1}</span>
              <span>
                <strong>{stage.label}</strong>
                <small>{active ? '当前阶段' : complete ? '已完成' : '等待前置条件'}</small>
              </span>
            </li>
          );
        })}
      </ol>
      <aside className="boundary-note">
        <span>
          <strong>能力边界</strong>
          SVG 是可编辑、可追溯的附图资产，不代表 CNIPA XML 包、提交成功或审查接受。
        </span>
      </aside>
    </nav>
  );
}
