import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { groundedFigurePlanResult, hallucinatedFigurePlanResult } from '@patentdraw/fixtures';

import { FigurePlanPanel } from './FigurePlanPanel.js';

describe('FigurePlanPanel', () => {
  const sources = [{ id: 'source-fixture-disclosure-01', label: 'Pump disclosure' }];

  it('shows each source mapping for a proposal and never labels it as a final SVG', () => {
    const html = renderToStaticMarkup(
      <FigurePlanPanel sources={sources} result={groundedFigurePlanResult} />,
    );

    expect(html).toContain('source-fixture-disclosure-01');
    expect(html).toContain('never a final SVG');
    expect(html).toContain('AI-generated planning aid only');
  });

  it('surfaces a manual-review state rather than presenting unsupported content as fact', () => {
    const html = renderToStaticMarkup(
      <FigurePlanPanel sources={sources} result={hallucinatedFigurePlanResult} />,
    );

    expect(html).toContain('manual-review-required');
  });

  it('keeps unresolved details visible as open questions', () => {
    if (groundedFigurePlanResult.status !== 'proposed') {
      throw new Error('Grounded fixture must be a proposal.');
    }
    const resultWithOpenQuestion = {
      ...groundedFigurePlanResult,
      proposal: {
        ...groundedFigurePlanResult.proposal,
        openQuestions: ['Confirm the disclosed seal geometry before drafting.'],
      },
    };
    const html = renderToStaticMarkup(
      <FigurePlanPanel sources={sources} result={resultWithOpenQuestion} />,
    );

    expect(html).toContain('Open questions');
    expect(html).toContain('Confirm the disclosed seal geometry');
  });
});
