import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NextActionCard } from './NextActionCard.js';
import { RuleRunPanel } from './RuleRunPanel.js';
import { SanitizationReport } from './SanitizationReport.js';
import { SvgRevisionPanel } from './SvgRevisionPanel.js';

describe('SVG workflow P1 panels', () => {
  it('renders revision metadata and sanitization issues', () => {
    expect(renderToStaticMarkup(<SvgRevisionPanel revision={undefined} />)).toContain('导入');
    expect(
      renderToStaticMarkup(
        <SanitizationReport
          run={{
            status: 'rejected',
            issues: [
              {
                code: 'script-element',
                outcome: 'rejected',
                explanation: 'Active script is forbidden.',
              },
            ],
          }}
        />,
      ),
    ).toContain('script-element');
  });

  it('renders findings and a server-provided primary action', () => {
    const html = renderToStaticMarkup(
      <RuleRunPanel
        run={{
          id: 'run-01',
          profileId: 'CNIPA-2026.1',
          profileVersion: '1',
          findings: [
            {
              id: 'finding-01',
              ruleRunId: 'run-01',
              ruleId: 'CNIPA-FIG-003',
              officialSource: {
                title: 'CNIPA Guidelines',
                url: 'https://www.cnipa.gov.cn/example',
                section: '7.3',
                snapshotHash: `sha256:${'a'.repeat(64)}`,
                effectiveFrom: '2026-01-01',
              },
              evaluatedInput: {
                kind: 'geometry',
                inputHash: `sha256:${'b'.repeat(64)}`,
                description: 'Left margin geometry',
              },
              predicateOrReviewPolicy: 'Geometry must remain inside the margin.',
              outcome: 'fail',
              severity: 'blocking',
              remediation: { summary: 'Move geometry inside the margin.' },
              evidence: [{ kind: 'sheet-region', description: 'Left margin' }],
            },
          ],
        }}
      />,
    );
    expect(html).toContain('CNIPA-FIG-003');
    expect(html).toContain('Move geometry inside the margin');
    expect(
      renderToStaticMarkup(
        <NextActionCard
          action={{
            action: 'run-checks',
            label: '运行规则检查',
            availability: 'enabled',
            blockingGates: [],
          }}
        />,
      ),
    ).toContain('运行规则检查');
  });
});
