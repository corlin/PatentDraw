import { describe, expect, it } from 'vitest';

import { sanitizeSvg } from './svg-sanitizer.js';

const clean =
  '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="figure"><path stroke="#000" fill="none" d="M20 20 L80 20"/><text x="30" y="40">100</text></g></svg>';

describe('secure-static SVG sanitizer', () => {
  it('accepts and deterministically serializes a bounded clean SVG', () => {
    const first = sanitizeSvg(clean);
    const second = sanitizeSvg(clean);
    expect(first.status).toBe('accepted');
    expect(first.canonicalSvg).toBe(second.canonicalSvg);
    expect(first.canonicalSvgHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.viewBox).toEqual([0, 0, 210, 297]);
  });

  it.each([
    ['DTD/entity', '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg/>'],
    ['script', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ['event handler', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'],
    [
      'external URL',
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://bad.test/a"/></svg>',
    ],
    ['foreign object', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'],
    ['animation', '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x"/></svg>'],
    ['filter graph', '<svg xmlns="http://www.w3.org/2000/svg"><filter id="x"/></svg>'],
    [
      'raster',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AA=="/></svg>',
    ],
    [
      'invalid dimensions',
      '<svg xmlns="http://www.w3.org/2000/svg" width="210" height="297" viewBox="0 0 0 297"/>',
    ],
  ])('rejects %s before canonical storage', (_label, svgText) => {
    const result = sanitizeSvg(svgText);
    expect(result.status).toBe('rejected');
    expect(result.canonicalSvg).toBeUndefined();
    expect(result.issues.some((issue) => issue.outcome === 'rejected')).toBe(true);
  });

  it('rejects input larger than five MiB', () => {
    expect(sanitizeSvg(`<svg>${' '.repeat(5 * 1024 * 1024)}</svg>`).status).toBe('rejected');
  });
});
