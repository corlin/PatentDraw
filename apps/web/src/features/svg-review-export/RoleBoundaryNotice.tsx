import type { WorkflowSnapshot } from '@patentdraw/contracts';

import { DEMO_WORKFLOW_ACTORS, type DemoWorkflowActorId } from './workflow-api-client.js';

const actorLabels: Record<DemoWorkflowActorId, string> = {
  [DEMO_WORKFLOW_ACTORS.drafter]: '制图人',
  [DEMO_WORKFLOW_ACTORS.technicalReviewer]: '技术复核人',
  [DEMO_WORKFLOW_ACTORS.attorneyAgent]: '代理人',
};

export function RoleBoundaryNotice({
  workflow,
  activeActorId,
  onActorChange,
}: {
  workflow: WorkflowSnapshot;
  activeActorId?: DemoWorkflowActorId;
  onActorChange?: (actorId: DemoWorkflowActorId) => void;
}) {
  const waitingForTechnicalReview =
    workflow.state === 'technical-review' && workflow.actor.activeRole !== 'technical-reviewer';
  return (
    <section className="role-boundary" aria-label="身份与角色边界">
      <div>
        <p className="eyebrow">已认证项目身份</p>
        <strong>{workflow.actor.id}</strong>
        <span>{workflow.actor.activeRole}</span>
      </div>
      {waitingForTechnicalReview && (
        <p className="waiting-copy" role="status">
          等待技术复核 · 候选 {workflow.current.candidateId} 只能由独立 technical-reviewer 处理。
        </p>
      )}
      {activeActorId && onActorChange && (
        <fieldset className="actor-switcher">
          <legend>虚构三角色验收切换</legend>
          {Object.values(DEMO_WORKFLOW_ACTORS).map((actorId) => (
            <button
              type="button"
              key={actorId}
              className={actorId === activeActorId ? 'is-active' : ''}
              aria-pressed={actorId === activeActorId}
              onClick={() => onActorChange(actorId)}
            >
              {actorLabels[actorId]}
            </button>
          ))}
        </fieldset>
      )}
      <small>此切换器只证明确定性演示中的域授权，不代表生产身份认证。</small>
    </section>
  );
}
