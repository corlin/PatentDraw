import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AiAuditTimeline } from './AiAuditTimeline.js';

describe('AiAuditTimeline', () => {
  it('shows provenance, actor, time, and the invalidation reason', () => {
    const html = renderToStaticMarkup(
      <AiAuditTimeline
        events={[
          {
            id: 'audit-fixture-01',
            eventType: 'ai-run-invalidated',
            projectId: 'project-fixture-pump',
            actorId: 'attorney-fixture-01',
            occurredAt: '2026-07-31T00:00:00.000Z',
            targetIds: ['run-fixture-01'],
            reason: 'Source authorisation was revoked.',
            metadata: { changedTargetId: 'source-fixture-disclosure-01' },
          },
        ]}
      />,
    );
    expect(html).toContain('ai-run-invalidated');
    expect(html).toContain('attorney-fixture-01');
    expect(html).toContain('Source authorisation was revoked.');
  });
});
