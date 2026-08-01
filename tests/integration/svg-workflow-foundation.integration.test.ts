import { fixtureFigureId, workflowActorIds } from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import { createDeterministicDemoOptions } from '../../apps/api/src/runtime-composition.js';
import { InMemoryIdempotencyRegistry } from '../../apps/api/src/modules/svg-review-export/idempotency.js';
import {
  InMemorySvgWorkflowRepository,
  StaleWorkflowError,
} from '../../apps/api/src/modules/svg-review-export/repository.js';
import { WorkflowCommandError } from '../../apps/api/src/modules/svg-review-export/problems.js';
import { recordWorkflowCommandOutcome } from '../../apps/api/src/modules/svg-review-export/workflow-audit.js';

const projectId = 'project-fixture-pump';

describe('SVG workflow foundation', () => {
  it('advances a projection once and rejects a stale compare-and-swap', async () => {
    const repository = new InMemorySvgWorkflowRepository();
    const updated = await repository.compareAndSwapProjection({
      expectedVersion: 0,
      next: { projectId, figureId: fixtureFigureId },
    });
    expect(updated.version).toBe(1);
    await expect(
      repository.compareAndSwapProjection({
        expectedVersion: 0,
        next: { projectId, figureId: fixtureFigureId },
      }),
    ).rejects.toBeInstanceOf(StaleWorkflowError);
  });

  it('replays the same idempotent request and rejects a changed request', async () => {
    const registry = new InMemoryIdempotencyRegistry();
    let calls = 0;
    const first = await registry.execute({
      projectId,
      key: 'command-01',
      requestHash: 'sha256:request-a',
      operation: async () => ({ calls: ++calls }),
    });
    const replay = await registry.execute({
      projectId,
      key: 'command-01',
      requestHash: 'sha256:request-a',
      operation: async () => ({ calls: ++calls }),
    });
    expect(first).toEqual({ value: { calls: 1 }, replayed: false });
    expect(replay).toEqual({ value: { calls: 1 }, replayed: true });
    await expect(
      registry.execute({
        projectId,
        key: 'command-01',
        requestHash: 'sha256:request-b',
        operation: async () => ({ calls: ++calls }),
      }),
    ).rejects.toMatchObject<Partial<WorkflowCommandError>>({ code: 'idempotency-key-reused' });
  });

  it('records accepted and denied commands as append-only audit evidence', async () => {
    const repository = new InMemorySvgWorkflowRepository();
    await recordWorkflowCommandOutcome(repository, {
      projectId,
      figureId: fixtureFigureId,
      eventType: 'workflow-command-accepted',
      actorId: workflowActorIds.drafter,
      activeRole: 'drafter',
      outcome: 'accepted',
      reasonCode: 'command-accepted',
      reason: 'The command passed its gates.',
      occurredAt: '2026-08-01T00:00:00.000Z',
    });
    await recordWorkflowCommandOutcome(repository, {
      projectId,
      figureId: fixtureFigureId,
      eventType: 'workflow-command-denied',
      actorId: workflowActorIds.technicalReviewer,
      activeRole: 'technical-reviewer',
      outcome: 'denied',
      reasonCode: 'stale-workflow',
      reason: 'The workflow version was stale.',
      occurredAt: '2026-08-01T00:00:01.000Z',
    });
    expect(await repository.listAuditEvents(projectId, fixtureFigureId)).toMatchObject([
      { outcome: 'accepted', reasonCode: 'command-accepted' },
      { outcome: 'denied', reasonCode: 'stale-workflow' },
    ]);
  });

  it('returns a role-aware snapshot for three actors without auditing the read', async () => {
    const options = await createDeterministicDemoOptions();
    const app = await createApp(options);
    try {
      for (const [actorId, availability] of [
        [workflowActorIds.drafter, 'enabled'],
        [workflowActorIds.technicalReviewer, 'waiting'],
        [workflowActorIds.attorneyAgent, 'waiting'],
      ] as const) {
        const response = await app.inject({
          method: 'GET',
          url: `/projects/${projectId}/figures/${fixtureFigureId}/workflow`,
          headers: {
            'x-patentdraw-project-id': projectId,
            'x-patentdraw-actor-id': actorId,
          },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
          version: 0,
          state: 'canonical-revision',
          actor: { id: actorId },
          primaryAction: { action: 'import-revision', availability },
        });
      }
      expect(await options.svgWorkflowRepository?.listAuditEvents(projectId)).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
