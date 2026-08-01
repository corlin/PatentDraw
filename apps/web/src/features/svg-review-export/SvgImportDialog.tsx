import { useState, type ChangeEvent } from 'react';

export function SvgImportDialog({
  busy,
  currentRevisionId,
  onImport,
}: {
  busy: boolean;
  currentRevisionId?: string | undefined;
  onImport: (svgText: string, filename: string) => void;
}) {
  const [svgText, setSvgText] = useState('');
  const [filename, setFilename] = useState('');

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setSvgText(await file.text());
  }

  async function loadFixture(version: 'v1' | 'v2' | 'review-corrected') {
    const path = `/fixtures/pump-${version}.svg`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`无法读取 ${path}`);
    setFilename(`pump-${version}.svg`);
    setSvgText(await response.text());
  }

  return (
    <section className="import-panel" aria-labelledby="svg-import-heading">
      <h3 id="svg-import-heading">{currentRevisionId ? '创建后继修订' : '导入规范 SVG'}</h3>
      <p>上限 5 MiB；拒绝脚本、事件、外部资源、foreignObject、动画、滤镜与栅格嵌入。</p>
      <div className="fixture-actions">
        <button type="button" onClick={() => void loadFixture('v1')}>
          载入泵 v1 示例
        </button>
        <button type="button" onClick={() => void loadFixture('v2')}>
          载入泵 v2 修正版
        </button>
        {currentRevisionId && (
          <button type="button" onClick={() => void loadFixture('review-corrected')}>
            载入技术退回修正版
          </button>
        )}
      </div>
      <label className="file-control">
        选择 SVG 文件
        <input
          type="file"
          accept="image/svg+xml,.svg"
          onChange={(event) => void chooseFile(event)}
        />
      </label>
      <p className="selected-file">{filename || '尚未选择文件'}</p>
      <button
        type="button"
        className="primary-action"
        disabled={busy || !svgText}
        onClick={() => onImport(svgText, filename || 'import.svg')}
      >
        {busy ? '正在安全清洗…' : currentRevisionId ? '创建并选择新修订' : '导入并选择修订'}
      </button>
    </section>
  );
}
