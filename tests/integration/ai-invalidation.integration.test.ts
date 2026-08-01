import { authorisedProjectContext } from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../apps/api/src/app.js';
import {
  AiDependencyInvalidationHooks,
  invalidateAiDependencies,
} from '../../apps/api/src/modules/ai-assistance/invalidation-service.js';
import {
  InMemoryAiAssistanceRepository,
  type DependencyChangeKind,
} from '../../apps/api/src/modules/ai-assistance/repository.js';

describe('AI invalidation chain', () => {
  it('records source-authorisation revocation without deleting earlier evidence', () => {
    const result = invalidateAiDependencies({
      projectId: authorisedProjectContext.projectId,
      changedTargetId: 'source-fixture-disclosure-01',
      actorId: 'attorney-fixture-01',
      reason: 'The source authorisation was revoked.',
      affectedAiRunIds: ['run-fixture-figure-plan-01', 'run-fixture-draft-01'],
      affectedReviewerDecisionIds: ['decision-fixture-01'],
      now: () => new Date('2026-07-31T00:00:00.000Z'),
    });

    expect(result.invalidation.affectedAiRunIds).toHaveLength(2);
    expect(result.invalidatedReviewerDecisionIds).toEqual(['decision-fixture-01']);
    expect(result.auditEvents.map((event) => event.eventType)).toEqual([
      'source-authorisation-revoked',
      'ai-run-invalidated',
      'reviewer-decision-invalidated',
    ]);
    expect(Object.isFrozen(result.auditEvents[0])).toBe(true);
  });

  it('exposes the immutable audit view only to a project-scoped reviewer role', async () => {
    const reviewerContext = { ...authorisedProjectContext, roles: ['technical-reviewer'] as const };
    const app = await createApp({
      resolveProjectContext: async () => reviewerContext,
      resolveAiAuditEvents: async () => [
        {
          id: 'audit-fixture-01',
          eventType: 'ai-run-invalidated' as const,
          projectId: reviewerContext.projectId,
          actorId: reviewerContext.actorId,
          occurredAt: '2026-07-31T00:00:00.000Z',
          targetIds: ['run-fixture-01'],
          reason: 'Source changed.',
          metadata: { changedTargetId: 'source-fixture-disclosure-01' },
        },
      ],
    });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${reviewerContext.projectId}/ai-audit`,
        headers: {
          'x-patentdraw-project-id': reviewerContext.projectId,
          'x-patentdraw-actor-id': reviewerContext.actorId,
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().events).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it.each([
    ['source', 'source-fixture-disclosure-01'],
    ['scope', 'scope-fixture-housing'],
    ['figure-plan', 'proposal-fixture-grounded-01'],
    ['linked-revision', 'revision-fixture-svg-01'],
  ] as const)(
    'resolves and invalidates %s dependencies without caller-supplied run ids',
    async (kind, targetId) => {
      const repository = new InMemoryAiAssistanceRepository();
      await repository.registerDependency({
        projectId: authorisedProjectContext.projectId,
        kind: kind as DependencyChangeKind,
        targetId,
        aiRunIds: [`run-${kind}`],
        reviewerDecisionIds: [`decision-${kind}`],
      });
      const hooks = new AiDependencyInvalidationHooks(repository);
      const input = {
        projectId: authorisedProjectContext.projectId,
        changedTargetId: targetId,
        actorId: authorisedProjectContext.actorId,
        reason: `${kind} changed.`,
        now: () => new Date('2026-07-31T00:00:00.000Z'),
      };
      const result =
        kind === 'source'
          ? await hooks.onSourceChanged(input)
          : kind === 'scope'
            ? await hooks.onScopeChanged(input)
            : kind === 'figure-plan'
              ? await hooks.onFigurePlanChanged(input)
              : await hooks.onLinkedRevisionChanged(input);
      expect(result.invalidation?.affectedAiRunIds).toEqual([`run-${kind}`]);
      expect(result.invalidatedReviewerDecisionIds).toEqual([`decision-${kind}`]);
      expect(
        (await repository.listAuditEvents(authorisedProjectContext.projectId)).some(
          (event) => event.eventType === 'ai-run-invalidated',
        ),
      ).toBe(true);
    },
  );
});
