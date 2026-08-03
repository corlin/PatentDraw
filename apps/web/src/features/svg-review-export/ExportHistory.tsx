import type { ExportPackage } from '@patentdraw/contracts';

export function ExportHistory({ packages }: { packages: readonly ExportPackage[] }) {
  return (
    <section className="export-history" aria-labelledby="export-history-heading">
      <p className="eyebrow">只追加记录</p>
      <h3 id="export-history-heading">导出历史</h3>
      {packages.length === 0 ? (
        <p>尚无导出包。</p>
      ) : (
        <ol>
          {packages.map((item) => {
            const base = `/api/projects/${item.projectId}/figures/${item.figureId}/export-packages/${item.id}`;
            return (
              <li key={item.id}>
                <strong>{item.id}</strong>
                <span>{item.createdAt}</span>
                <code>{item.svgHash}</code>
                <a href={`${base}/svg`} download>
                  下载 SVG
                </a>
                <a href={`${base}/manifest`} download>
                  下载清单
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
