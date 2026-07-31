import type { DraftAssetRequest, DraftJob } from '@patentdraw/contracts';

import type { DraftAssetProvider } from './provider.js';
import { assertDraftProviderGate } from './provider-policy.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';

export interface ConfirmedFigurePlan {
  id: string;
  projectId: string;
}

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

  const asset = await input.provider.createDraftAsset(input.request);
  if (asset.confirmedPlanId !== input.confirmedPlan.id || asset.exportEligible) {
    throw new Error(
      'Draft provider returned an asset outside the confirmed-plan non-exportable boundary.',
    );
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
