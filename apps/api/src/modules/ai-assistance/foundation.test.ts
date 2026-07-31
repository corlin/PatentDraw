import {
  authorisedFigurePlanRequest,
  authorisedProjectContext,
  groundedFigurePlanResult,
  unauthorisedProjectContext,
} from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { appendAuditEvent, createAuditEvent } from './audit.js';
import { DeterministicFigurePlanProvider } from './provider.js';
import {
  assertAuthorisedSourceSelection,
  SourceAuthorisationError,
} from '../projects-assets/source-authorisation.js';

describe('AI assistance foundation', () => {
  it('requires source authority and no-training consent before a provider request', async () => {
    expect(() =>
      assertAuthorisedSourceSelection({
        context: authorisedProjectContext,
        selectedSources: authorisedFigurePlanRequest.selectedSources,
        consent: authorisedFigurePlanRequest.consent,
      }),
    ).not.toThrow();

    expect(() =>
      assertAuthorisedSourceSelection({
        context: unauthorisedProjectContext,
        selectedSources: authorisedFigurePlanRequest.selectedSources,
        consent: authorisedFigurePlanRequest.consent,
      }),
    ).toThrow(SourceAuthorisationError);

    const provider = new DeterministicFigurePlanProvider(groundedFigurePlanResult);
    await expect(provider.proposeFigurePlan(authorisedFigurePlanRequest)).resolves.toEqual(
      groundedFigurePlanResult,
    );
  });

  it('appends frozen audit evidence rather than changing an earlier record', () => {
    const event = createAuditEvent({
      id: 'audit-fixture-01',
      eventType: 'ai-run-created',
      projectId: authorisedProjectContext.projectId,
      actorId: authorisedProjectContext.actorId,
      occurredAt: '2026-07-31T00:00:00.000Z',
      targetIds: ['run-fixture-01'],
      reason: 'Fixture run requested.',
      metadata: { requestInputHash: 'sha256:fixture-request' },
    });

    const appended = appendAuditEvent([], event);
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.targetIds)).toBe(true);
    expect(appended).toHaveLength(1);
  });

  it('attaches a resolved project context only from explicit request identity headers', async () => {
    const app = await createApp({
      resolveProjectContext: async (identity) =>
        identity.projectId === authorisedProjectContext.projectId ? authorisedProjectContext : null,
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-patentdraw-project-id': authorisedProjectContext.projectId,
          'x-patentdraw-actor-id': authorisedProjectContext.actorId,
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
