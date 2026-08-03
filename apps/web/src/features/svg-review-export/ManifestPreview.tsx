import type { ExportManifest } from '@patentdraw/contracts';

export function ManifestPreview({ manifest }: { manifest: ExportManifest }) {
  return (
    <section className="manifest-preview" aria-labelledby="manifest-preview-heading">
      <p className="eyebrow">规范化导出清单</p>
      <h3 id="manifest-preview-heading">Manifest 审计链</h3>
      <dl className="review-metadata">
        <div>
          <dt>包</dt>
          <dd>{manifest.packageId}</dd>
        </div>
        <div>
          <dt>修订</dt>
          <dd>{manifest.revision.id}</dd>
        </div>
        <div>
          <dt>技术决定</dt>
          <dd>{manifest.review.technicalDecisionId}</dd>
        </div>
        <div>
          <dt>代理人决定</dt>
          <dd>{manifest.review.attorneyDecisionId}</dd>
        </div>
      </dl>
      <h4>Artifacts</h4>
      {manifest.artifacts.map((artifact) => (
        <p key={artifact.path}>
          <strong>{artifact.path}</strong> · {artifact.sha256} · {artifact.byteLength} bytes
        </p>
      ))}
      <h4>限制</h4>
      <ul>
        {manifest.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
