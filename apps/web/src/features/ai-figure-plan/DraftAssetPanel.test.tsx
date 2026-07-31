import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { fixtureDraftAsset } from '@patentdraw/fixtures';

import { DraftAssetPanel } from './DraftAssetPanel.js';

describe('DraftAssetPanel', () => {
  it('labels a generated draft as non-authoritative and not exportable', () => {
    const html = renderToStaticMarkup(
      <DraftAssetPanel
        job={{
          id: 'job-fixture-01',
          status: 'ready',
          progressPercent: 100,
          asset: fixtureDraftAsset,
        }}
      />,
    );

    expect(html).toContain('non-authoritative-ai-draft');
    expect(html).toContain('cannot be exported');
    expect(html).toContain('export eligible: false');
  });

  it('makes an invalidated draft visibly unusable', () => {
    const html = renderToStaticMarkup(
      <DraftAssetPanel
        job={{
          id: 'job-fixture-invalidated',
          status: 'invalidated',
          progressPercent: 100,
          asset: fixtureDraftAsset,
          reason: 'A selected source changed.',
        }}
      />,
    );

    expect(html).toContain('Invalidated');
    expect(html).toContain('cannot be exported or reused');
  });
});
