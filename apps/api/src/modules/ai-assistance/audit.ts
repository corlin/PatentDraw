export type AuditEventType =
  'ai-run-created' | 'ai-run-invalidated' | 'source-authorisation-revoked';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  projectId: string;
  actorId: string;
  occurredAt: string;
  targetIds: readonly string[];
  reason: string;
  metadata: Readonly<Record<string, string>>;
}

export interface AiInvalidation {
  id: string;
  changedTargetId: string;
  affectedAiRunIds: readonly string[];
  actorId: string;
  occurredAt: string;
  reason: string;
}

export function createAuditEvent(event: AuditEvent): Readonly<AuditEvent> {
  return Object.freeze({
    ...event,
    targetIds: Object.freeze([...event.targetIds]),
    metadata: Object.freeze({ ...event.metadata }),
  });
}

export function appendAuditEvent(
  events: readonly Readonly<AuditEvent>[],
  event: AuditEvent,
): readonly Readonly<AuditEvent>[] {
  return Object.freeze([...events, createAuditEvent(event)]);
}

export function createInvalidation(input: AiInvalidation): Readonly<AiInvalidation> {
  return Object.freeze({
    ...input,
    affectedAiRunIds: Object.freeze([...input.affectedAiRunIds]),
  });
}
