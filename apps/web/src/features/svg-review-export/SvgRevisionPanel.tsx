import type { FigureRevision } from '@patentdraw/contracts';

export function SvgRevisionPanel({
  revision,
  history = [],
}: {
  revision?: FigureRevision | undefined;
  history?: readonly FigureRevision[];
}) {
  if (!revision) {
    return (
      <section className="revision-panel">
        <h3>规范 SVG 修订</h3>
        <p>导入一个带毫米尺寸和 viewBox 的安全静态 SVG，AI 草图不会被直接晋升。</p>
      </section>
    );
  }
  return (
    <section className="revision-panel" aria-labelledby="revision-heading">
      <h3 id="revision-heading">当前规范修订</h3>
      <dl className="metadata-grid">
        <div>
          <dt>修订 ID</dt>
          <dd>{revision.id}</dd>
        </div>
        <div>
          <dt>父修订</dt>
          <dd>{revision.parentRevisionId ?? '首个修订'}</dd>
        </div>
        <div>
          <dt>SVG 哈希</dt>
          <dd className="mono">{revision.canonicalSvgHash}</dd>
        </div>
        <div>
          <dt>纸张</dt>
          <dd>
            {revision.sheet.standard} · {revision.sheet.widthMm} × {revision.sheet.heightMm} mm
          </dd>
        </div>
        <div>
          <dt>viewBox</dt>
          <dd>{revision.sheet.viewBox.join(' ')}</dd>
        </div>
        <div>
          <dt>规则档案</dt>
          <dd>
            {revision.initialRuleProfile.id} / {revision.initialRuleProfile.version}
          </dd>
        </div>
      </dl>
      {history.length > 1 && (
        <details>
          <summary>修订历史（{history.length}）</summary>
          <ol>
            {history.map((item) => (
              <li key={item.id}>
                {item.id}
                {item.id === revision.id ? ' · 当前' : ''}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
