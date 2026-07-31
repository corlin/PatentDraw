import { createHash, randomUUID } from 'node:crypto';

import type { AiRun, FigurePlanRequest, FigurePlanResult } from '@patentdraw/contracts';

import { appendAuditEvent, type AuditEvent } from './audit.js';
import { assertFigurePlanRequestSecurity, enforceFigurePlanPolicy } from './figure-plan-policy.js';
import type { FigurePlanProvider } from './provider.js';
import { assertNoTrainingDataUse } from './provider-policy.js';
import {
  assertAuthorisedSourceSelection,
  type ProjectContext,
} from '../projects-assets/source-authorisation.js';

export interface FigurePlanServiceInput {
  context: ProjectContext;
  request: FigurePlanRequest;
  provider: FigurePlanProvider;
  now?: () => Date;
  runId?: string;
}

export interface FigurePlanServiceResponse {
  run: Readonly<AiRun>;
  result: FigurePlanResult;
  auditEvents: readonly Readonly<AuditEvent>[];
}

export async function requestFigurePlan(
  input: FigurePlanServiceInput,
): Promise<FigurePlanServiceResponse> {
  if (input.context.projectId !== input.request.projectId) {
    throw new Error('The request project does not match the authenticated project context.');
  }

  assertFigurePlanRequestSecurity(input.request);
  assertAuthorisedSourceSelection({
    context: input.context,
    selectedSources: input.request.selectedSources,
    consent: input.request.consent,
  });
  assertNoTrainingDataUse(input.provider.dataUsePolicy, input.request.consent);

  const requestInputHash = hashCanonicalRequest(input.request);
  const rawResult = await input.provider.proposeFigurePlan(input.request);
  const result = enforceFigurePlanPolicy(rawResult, input.request.selectedSources);
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const run: AiRun = {
    id: input.runId ?? randomUUID(),
    projectId: input.request.projectId,
    actorId: input.context.actorId,
    requestInputHash,
    provider: input.provider.provider,
    model: input.provider.model,
    modelVersion: input.provider.modelVersion,
    instructionVersion: input.request.instructionVersion,
    selectedSourceHashes: input.request.selectedSources.map((source) => source.contentHash).sort(),
    consentRecordId: input.request.consent.id,
    outputHash: hashValue(result),
    status: result.status,
    limitationState: limitationStateFor(result),
    createdAt,
  };
  const auditEvents = appendAuditEvent([], {
    id: `audit:${run.id}`,
    eventType: 'ai-run-created',
    projectId: run.projectId,
    actorId: run.actorId,
    occurredAt: createdAt,
    targetIds: [run.id],
    reason: `FigurePlan ${result.status}.`,
    metadata: {
      requestInputHash: run.requestInputHash,
      outputHash: run.outputHash ?? '',
      consentRecordId: run.consentRecordId,
      provider: run.provider,
      modelVersion: run.modelVersion,
    },
  });

  return { run: Object.freeze(run), result, auditEvents };
}

function hashCanonicalRequest(request: FigurePlanRequest): string {
  return hashValue({
    projectId: request.projectId,
    selectedSources: [...request.selectedSources].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    figurePurpose: request.figurePurpose,
    allowedScope: [...request.allowedScope].sort(),
    assistanceType: request.assistanceType,
    instructionVersion: request.instructionVersion,
    consentRecordId: request.consent.id,
  });
}

function hashValue(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function limitationStateFor(result: FigurePlanResult): string {
  return result.status === 'proposed' ? 'source-mapped-proposal' : result.status;
}
