import { useState } from 'react';

import type {
  AttorneyApprovalDecisionRequest,
  ExportCandidate,
  TechnicalReviewDecision,
} from '@patentdraw/contracts';

export function AttorneyApprovalPanel({
  candidate,
  technicalDecision,
  canApprove,
  busy,
  onSubmit,
}: {
  candidate: ExportCandidate;
  technicalDecision: TechnicalReviewDecision;
  canApprove: boolean;
  busy: boolean;
  onSubmit: (request: AttorneyApprovalDecisionRequest) => void;
}) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const complete =
    reason.trim().length > 0 &&
    candidate.warningFindingIds.every((findingId) => acknowledged.includes(findingId));

  const request = (decision: AttorneyApprovalDecisionRequest['decision']) => ({
    candidateFingerprint: candidate.candidateFingerprint,
    technicalDecisionId: technicalDecision.id,
    decision,
    reason: reason.trim(),
    acknowledgedWarningFindingIds: [...acknowledged],
  });

  return (
    <section className="attorney-approval-panel" aria-labelledby="attorney-approval-heading">
      <p className="eyebrow">第三人隔离 · 不可变批准</p>
      <h3 id="attorney-approval-heading">代理人独立审批</h3>
      <dl className="review-metadata">
        <div>
          <dt>技术决定</dt>
          <dd>{technicalDecision.id}</dd>
        </div>
        <div>
          <dt>候选</dt>
          <dd>{candidate.id}</dd>
        </div>
        <div>
          <dt>CNIPA 边界</dt>
          <dd>{candidate.cnipaAssessment.label}</dd>
        </div>
      </dl>
      <p className="boundary-note">该审批只覆盖经复核的附图资产，不表示提交、受理或授权。</p>
      <fieldset disabled={!canApprove || busy}>
        <legend>逐项确认当前警告</legend>
        {candidate.warningFindingIds.length === 0 ? (
          <p>无待确认警告。</p>
        ) : (
          candidate.warningFindingIds.map((findingId) => (
            <label key={findingId} className="warning-acknowledgment">
              <input
                type="checkbox"
                checked={acknowledged.includes(findingId)}
                onChange={(event) =>
                  setAcknowledged((current) =>
                    event.target.checked
                      ? [...current, findingId]
                      : current.filter((item) => item !== findingId),
                  )
                }
              />
              {findingId}
            </label>
          ))
        )}
      </fieldset>
      <label className="decision-reason">
        审批理由
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      {!canApprove && <p className="waiting-copy">等待独立 attorney-agent 处理。</p>}
      <div className="review-actions">
        <button
          type="button"
          className="primary-action"
          disabled={!canApprove || busy || !complete}
          onClick={() => onSubmit(request('approve-export'))}
        >
          批准导出候选
        </button>
        <button
          type="button"
          className="secondary-action"
          disabled={!canApprove || busy || !reason.trim()}
          onClick={() => onSubmit(request('reject-export'))}
        >
          拒绝导出
        </button>
      </div>
    </section>
  );
}
