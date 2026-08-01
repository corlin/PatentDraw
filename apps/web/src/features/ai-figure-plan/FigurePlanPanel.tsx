import { useMemo, useState, type FormEvent } from 'react';

import type { FigurePlanResult } from '@patentdraw/contracts';

export interface SelectableSource {
  id: string;
  label: string;
}

export interface FigurePlanPanelProps {
  sources: readonly SelectableSource[];
  result?: FigurePlanResult | undefined;
  onRequest?: (input: { purpose: string; selectedSourceIds: readonly string[] }) => void;
}

export function FigurePlanPanel({ sources, result, onRequest }: FigurePlanPanelProps) {
  const [purpose, setPurpose] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<readonly string[]>([]);
  const canRequest = purpose.trim().length > 0 && selectedSourceIds.length > 0;
  const selectionSummary = useMemo(
    () =>
      `${selectedSourceIds.length} authorised source${selectedSourceIds.length === 1 ? '' : 's'} selected`,
    [selectedSourceIds.length],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canRequest) {
      onRequest?.({ purpose: purpose.trim(), selectedSourceIds });
    }
  }

  function toggleSource(sourceId: string, checked: boolean) {
    setSelectedSourceIds((current) =>
      checked ? [...current, sourceId] : current.filter((id) => id !== sourceId),
    );
  }

  return (
    <section aria-labelledby="figure-plan-heading">
      <h2 id="figure-plan-heading">Source-grounded FigurePlan</h2>
      <p>
        AI assistance produces a reviewable proposal, never a final SVG, approval, or filing claim.
      </p>

      <form onSubmit={submit}>
        <fieldset>
          <legend>Authorised sources</legend>
          {sources.map((source) => (
            <label key={source.id}>
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(source.id)}
                onChange={(event) => toggleSource(source.id, event.target.checked)}
              />
              {source.label}
            </label>
          ))}
        </fieldset>
        <p>{selectionSummary}</p>
        <label>
          Figure purpose
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} />
        </label>
        <button type="submit" disabled={!canRequest}>
          Request FigurePlan
        </button>
      </form>

      <FigurePlanReview result={result} />
    </section>
  );
}

function FigurePlanReview({ result }: { result: FigurePlanResult | undefined }) {
  if (!result) {
    return (
      <p role="status">Select authorised sources and state the figure purpose to begin review.</p>
    );
  }

  if (result.status !== 'proposed') {
    return (
      <p role="alert">
        {result.status}: {result.reason}
      </p>
    );
  }

  return (
    <section aria-label="FigurePlan review">
      <h3>Proposal for review</h3>
      <p>{result.proposal.purpose}</p>
      <ul>
        {result.proposal.sourceMappings.map((mapping) => (
          <li key={mapping.proposalElementId}>
            {mapping.proposalElementId} — {mapping.sourceAssetId} ({mapping.locationReference})
          </li>
        ))}
      </ul>
      {result.proposal.openQuestions.length > 0 && (
        <p>Open questions: {result.proposal.openQuestions.join('; ')}</p>
      )}
      <p>Limitations: {result.proposal.limitations.join('; ')}</p>
    </section>
  );
}
