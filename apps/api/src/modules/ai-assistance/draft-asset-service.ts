import { createHash, randomUUID } from 'node:crypto';

import type { AiRun, DraftAssetRequest, DraftHandoffResult, DraftJob } from '@patentdraw/contracts';

import { appendAuditEvent } from './audit.js';
import type { DraftAssetProvider } from './provider.js';
import {
  assertDraftProviderGate,
  DEFAULT_PROVIDER_OPERATIONAL_CONTROLS,
  executeWithProviderControls,
  type ProviderOperationalControls,
} from './provider-policy.js';
import type { AiAssistanceRepository, ConfirmedFigurePlanRecord } from './repository.js';
import {
  assertAuthorisedSourceSelection,
  type ProjectContext,
} from '../projects-assets/source-authorisation.js';

export type ConfirmedFigurePlan = ConfirmedFigurePlanRecord;

export interface IndependentFigureRevision {
  id: string;
  canonicalSvgHash: string;
  createdIndependently: true;
}

export async function createDraftJob(input: {
  context: ProjectContext;
  request: DraftAssetRequest;
  confirmedPlan: ConfirmedFigurePlan;
  provider: DraftAssetProvider;
  externalProviderEnabled?: boolean;
  repository?: AiAssistanceRepository;
  controls?: ProviderOperationalControls;
  now?: () => Date;
  runId?: string;
}): Promise<DraftJob> {
  if (
    input.context.projectId !== input.request.projectId ||
    input.confirmedPlan.projectId !== input.request.projectId
  ) {
    throw new Error(
      'Draft request, confirmed plan, and authenticated context must belong to one project.',
    );
  }
  if (input.confirmedPlan.id !== input.request.confirmedPlanId) {
    throw new Error('A draft request requires the confirmed FigurePlan it names.');
  }
  assertDraftProviderGate({
    mode: input.provider.mode,
    policy: input.provider.dataUsePolicy,
    consent: input.request.consent,
    externalProviderEnabled: input.externalProviderEnabled,
  });
  assertAuthorisedSourceSelection({
    context: input.context,
    selectedSources: input.confirmedPlan.selectedSources,
    consent: input.request.consent,
  });

  const controls = input.controls ?? DEFAULT_PROVIDER_OPERATIONAL_CONTROLS;
  const providerAsset = await executeWithProviderControls(
    () => input.provider.createDraftAsset(input.request),
    controls,
  );
  if (providerAsset.confirmedPlanId !== input.confirmedPlan.id || providerAsset.exportEligible) {
    throw new Error(
      'Draft provider returned an asset outside the confirmed-plan non-exportable boundary.',
    );
  }

  const now = (input.now ?? (() => new Date()))();
  const createdAt = now.toISOString();
  const retentionExpiresAt = new Date(
    now.getTime() + controls.retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const run: AiRun = {
    id: input.runId ?? randomUUID(),
    projectId: input.request.projectId,
    actorId: input.context.actorId,
    requestInputHash: hashValue(input.request),
    provider: input.provider.provider,
    model: input.provider.model,
    modelVersion: input.provider.modelVersion,
    instructionVersion: input.request.instructionVersion,
    selectedSourceHashes: input.confirmedPlan.selectedSources
      .map((source) => source.contentHash)
      .sort(),
    consentRecordId: input.request.consent.id,
    outputHash: hashValue(providerAsset),
    status: 'proposed',
    limitationState: 'non-authoritative-ai-draft',
    createdAt,
    retentionExpiresAt,
  };
  const asset = {
    ...providerAsset,
    id: `draft:${run.id}`,
    aiRunId: run.id,
    sourceHashes: run.selectedSourceHashes,
    exportEligible: false as const,
  };
  const auditEvents = appendAuditEvent([], {
    id: `audit:${run.id}`,
    eventType: 'ai-run-created',
    projectId: run.projectId,
    actorId: run.actorId,
    occurredAt: run.createdAt,
    targetIds: [run.id, asset.id],
    reason: 'Non-authoritative draft asset created.',
    metadata: { assetId: asset.id, confirmedPlanId: asset.confirmedPlanId },
    provenance: {
      provider: run.provider,
      model: run.model,
      modelVersion: run.modelVersion,
      instructionVersion: run.instructionVersion,
      requestInputHash: run.requestInputHash,
      selectedSourceHashes: run.selectedSourceHashes,
      consentRecordId: run.consentRecordId,
      outputHash: run.outputHash ?? hashValue(providerAsset),
      limitationState: run.limitationState,
      retentionExpiresAt: run.retentionExpiresAt,
    },
  });
  if (input.repository) {
    await input.repository.saveDraft({ run, asset, auditEvents, retentionExpiresAt });
  }

  return { id: `job:${asset.id}`, status: 'ready', progressPercent: 100, asset };
}

export function cancelDraftJob(job: DraftJob): DraftJob {
  if (job.status !== 'queued' && job.status !== 'running') {
    return job;
  }
  return { id: job.id, status: 'cancelled', progressPercent: job.progressPercent };
}

export function invalidateDraftJob(job: DraftJob, reason: string): DraftJob {
  if (job.status === 'invalidated') return job;
  return { ...job, status: 'invalidated', reason };
}

export function selectDraftAsset(job: DraftJob): DraftJob {
  if (job.status !== 'ready' || !job.asset) {
    throw new Error('Only a ready draft asset can be selected.');
  }
  return { ...job, asset: { ...job.asset, selectionState: 'selected', exportEligible: false } };
}

export function handoffToIndependentFigureRevision(
  job: DraftJob,
  revision: IndependentFigureRevision,
): DraftJob {
  if (job.status !== 'ready' || !job.asset || job.asset.selectionState !== 'selected') {
    throw new Error('Only a selected draft asset can be handed off to an independent revision.');
  }
  if (!revision.createdIndependently || !revision.canonicalSvgHash) {
    throw new Error('The handoff target must be an independently created canonical SVG revision.');
  }
  return {
    ...job,
    asset: { ...job.asset, independentFigureRevisionId: revision.id, exportEligible: false },
  };
}

export async function handoffToPersistedCanonicalRevision(input: {
  repository: AiAssistanceRepository;
  projectId: string;
  job: DraftJob;
  revisionId: string;
}): Promise<DraftHandoffResult> {
  if (
    input.job.status !== 'ready' ||
    !input.job.asset ||
    input.job.asset.selectionState !== 'selected'
  ) {
    throw new Error('Only a selected, ready draft asset can be handed off.');
  }
  const revision = await input.repository.getCanonicalFigureRevision(
    input.projectId,
    input.revisionId,
  );
  if (
    !revision ||
    !revision.sanitized ||
    !revision.canonicalSvgHash ||
    revision.sourceDraftAssetId
  ) {
    throw new Error(
      'The handoff target must be a sanitized, separately persisted canonical SVG revision.',
    );
  }
  await input.repository.saveDraftHandoff(input.projectId, input.job.asset.id, revision.id);
  return {
    jobId: input.job.id,
    assetId: input.job.asset.id,
    canonicalFigureRevisionId: revision.id,
    exportEligible: false,
  };
}

function hashValue(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}
