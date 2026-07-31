import { AiAuditEventSchema, AiInvalidationSchema } from '../../packages/contracts/src/index.js';
import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

describe('AI audit contract', () => {
  it('requires an immutable source, actor, time, and provenance reference for audit events', () => {
    expect(
      Value.Check(AiAuditEventSchema, {
        id: 'audit-fixture-01',
        eventType: 'ai-run-invalidated',
        projectId: 'project-fixture-pump',
        actorId: 'attorney-fixture-01',
        occurredAt: '2026-07-31T00:00:00.000Z',
        targetIds: ['run-fixture-01'],
        reason: 'Authorised source was revoked.',
        metadata: { changedTargetId: 'source-fixture-disclosure-01' },
      }),
    ).toBe(true);
  });

  it('requires every invalidation to identify its changed target and affected runs', () => {
    expect(
      Value.Check(AiInvalidationSchema, {
        id: 'invalidation-fixture-01',
        changedTargetId: 'source-fixture-disclosure-01',
        affectedAiRunIds: ['run-fixture-01'],
        actorId: 'attorney-fixture-01',
        occurredAt: '2026-07-31T00:00:00.000Z',
        reason: 'Authorisation revoked.',
      }),
    ).toBe(true);
  });
});
