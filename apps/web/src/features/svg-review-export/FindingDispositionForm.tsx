import type { RuleFinding, TechnicalReviewDecisionRequest } from '@patentdraw/contracts';

export type FindingDispositionDraft = Record<
  string,
  {
    disposition: TechnicalReviewDecisionRequest['findingDispositions'][number]['disposition'];
    reason: string;
  }
>;

export function FindingDispositionForm({
  findings,
  value,
  disabled,
  onChange,
}: {
  findings: readonly RuleFinding[];
  value: FindingDispositionDraft;
  disabled: boolean;
  onChange: (value: FindingDispositionDraft) => void;
}) {
  if (findings.length === 0) {
    return <p>当前规则运行没有需要逐项处置的人工判断；仍需记录整体结构对应结论。</p>;
  }
  return (
    <fieldset className="finding-disposition-form" disabled={disabled}>
      <legend>逐项判断</legend>
      {findings.map((finding) => {
        const current = value[finding.id];
        return (
          <section className="disposition-row" key={finding.id}>
            <div>
              <strong>{finding.ruleId}</strong>
              <span>{finding.evaluatedInput.description}</span>
            </div>
            <label>
              处置
              <select
                aria-label={`${finding.ruleId} 处置`}
                value={current?.disposition ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [finding.id]: {
                      disposition: event.target
                        .value as FindingDispositionDraft[string]['disposition'],
                      reason: current?.reason ?? '',
                    },
                  })
                }
              >
                <option value="">请选择</option>
                <option value="accepted-with-reason">有理由接受</option>
                <option value="requires-change">需要修改</option>
                <option value="not-applicable">不适用</option>
              </select>
            </label>
            <label>
              判断理由
              <textarea
                aria-label={`${finding.ruleId} 判断理由`}
                value={current?.reason ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [finding.id]: {
                      disposition: current?.disposition ?? 'accepted-with-reason',
                      reason: event.target.value,
                    },
                  })
                }
                placeholder="说明与来源、FigurePlan 或图中证据的对应关系"
              />
            </label>
          </section>
        );
      })}
    </fieldset>
  );
}
