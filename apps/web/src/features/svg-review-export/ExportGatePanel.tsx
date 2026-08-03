import type { ExportCandidate, ExportPackage } from '@patentdraw/contracts';

export function ExportGatePanel({
  candidate,
  attorneyDecisionId,
  packageRecord,
  busy,
  canExport,
  onExport,
}: {
  candidate: ExportCandidate;
  attorneyDecisionId: string;
  packageRecord?: ExportPackage | undefined;
  busy: boolean;
  canExport: boolean;
  onExport: () => void;
}) {
  return (
    <section className="export-gate-panel" aria-labelledby="export-gate-heading">
      <p className="eyebrow">批准链已绑定</p>
      <h3 id="export-gate-heading">生成 SVG + 清单</h3>
      <dl className="review-metadata">
        <div>
          <dt>候选指纹</dt>
          <dd>{candidate.candidateFingerprint}</dd>
        </div>
        <div>
          <dt>代理人决定</dt>
          <dd>{attorneyDecisionId}</dd>
        </div>
        <div>
          <dt>CNIPA 标签</dt>
          <dd>{candidate.cnipaAssessment.label}</dd>
        </div>
      </dl>
      <p className="boundary-note">导出为经复核的附图资产；不是官方电子申请包，也不是提交事件。</p>
      {packageRecord ? (
        <p className="success-copy">不可变导出包已生成：{packageRecord.id}</p>
      ) : (
        <button
          type="button"
          className="primary-action"
          disabled={!canExport || busy}
          onClick={onExport}
        >
          生成 SVG + 清单
        </button>
      )}
    </section>
  );
}
