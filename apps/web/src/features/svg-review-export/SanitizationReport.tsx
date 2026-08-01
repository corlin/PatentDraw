import type { SvgSanitizationRun } from '@patentdraw/contracts';

type SanitizationReportView = Pick<SvgSanitizationRun, 'status' | 'issues'> &
  Partial<Pick<SvgSanitizationRun, 'id' | 'inputBlobHash' | 'canonicalSvgHash' | 'detected'>>;

export function SanitizationReport({ run }: { run?: SanitizationReportView | undefined }) {
  if (!run) return <p className="empty-copy">尚未运行 SVG 安全清洗。</p>;
  return (
    <section
      className={`sanitization-report is-${run.status}`}
      aria-labelledby="sanitization-title"
    >
      <h3 id="sanitization-title">安全清洗：{run.status === 'accepted' ? '已接受' : '已拒绝'}</h3>
      {run.canonicalSvgHash && <p className="mono">规范 SVG：{run.canonicalSvgHash}</p>}
      {run.issues.length === 0 ? (
        <p role="status">未发现被移除或拒绝的构造。</p>
      ) : (
        <ul>
          {run.issues.map((issue, index) => (
            <li key={`${issue.code}:${issue.elementPath ?? index}`}>
              <strong>{issue.code}</strong> · {issue.outcome}
              {issue.elementPath ? ` · ${issue.elementPath}` : ''}
              <span>{issue.explanation}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
