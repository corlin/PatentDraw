export type AuditEventType =
  | 'ai-run-created'
  | 'ai-run-invalidated'
  | 'source-authorisation-revoked'
  | 'reviewer-decision-invalidated'
  | 'privileged-audit-read';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  projectId: string;
  actorId: string;
  occurredAt: string;
  targetIds: string[];
  reason: string;
  metadata: Record<string, string>;
  provenance?: {
    provider: string;
    model: string;
    modelVersion: string;
    instructionVersion: string;
    requestInputHash: string;
    selectedSourceHashes: string[];
    consentRecordId: string;
    outputHash: string;
    limitationState: string;
    retentionExpiresAt: string;
  };
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
  const frozen = {
    ...event,
    targetIds: Object.freeze([...event.targetIds]),
    metadata: Object.freeze({ ...event.metadata }),
    ...(event.provenance
      ? {
          provenance: Object.freeze({
            ...event.provenance,
            selectedSourceHashes: Object.freeze([...event.provenance.selectedSourceHashes]),
          }),
        }
      : {}),
  };
  return Object.freeze(frozen) as Readonly<AuditEvent>;
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
