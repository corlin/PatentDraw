import { randomUUID } from 'node:crypto';

import type { DraftAssetRequest, DraftJob } from '@patentdraw/contracts';

import {
  createDraftJob,
  handoffToPersistedCanonicalRevision,
  selectDraftAsset,
} from './draft-asset-service.js';
import type { DraftAssetProvider } from './provider.js';
import type { AiAssistanceRepository, ConfirmedFigurePlanRecord } from './repository.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';

export class DraftJobService {
  constructor(
    private readonly repository: AiAssistanceRepository,
    private readonly provider: DraftAssetProvider,
  ) {}

  async enqueue(input: {
    context: ProjectContext;
    request: DraftAssetRequest;
    externalProviderEnabled?: boolean;
  }): Promise<DraftJob> {
    const confirmedPlan = await this.repository.getConfirmedPlan(
      input.request.projectId,
      input.request.confirmedPlanId,
    );
    if (!confirmedPlan) throw new Error('A persisted confirmed FigurePlan is required.');

    const job: DraftJob = {
      id: `job:${randomUUID()}`,
      status: 'queued',
      progressPercent: 0,
    };
    await this.repository.saveDraftJob(input.request.projectId, job);
    queueMicrotask(() => {
      void this.execute(job.id, input.context, input.request, confirmedPlan, {
        ...(input.externalProviderEnabled === undefined
          ? {}
          : { externalProviderEnabled: input.externalProviderEnabled }),
      });
    });
    return job;
  }

  get(projectId: string, jobId: string): Promise<DraftJob | null> {
    return this.repository.getDraftJob(projectId, jobId);
  }

  async cancel(projectId: string, jobId: string): Promise<DraftJob> {
    const job = await this.requireJob(projectId, jobId);
    if (job.status !== 'queued' && job.status !== 'running') return job;
    const cancelled: DraftJob = {
      id: job.id,
      status: 'cancelled',
      progressPercent: job.progressPercent,
    };
    await this.repository.saveDraftJob(projectId, cancelled);
    return cancelled;
  }

  async select(projectId: string, jobId: string): Promise<DraftJob> {
    const selected = selectDraftAsset(await this.requireJob(projectId, jobId));
    await this.repository.saveDraftJob(projectId, selected);
    return selected;
  }

  async reject(projectId: string, jobId: string, reason: string): Promise<DraftJob> {
    const job = await this.requireJob(projectId, jobId);
    if (job.status !== 'ready' || !job.asset) {
      throw new Error('Only a ready draft asset may be rejected.');
    }
    const rejected: DraftJob = {
      id: job.id,
      status: 'rejected',
      progressPercent: 100,
      asset: { ...job.asset, selectionState: 'rejected', exportEligible: false },
      reason,
    };
    await this.repository.saveDraftJob(projectId, rejected);
    return rejected;
  }

  async retry(input: {
    context: ProjectContext;
    jobId: string;
    request: DraftAssetRequest;
  }): Promise<DraftJob> {
    const current = await this.requireJob(input.context.projectId, input.jobId);
    if (!['failed', 'refused', 'cancelled', 'rejected'].includes(current.status)) {
      throw new Error('This draft job state cannot be retried.');
    }
    return this.enqueue({ context: input.context, request: input.request });
  }

  async handoff(projectId: string, jobId: string, revisionId: string) {
    const job = await this.requireJob(projectId, jobId);
    return handoffToPersistedCanonicalRevision({
      repository: this.repository,
      projectId,
      job,
      revisionId,
    });
  }

  private async execute(
    jobId: string,
    context: ProjectContext,
    request: DraftAssetRequest,
    confirmedPlan: ConfirmedFigurePlanRecord,
    options: { externalProviderEnabled?: boolean },
  ): Promise<void> {
    const queued = await this.requireJob(request.projectId, jobId);
    if (queued.status === 'cancelled') return;
    await this.repository.saveDraftJob(request.projectId, {
      id: jobId,
      status: 'running',
      progressPercent: 25,
    });
    try {
      const result = await createDraftJob({
        context,
        request,
        confirmedPlan,
        provider: this.provider,
        repository: this.repository,
        ...(options.externalProviderEnabled === undefined
          ? {}
          : { externalProviderEnabled: options.externalProviderEnabled }),
      });
      const current = await this.requireJob(request.projectId, jobId);
      if (current.status === 'cancelled') return;
      await this.repository.saveDraftJob(request.projectId, {
        ...result,
        id: jobId,
      });
    } catch (error) {
      await this.repository.saveDraftJob(request.projectId, {
        id: jobId,
        status: 'failed',
        progressPercent: 100,
        reason: error instanceof Error ? error.message : 'Draft generation failed.',
      });
    }
  }

  private async requireJob(projectId: string, jobId: string): Promise<DraftJob> {
    const job = await this.repository.getDraftJob(projectId, jobId);
    if (!job) throw new Error(`Draft job ${jobId} was not found.`);
    return job;
  }
}
