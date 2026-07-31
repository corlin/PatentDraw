import type { DraftJob } from '@patentdraw/contracts';

export function DraftAssetPanel({
  job,
  onSelect,
  onCreateIndependentRevision,
}: {
  job: DraftJob;
  onSelect?: () => void;
  onCreateIndependentRevision?: () => void;
}) {
  if (job.status !== 'ready' || !job.asset) {
    return (
      <p role="status">
        Draft job: {job.status} ({job.progressPercent}%)
      </p>
    );
  }

  const asset = job.asset;
  return (
    <section aria-labelledby="draft-asset-heading">
      <h2 id="draft-asset-heading">Generated draft candidate</h2>
      <p role="alert">{asset.limitationLabel}: this asset cannot be exported as a patent figure.</p>
      <p>
        Selection: {asset.selectionState}; export eligible: {String(asset.exportEligible)}.
      </p>
      <button type="button" disabled={asset.selectionState !== 'unselected'} onClick={onSelect}>
        Select draft for reference
      </button>
      <button
        type="button"
        disabled={asset.selectionState !== 'selected'}
        onClick={onCreateIndependentRevision}
      >
        Create independent canonical SVG revision
      </button>
      {asset.independentFigureRevisionId && (
        <p>Independent FigureRevision handoff: {asset.independentFigureRevisionId}</p>
      )}
    </section>
  );
}
