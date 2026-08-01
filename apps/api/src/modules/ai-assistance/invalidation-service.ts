import { randomUUID } from 'node:crypto';

import {
  appendAuditEvent,
  createInvalidation,
  type AiInvalidation,
  type AuditEvent,
} from './audit.js';
import type { AiAssistanceRepository, DependencyChangeKind } from './repository.js';

export function invalidateAiDependencies(input: {
  projectId: string;
  changedTargetId: string;
  actorId: string;
  reason: string;
  affectedAiRunIds: readonly string[];
  affectedReviewerDecisionIds: readonly string[];
  changeKind?: DependencyChangeKind;
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
  let auditEvents: readonly Readonly<AuditEvent>[] = [];
  if ((input.changeKind ?? 'source') === 'source') {
    auditEvents = appendAuditEvent(auditEvents, {
      id: `audit:${invalidation.id}:source`,
      eventType: 'source-authorisation-revoked',
      projectId: input.projectId,
      actorId: input.actorId,
      occurredAt,
      targetIds: [input.changedTargetId],
      reason: input.reason,
      metadata: { invalidationId: invalidation.id },
    });
  }
  auditEvents = appendAuditEvent(auditEvents, {
    id: `audit:${invalidation.id}:runs`,
    eventType: 'ai-run-invalidated',
    projectId: input.projectId,
    actorId: input.actorId,
    occurredAt,
    targetIds: [...input.affectedAiRunIds],
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
      targetIds: [...input.affectedReviewerDecisionIds],
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

export async function invalidateDependencyChange(input: {
  repository: AiAssistanceRepository;
  projectId: string;
  kind: DependencyChangeKind;
  changedTargetId: string;
  actorId: string;
  reason: string;
  now?: () => Date;
}) {
  const result = await input.repository.resolveAndSaveInvalidation({
    projectId: input.projectId,
    kind: input.kind,
    targetId: input.changedTargetId,
    build: (dependencies) =>
      invalidateAiDependencies({
        projectId: input.projectId,
        changedTargetId: input.changedTargetId,
        actorId: input.actorId,
        reason: input.reason,
        changeKind: input.kind,
        affectedAiRunIds: dependencies.aiRunIds,
        affectedReviewerDecisionIds: dependencies.reviewerDecisionIds,
        ...(input.now ? { now: input.now } : {}),
      }),
  });
  return (
    result ?? {
      invalidation: null,
      invalidatedReviewerDecisionIds: [],
      auditEvents: [],
    }
  );
}

export class AiDependencyInvalidationHooks {
  constructor(private readonly repository: AiAssistanceRepository) {}

  onSourceChanged(input: ChangeHookInput) {
    return this.invalidate('source', input);
  }

  onScopeChanged(input: ChangeHookInput) {
    return this.invalidate('scope', input);
  }

  onFigurePlanChanged(input: ChangeHookInput) {
    return this.invalidate('figure-plan', input);
  }

  onLinkedRevisionChanged(input: ChangeHookInput) {
    return this.invalidate('linked-revision', input);
  }

  private invalidate(kind: DependencyChangeKind, input: ChangeHookInput) {
    return invalidateDependencyChange({ repository: this.repository, kind, ...input });
  }
}

interface ChangeHookInput {
  projectId: string;
  changedTargetId: string;
  actorId: string;
  reason: string;
  now?: () => Date;
}
