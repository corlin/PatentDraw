import { useState } from 'react';

import type { RuleFinding, RuleRun } from '@patentdraw/contracts';

import { FindingList } from './FindingList.js';

interface RuleRunView {
  id: string;
  profileId: string;
  profileVersion: string;
  findings: readonly RuleFinding[];
  summary?: RuleRun['summary'];
  profileEffectiveFrom?: string;
}

export function RuleRunPanel({
  run,
  history = [],
  onSelectFinding,
}: {
  run?: RuleRunView | undefined;
  history?: readonly RuleRun[];
  onSelectFinding?: (findingId: string) => void;
}) {
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
  if (!run) {
    return (
      <section className="rule-run-panel">
        <h3>规则检查</h3>
        <p>选择当前规范修订后，可运行具名、带生效日期的规则档案。</p>
      </section>
    );
  }
  function select(findingId: string) {
    setSelectedFindingId(findingId);
    onSelectFinding?.(findingId);
  }
  return (
    <section className="rule-run-panel" aria-labelledby="rule-run-heading">
      <p className="eyebrow">不可变规则运行</p>
      <h3 id="rule-run-heading">
        {run.profileId} / {run.profileVersion}
      </h3>
      <p>
        {run.profileEffectiveFrom ? `生效日期 ${run.profileEffectiveFrom} · ` : ''}运行 {run.id}
      </p>
      {run.summary && (
        <div className="outcome-summary" aria-label="检查结果汇总">
          <span>通过 {run.summary.pass}</span>
          <span>警告 {run.summary.warning}</span>
          <span>人工判断 {run.summary.manualReviewRequired}</span>
          <span>阻断 {run.summary.fail}</span>
        </div>
      )}
      <FindingList
        findings={run.findings}
        selectedFindingId={selectedFindingId}
        onSelect={select}
      />
      {history.length > 1 && (
        <details className="rule-history">
          <summary>规则运行历史（{history.length}）</summary>
          <ol>
            {history.map((item) => (
              <li key={item.id}>
                {item.id} · pass {item.summary.pass} / warning {item.summary.warning} / manual{' '}
                {item.summary.manualReviewRequired} / fail {item.summary.fail}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
