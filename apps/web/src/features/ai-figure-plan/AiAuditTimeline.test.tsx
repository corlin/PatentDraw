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
            provenance: {
              provider: 'fixture-provider',
              model: 'fixture-model',
              modelVersion: 'v1',
              instructionVersion: 'fixture-instruction-v1',
              requestInputHash: 'sha256:request',
              selectedSourceHashes: ['sha256:source'],
              consentRecordId: 'consent-fixture-01',
              outputHash: 'sha256:output',
              limitationState: 'source-mapped-proposal',
              retentionExpiresAt: '2026-08-30T00:00:00.000Z',
            },
          },
        ]}
      />,
    );
    expect(html).toContain('ai-run-invalidated');
    expect(html).toContain('attorney-fixture-01');
    expect(html).toContain('Source authorisation was revoked.');
    expect(html).toContain('fixture-provider');
    expect(html).toContain('sha256:source');
    expect(html).toContain('consent-fixture-01');
    expect(html).toContain('source-mapped-proposal');
  });
});
