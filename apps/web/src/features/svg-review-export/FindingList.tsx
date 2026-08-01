import type { RuleFinding } from '@patentdraw/contracts';

export function FindingList({
  findings,
  selectedFindingId,
  onSelect,
}: {
  findings: readonly RuleFinding[];
  selectedFindingId?: string | undefined;
  onSelect?: (findingId: string) => void;
}) {
  if (findings.length === 0) {
    return <p role="status">确定性检查未列出缺陷；这不代表附图可被任何专利局接受。</p>;
  }
  return (
    <ol className="finding-list" aria-label="规则发现">
      {findings.map((finding) => (
        <li key={finding.id} className={`finding finding-${finding.outcome}`}>
          <button
            type="button"
            aria-pressed={selectedFindingId === finding.id}
            onClick={() => onSelect?.(finding.id)}
            onFocus={() => onSelect?.(finding.id)}
          >
            <span className="finding-status">{finding.outcome}</span>
            <strong>{finding.ruleId}</strong>
            <span>{finding.remediation.summary}</span>
          </button>
          <details>
            <summary>证据与依据</summary>
            <p>{finding.evaluatedInput.description}</p>
            <p>{finding.evidence.map((item) => item.description).join('；')}</p>
            <a href={finding.officialSource.url} target="_blank" rel="noreferrer">
              {finding.officialSource.title} · {finding.officialSource.section}
            </a>
          </details>
        </li>
      ))}
    </ol>
  );
}
