import { DOMParser } from '@xmldom/xmldom';
import { createHash } from 'node:crypto';

import type { SvgSanitizationRun } from '@patentdraw/contracts';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ELEMENTS = 10_000;
const MAX_DEPTH = 128;
const MAX_ATTRIBUTES = 50_000;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
type XmlDocument = ReturnType<DOMParser['parseFromString']>;
type XmlElement = NonNullable<XmlDocument['documentElement']>;

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'line',
  'polyline',
  'polygon',
  'rect',
  'circle',
  'ellipse',
  'text',
  'tspan',
  'defs',
  'marker',
  'clipPath',
  'title',
  'desc',
]);

const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
  'filter',
  'image',
  'audio',
  'video',
  'iframe',
  'object',
  'embed',
  'use',
]);

const ALLOWED_ATTRIBUTES = new Set([
  'xmlns',
  'id',
  'class',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'transform',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'marker-start',
  'marker-mid',
  'marker-end',
  'clip-path',
  'orient',
  'markerWidth',
  'markerHeight',
  'refX',
  'refY',
]);

export interface SanitizedSvgResult {
  status: 'accepted' | 'rejected';
  canonicalSvg?: string;
  canonicalSvgHash?: `sha256:${string}`;
  viewBox?: readonly [number, number, number, number];
  widthMm?: number;
  heightMm?: number;
  textState: 'live-text' | 'outlined-text' | 'mixed';
  issues: SvgSanitizationRun['issues'];
  detected: SvgSanitizationRun['detected'];
}

export function sanitizeSvg(svgText: string): SanitizedSvgResult {
  const issues: SvgSanitizationRun['issues'] = [];
  const detected: SvgSanitizationRun['detected'] = {
    externalResources: 0,
    eventHandlers: 0,
    scriptElements: 0,
    foreignObjects: 0,
    rasterEmbeds: 0,
    unsupportedElements: [],
    textState: 'outlined-text',
  };

  if (Buffer.byteLength(svgText, 'utf8') > MAX_BYTES) {
    return rejected('input-too-large', 'SVG input exceeds the 5 MiB limit.', issues, detected);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(svgText)) {
    return rejected(
      'dtd-or-entity',
      'DTD and entity declarations are forbidden.',
      issues,
      detected,
    );
  }
  if (/<\?/i.test(svgText)) {
    return rejected(
      'processing-instruction',
      'XML processing instructions are forbidden.',
      issues,
      detected,
    );
  }

  const parserProblems: string[] = [];
  let document: XmlDocument;
  try {
    document = new DOMParser({
      onError(level, message) {
        if (level !== 'warning') parserProblems.push(message);
      },
    }).parseFromString(svgText, 'image/svg+xml');
  } catch (error) {
    parserProblems.push(error instanceof Error ? error.message : 'Malformed XML.');
    return rejected('malformed-xml', parserProblems.join(' '), issues, detected);
  }
  if (parserProblems.length > 0 || !document.documentElement) {
    return rejected(
      'malformed-xml',
      parserProblems.join(' ') || 'Malformed XML.',
      issues,
      detected,
    );
  }

  const root = document.documentElement!;
  if (root.tagName !== 'svg' || root.namespaceURI !== SVG_NAMESPACE) {
    return rejected(
      'invalid-svg-root',
      'The root must be an SVG element in the SVG namespace.',
      issues,
      detected,
    );
  }
  const dimensions = parseDimensions(root);
  if (!dimensions) {
    return rejected(
      'invalid-sheet-dimensions',
      'SVG width and height must use millimetres and viewBox must contain four finite values with positive size.',
      issues,
      detected,
    );
  }

  let elementCount = 0;
  let attributeCount = 0;
  let hasLiveText = false;
  const walk = (element: XmlElement, depth: number, path: string): string | null => {
    elementCount += 1;
    attributeCount += element.attributes.length;
    if (elementCount > MAX_ELEMENTS || attributeCount > MAX_ATTRIBUTES || depth > MAX_DEPTH) {
      issues.push({
        code: 'complexity-limit',
        outcome: 'rejected',
        elementPath: path,
        explanation: 'SVG exceeds the element, attribute or nesting limit.',
      });
      return null;
    }

    const name = element.tagName;
    if (element.namespaceURI !== SVG_NAMESPACE || FORBIDDEN_ELEMENTS.has(name)) {
      if (name === 'script') detected.scriptElements += 1;
      if (name === 'foreignObject') detected.foreignObjects += 1;
      if (name === 'image') detected.rasterEmbeds += 1;
      detected.unsupportedElements.push(name);
      issues.push({
        code: forbiddenCode(name),
        outcome: 'rejected',
        elementPath: path,
        explanation: `Element <${name}> is not permitted in secure-static SVG.`,
      });
      return null;
    }
    if (!ALLOWED_ELEMENTS.has(name)) {
      detected.unsupportedElements.push(name);
      issues.push({
        code: 'unsupported-element',
        outcome: 'rejected',
        elementPath: path,
        explanation: `Element <${name}> is outside the reviewed allowlist.`,
      });
      return null;
    }
    if (name === 'text' || name === 'tspan') hasLiveText = true;

    const attributes: [string, string][] = [];
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index)!;
      const attributeName = attribute.name;
      const value = attribute.value.trim();
      if (/^on/i.test(attributeName)) {
        detected.eventHandlers += 1;
        issues.push({
          code: 'event-handler',
          outcome: 'rejected',
          elementPath: path,
          explanation: `Event attribute ${attributeName} is forbidden.`,
        });
        return null;
      }
      if (attributeName === 'style' || attributeName === 'href' || attributeName === 'xlink:href') {
        if (/^(?:https?:|data:|file:|javascript:|\/\/)/i.test(value)) {
          detected.externalResources += 1;
        }
        issues.push({
          code: attributeName === 'style' ? 'style-attribute' : 'external-resource',
          outcome: 'rejected',
          elementPath: path,
          explanation: `${attributeName} is not permitted in the secure-static profile.`,
        });
        return null;
      }
      if (!ALLOWED_ATTRIBUTES.has(attributeName)) {
        issues.push({
          code: 'unsupported-attribute',
          outcome: 'rejected',
          elementPath: path,
          explanation: `Attribute ${attributeName} is outside the reviewed allowlist.`,
        });
        return null;
      }
      if (attributeName !== 'xmlns' && hasUnsafeUrl(value)) {
        detected.externalResources += 1;
        issues.push({
          code: 'external-resource',
          outcome: 'rejected',
          elementPath: path,
          explanation: `Attribute ${attributeName} contains an external or unsafe URL.`,
        });
        return null;
      }
      attributes.push([attributeName, normalizeWhitespace(value)]);
    }
    attributes.sort(([left], [right]) => left.localeCompare(right));

    const children: string[] = [];
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes.item(index)!;
      if (child.nodeType === 1) {
        const childElement = child as XmlElement;
        const serialized = walk(
          childElement,
          depth + 1,
          `${path}/${childElement.tagName}[${index + 1}]`,
        );
        if (serialized === null) return null;
        children.push(serialized);
      } else if (child.nodeType === 3) {
        const text = child.nodeValue ?? '';
        if (text.trim()) {
          if (!['text', 'tspan', 'title', 'desc'].includes(name)) {
            issues.push({
              code: 'unexpected-text-node',
              outcome: 'rejected',
              elementPath: path,
              explanation: 'Text nodes are allowed only in reviewed text-bearing elements.',
            });
            return null;
          }
          children.push(escapeXml(normalizeWhitespace(text)));
        }
      } else if (child.nodeType === 8) {
        issues.push({
          code: 'comment-removed',
          outcome: 'removed',
          elementPath: path,
          explanation: 'XML comments are removed from canonical SVG.',
        });
      }
    }
    const serializedAttributes = attributes
      .map(([attributeName, value]) => ` ${attributeName}="${escapeXml(value)}"`)
      .join('');
    return `<${name}${serializedAttributes}>${children.join('')}</${name}>`;
  };

  const canonicalSvg = walk(root, 1, '/svg[1]');
  if (!canonicalSvg || issues.some((issue) => issue.outcome === 'rejected')) {
    detected.textState = hasLiveText ? 'live-text' : 'outlined-text';
    return { status: 'rejected', textState: detected.textState, issues, detected };
  }
  detected.textState = hasLiveText ? 'live-text' : 'outlined-text';
  return {
    status: 'accepted',
    canonicalSvg,
    canonicalSvgHash: hash(canonicalSvg),
    viewBox: dimensions.viewBox,
    widthMm: dimensions.widthMm,
    heightMm: dimensions.heightMm,
    textState: detected.textState,
    issues,
    detected,
  };
}

function parseDimensions(root: XmlElement): {
  widthMm: number;
  heightMm: number;
  viewBox: readonly [number, number, number, number];
} | null {
  const width = /^(\d+(?:\.\d+)?)mm$/.exec(root.getAttribute('width') ?? '');
  const height = /^(\d+(?:\.\d+)?)mm$/.exec(root.getAttribute('height') ?? '');
  const viewBox = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !width ||
    !height ||
    viewBox.length !== 4 ||
    viewBox.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  const [x, y, viewWidth, viewHeight] = viewBox as [number, number, number, number];
  const widthMm = Number(width[1]);
  const heightMm = Number(height[1]);
  if (widthMm <= 0 || heightMm <= 0 || viewWidth <= 0 || viewHeight <= 0) return null;
  return { widthMm, heightMm, viewBox: [x, y, viewWidth, viewHeight] };
}

function rejected(
  code: string,
  explanation: string,
  issues: SvgSanitizationRun['issues'],
  detected: SvgSanitizationRun['detected'],
): SanitizedSvgResult {
  issues.push({ code, outcome: 'rejected', explanation });
  return { status: 'rejected', textState: detected.textState, issues, detected };
}

function forbiddenCode(name: string): string {
  if (name === 'script') return 'script-element';
  if (name === 'foreignObject') return 'foreign-object';
  if (name === 'image') return 'raster-embed';
  if (name === 'filter') return 'filter-graph';
  if (name.startsWith('animate') || name === 'set') return 'animation-element';
  return 'forbidden-element';
}

function hasUnsafeUrl(value: string): boolean {
  if (/javascript:|data:|file:|https?:|\/\//i.test(value)) return true;
  const urlMatches = [...value.matchAll(/url\(([^)]+)\)/gi)];
  return urlMatches.some((match) => !/^['"]?#[A-Za-z_][\w:.-]*['"]?$/.test(match[1]!.trim()));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function hash(content: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}
