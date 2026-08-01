import type { ProjectRole, WorkflowAuditEvent } from '@patentdraw/contracts';
import { randomUUID } from 'node:crypto';

import type { SvgWorkflowRepository } from './repository.js';

export interface WorkflowAuditInput {
  projectId: string;
  figureId: string;
  eventType: string;
  actorId: string;
  activeRole: ProjectRole;
  targetIds?: readonly string[];
  outcome: 'accepted' | 'denied';
  reasonCode: string;
  reason: string;
  fingerprints?: Readonly<Record<string, string>>;
  occurredAt?: string;
}

export async function recordWorkflowCommandOutcome(
  repository: SvgWorkflowRepository,
  input: WorkflowAuditInput,
): Promise<WorkflowAuditEvent> {
  const event: WorkflowAuditEvent = {
    id: `workflow-audit:${randomUUID()}`,
    projectId: input.projectId,
    eventType: input.eventType,
    actorId: input.actorId,
    activeRole: input.activeRole,
    targetIds: [input.figureId, ...(input.targetIds ?? [])],
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    reason: input.reason,
    fingerprints: { ...(input.fingerprints ?? {}) },
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  await repository.saveAuditEvents([event]);
  return event;
}
