import type { RuleFinding } from '@patentdraw/contracts';

export function FindingOverlay({
  findings,
  selectedFindingId,
  onSelect,
}: {
  findings: readonly RuleFinding[];
  selectedFindingId?: string | undefined;
  onSelect?: (findingId: string) => void;
}) {
  return (
    <div className="finding-overlay" aria-label="附图证据覆盖层">
      {findings.map((finding, index) => (
        <button
          type="button"
          key={finding.id}
          className={`overlay-marker ${selectedFindingId === finding.id ? 'is-selected' : ''}`}
          style={{ left: `${18 + (index % 3) * 27}%`, top: `${18 + Math.floor(index / 3) * 24}%` }}
          aria-label={`${finding.ruleId}：${finding.evidence[0]?.description ?? finding.outcome}`}
          onFocus={() => onSelect?.(finding.id)}
          onClick={() => onSelect?.(finding.id)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
