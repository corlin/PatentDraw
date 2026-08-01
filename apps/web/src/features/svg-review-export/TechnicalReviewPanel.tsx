import { useMemo, useState } from 'react';

import type {
  ExportCandidate,
  RuleRun,
  TechnicalReviewDecision,
  TechnicalReviewDecisionRequest,
} from '@patentdraw/contracts';

import { FindingDispositionForm, type FindingDispositionDraft } from './FindingDispositionForm.js';

export function TechnicalReviewPanel({
  candidate,
  ruleRun,
  decision,
  canReview,
  busy,
  onSubmit,
}: {
  candidate: ExportCandidate;
  ruleRun: RuleRun;
  decision?: TechnicalReviewDecision | undefined;
  canReview: boolean;
  busy: boolean;
  onSubmit: (request: TechnicalReviewDecisionRequest) => void;
}) {
  const [reason, setReason] = useState('');
  const [dispositions, setDispositions] = useState<FindingDispositionDraft>({});
  const manualFindings = useMemo(
    () => ruleRun.findings.filter((finding) => candidate.manualFindingIds.includes(finding.id)),
    [candidate.manualFindingIds, ruleRun.findings],
  );
  const complete =
    reason.trim().length > 0 &&
    manualFindings.every((finding) => {
      const value = dispositions[finding.id];
      return Boolean(value?.disposition && value.reason.trim());
    });

  if (decision) {
    return (
      <section className="technical-review-panel" aria-labelledby="technical-review-heading">
        <p className="eyebrow">不可变技术决定</p>
        <h3 id="technical-review-heading">
          {decision.decision === 'return-for-change' ? '已退回修改' : '结构对应已批准'}
        </h3>
        <p>{decision.reason}</p>
        <dl className="review-metadata">
          <div>
            <dt>决定</dt>
            <dd>{decision.id}</dd>
          </div>
          <div>
            <dt>复核人</dt>
            <dd>{decision.actorId}</dd>
          </div>
          <div>
            <dt>候选</dt>
            <dd>{decision.candidateId}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="technical-review-panel" aria-labelledby="technical-review-heading">
      <p className="eyebrow">精确候选 · 独立技术复核</p>
      <h3 id="technical-review-heading">独立技术复核</h3>
      <dl className="review-metadata">
        <div>
          <dt>候选</dt>
          <dd>{candidate.id}</dd>
        </div>
        <div>
          <dt>修订</dt>
          <dd>{candidate.revisionId}</dd>
        </div>
        <div>
          <dt>规则运行</dt>
          <dd>{candidate.ruleRunId}</dd>
        </div>
        <div>
          <dt>人工判断</dt>
          <dd>{candidate.manualFindingIds.length}</dd>
        </div>
      </dl>
      {!canReview && (
        <p className="waiting-copy">等待具备 technical-reviewer 角色的独立人员处理。</p>
      )}
      <FindingDispositionForm
        findings={manualFindings}
        value={dispositions}
        disabled={!canReview || busy}
        onChange={setDispositions}
      />
      {canReview && (
        <>
          <label className="decision-reason">
            整体复核理由
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="说明来源、FigurePlan、修订与规则证据的结构对应结论"
            />
          </label>
          <div className="review-actions">
            <button
              type="button"
              className="primary-action"
              disabled={
                busy ||
                !complete ||
                Object.values(dispositions).some((item) => item.disposition === 'requires-change')
              }
              onClick={() =>
                onSubmit(
                  buildRequest(
                    'approve-structural-correspondence',
                    candidate,
                    reason,
                    dispositions,
                  ),
                )
              }
            >
              批准结构对应
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={busy || !complete}
              onClick={() =>
                onSubmit(buildRequest('return-for-change', candidate, reason, dispositions))
              }
            >
              退回修改
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function buildRequest(
  decision: TechnicalReviewDecisionRequest['decision'],
  candidate: ExportCandidate,
  reason: string,
  dispositions: FindingDispositionDraft,
): TechnicalReviewDecisionRequest {
  return {
    candidateFingerprint: candidate.candidateFingerprint,
    decision,
    reason: reason.trim(),
    findingDispositions: candidate.manualFindingIds.map((findingId) => ({
      findingId,
      disposition: dispositions[findingId]!.disposition,
      reason: dispositions[findingId]!.reason.trim(),
    })),
  };
}
