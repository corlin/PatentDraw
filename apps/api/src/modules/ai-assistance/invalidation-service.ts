import { randomUUID } from 'node:crypto';

import {
  appendAuditEvent,
  createInvalidation,
  type AiInvalidation,
  type AuditEvent,
} from './audit.js';

export function invalidateAiDependencies(input: {
  projectId: string;
  changedTargetId: string;
  actorId: string;
  reason: string;
  affectedAiRunIds: readonly string[];
  affectedReviewerDecisionIds: readonly string[];
  now?: () => Date;
}): {
  invalidation: Readonly<AiInvalidation>;
  invalidatedReviewerDecisionIds: readonly string[];
  auditEvents: readonly Readonly<AuditEvent>[];
} {
  if (input.affectedAiRunIds.length === 0) {
    throw new Error('Invalidation requires at least one affected AI run.');
  }
  const occurredAt = (input.now ?? (() => new Date()))().toISOString();
  const invalidation = createInvalidation({
    id: randomUUID(),
    changedTargetId: input.changedTargetId,
    affectedAiRunIds: input.affectedAiRunIds,
    actorId: input.actorId,
    occurredAt,
    reason: input.reason,
  });
  let auditEvents = appendAuditEvent([], {
    id: `audit:${invalidation.id}:source`,
    eventType: 'source-authorisation-revoked',
    projectId: input.projectId,
    actorId: input.actorId,
    occurredAt,
    targetIds: [input.changedTargetId],
    reason: input.reason,
    metadata: { invalidationId: invalidation.id },
  });
  auditEvents = appendAuditEvent(auditEvents, {
    id: `audit:${invalidation.id}:runs`,
    eventType: 'ai-run-invalidated',
    projectId: input.projectId,
    actorId: input.actorId,
    occurredAt,
    targetIds: input.affectedAiRunIds,
    reason: input.reason,
    metadata: { invalidationId: invalidation.id, changedTargetId: input.changedTargetId },
  });
  if (input.affectedReviewerDecisionIds.length > 0) {
    auditEvents = appendAuditEvent(auditEvents, {
      id: `audit:${invalidation.id}:decisions`,
      eventType: 'reviewer-decision-invalidated',
      projectId: input.projectId,
      actorId: input.actorId,
      occurredAt,
      targetIds: input.affectedReviewerDecisionIds,
      reason: input.reason,
      metadata: { invalidationId: invalidation.id, changedTargetId: input.changedTargetId },
    });
  }
  return {
    invalidation,
    invalidatedReviewerDecisionIds: Object.freeze([...input.affectedReviewerDecisionIds]),
    auditEvents,
  };
}
