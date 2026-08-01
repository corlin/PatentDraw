import type { DraftJob } from '@patentdraw/contracts';

export function DraftAssetPanel({
  job,
  onSelect,
  onCreateIndependentRevision,
  onCancel,
}: {
  job: DraftJob;
  onSelect?: () => void;
  onCreateIndependentRevision?: () => void;
  onCancel?: () => void;
}) {
  if (job.status === 'invalidated') {
    return (
      <section aria-labelledby="draft-asset-heading">
        <h2 id="draft-asset-heading">Generated draft candidate</h2>
        <p role="alert">Invalidated: {job.reason ?? 'A dependent source or plan changed.'}</p>
        <p>
          This draft remains non-authoritative and cannot be exported or reused until renewed
          review.
        </p>
      </section>
    );
  }

  if (job.status !== 'ready' || !job.asset) {
    return (
      <section aria-label="Draft job status">
        <p role="status">
          Draft job: {job.status} ({job.progressPercent}%)
        </p>
        {(job.status === 'queued' || job.status === 'running') && (
          <button type="button" onClick={onCancel}>
            Cancel draft job
          </button>
        )}
      </section>
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
      <p>Source hashes: {asset.sourceHashes.join(', ')}.</p>
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
