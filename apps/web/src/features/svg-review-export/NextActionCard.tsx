import type { WorkflowAction } from '@patentdraw/contracts';

export function NextActionCard({
  action,
  busy = false,
  onAction,
}: {
  action: WorkflowAction;
  busy?: boolean;
  onAction?: (action: WorkflowAction['action']) => void;
}) {
  const enabled = action.availability === 'enabled' && !busy;
  return (
    <section className="next-action-card" aria-labelledby="next-action-title">
      <p className="eyebrow">当前下一步</p>
      <h2 id="next-action-title">{action.label}</h2>
      <button
        type="button"
        className="primary-action"
        disabled={!enabled}
        aria-busy={busy}
        onClick={() => onAction?.(action.action)}
      >
        {busy ? '处理中…' : action.label}
      </button>
      {action.availability !== 'enabled' && (
        <p className="gate-reason" role="status">
          {action.blockingGates[0]?.message ?? '等待具备所需角色的项目成员处理。'}
        </p>
      )}
      {action.blockingGates.length > 0 && (
        <ul className="gate-list">
          {action.blockingGates.map((gate) => (
            <li key={`${gate.code}:${gate.targetId ?? ''}`}>
              <strong>{gate.code}</strong> — {gate.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
