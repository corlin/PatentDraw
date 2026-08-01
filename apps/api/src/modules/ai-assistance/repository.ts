import type {
  AiAuditEvent,
  AiRun,
  DraftJob,
  FigurePlanItemDisposition,
  FigurePlanProposal,
  GeneratedDraftAsset,
} from '@patentdraw/contracts';

import type { AiInvalidation, AuditEvent } from './audit.js';
import type { SourceAuthority } from '../projects-assets/source-authorisation.js';

export type DependencyChangeKind = 'source' | 'scope' | 'figure-plan' | 'linked-revision';

export interface ConfirmedFigurePlanRecord {
  id: string;
  projectId: string;
  purpose: string;
  selectedSources: readonly SourceAuthority[];
  confirmedByActorId: string;
  confirmedAt: string;
}

export interface CanonicalFigureRevisionRecord {
  id: string;
  projectId: string;
  canonicalSvgHash: string;
  sanitized: boolean;
  createdByActorId: string;
  sourceDraftAssetId?: string;
}

export interface DependencyResolution {
  aiRunIds: readonly string[];
  reviewerDecisionIds: readonly string[];
}

export interface DependencyInvalidationBundle {
  invalidation: Readonly<AiInvalidation>;
  invalidatedReviewerDecisionIds: readonly string[];
  auditEvents: readonly Readonly<AuditEvent>[];
}

export interface AiAssistanceRepository {
  saveFigurePlan(input: {
    run: AiRun;
    proposal?: FigurePlanProposal;
    auditEvents: readonly AiAuditEvent[];
    selectedSources: readonly SourceAuthority[];
    scopeIds: readonly string[];
    retentionExpiresAt: string;
  }): Promise<void>;
  saveFigurePlanDispositions(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    items: readonly FigurePlanItemDisposition[];
    recordedAt: string;
  }): Promise<void>;
  getFigurePlanDispositions(
    projectId: string,
    proposalId: string,
  ): Promise<readonly FigurePlanItemDisposition[]>;
  confirmFigurePlan(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    confirmedAt: string;
  }): Promise<ConfirmedFigurePlanRecord>;
  saveConfirmedPlan(plan: ConfirmedFigurePlanRecord): Promise<void>;
  getConfirmedPlan(projectId: string, planId: string): Promise<ConfirmedFigurePlanRecord | null>;
  saveDraft(input: {
    run: AiRun;
    asset: GeneratedDraftAsset;
    auditEvents: readonly AiAuditEvent[];
    retentionExpiresAt: string;
  }): Promise<void>;
  saveDraftJob(projectId: string, job: DraftJob): Promise<void>;
  getDraftJob(projectId: string, jobId: string): Promise<DraftJob | null>;
  saveAuditEvents(events: readonly AiAuditEvent[]): Promise<void>;
  listAuditEvents(projectId: string): Promise<readonly AiAuditEvent[]>;
  registerDependency(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    aiRunIds: readonly string[];
    reviewerDecisionIds: readonly string[];
  }): Promise<void>;
  resolveDependencies(
    projectId: string,
    kind: DependencyChangeKind,
    targetId: string,
  ): Promise<DependencyResolution>;
  resolveAndSaveInvalidation(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    build: (resolution: DependencyResolution) => DependencyInvalidationBundle;
  }): Promise<DependencyInvalidationBundle | null>;
  saveInvalidation(input: {
    projectId: string;
    invalidation: Readonly<AiInvalidation>;
    auditEvents: readonly AiAuditEvent[];
  }): Promise<void>;
  getCanonicalFigureRevision(
    projectId: string,
    revisionId: string,
  ): Promise<CanonicalFigureRevisionRecord | null>;
  saveCanonicalFigureRevision(revision: CanonicalFigureRevisionRecord): Promise<void>;
  saveDraftHandoff(projectId: string, assetId: string, revisionId: string): Promise<void>;
  purgeExpired(now: Date): Promise<number>;
}

export class InMemoryAiAssistanceRepository implements AiAssistanceRepository {
  private readonly runs = new Map<string, { run: AiRun; retentionExpiresAt: string }>();
  private readonly proposals = new Map<
    string,
    {
      proposal: FigurePlanProposal;
      projectId: string;
      selectedSources: readonly SourceAuthority[];
    }
  >();
  private readonly confirmedPlans = new Map<string, ConfirmedFigurePlanRecord>();
  private readonly proposalDispositions = new Map<string, readonly FigurePlanItemDisposition[]>();
  private readonly assets = new Map<string, GeneratedDraftAsset>();
  private readonly jobs = new Map<string, DraftJob>();
  private readonly auditEvents: AiAuditEvent[] = [];
  private readonly dependencies = new Map<string, DependencyResolution>();
  private readonly revisions = new Map<string, CanonicalFigureRevisionRecord>();
  private readonly expiredRuns = new Set<string>();

  async saveFigurePlan(input: {
    run: AiRun;
    proposal?: FigurePlanProposal;
    auditEvents: readonly AiAuditEvent[];
    selectedSources: readonly SourceAuthority[];
    scopeIds: readonly string[];
    retentionExpiresAt: string;
  }): Promise<void> {
    this.assertNewRun(input.run.id);
    this.runs.set(input.run.id, {
      run: structuredClone(input.run),
      retentionExpiresAt: input.retentionExpiresAt,
    });
    if (input.proposal) {
      this.proposals.set(input.proposal.id, {
        proposal: structuredClone(input.proposal),
        projectId: input.run.projectId,
        selectedSources: structuredClone(input.selectedSources),
      });
    }
    await this.saveAuditEvents(input.auditEvents);
    for (const source of input.selectedSources) {
      await this.registerDependency({
        projectId: input.run.projectId,
        kind: 'source',
        targetId: source.id,
        aiRunIds: [input.run.id],
        reviewerDecisionIds: [],
      });
    }
    for (const scopeId of input.scopeIds) {
      await this.registerDependency({
        projectId: input.run.projectId,
        kind: 'scope',
        targetId: scopeId,
        aiRunIds: [input.run.id],
        reviewerDecisionIds: [],
      });
    }
  }

  async confirmFigurePlan(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    confirmedAt: string;
  }): Promise<ConfirmedFigurePlanRecord> {
    const stored = this.proposals.get(input.proposalId);
    if (!stored || stored.projectId !== input.projectId) {
      throw new Error(`FigurePlan proposal ${input.proposalId} was not found in this project.`);
    }
    const dispositions = await this.getFigurePlanDispositions(input.projectId, input.proposalId);
    const requiredIds = stored.proposal.sourceMappings.map((mapping) => mapping.proposalElementId);
    if (
      dispositions.length !== requiredIds.length ||
      requiredIds.some(
        (requiredId) =>
          dispositions.filter((item) => item.proposalElementId === requiredId).length !== 1,
      )
    ) {
      throw new Error('Every FigurePlan proposal item requires exactly one disposition.');
    }
    const confirmed: ConfirmedFigurePlanRecord = {
      id: input.proposalId,
      projectId: input.projectId,
      purpose: stored.proposal.purpose,
      selectedSources: structuredClone(stored.selectedSources),
      confirmedByActorId: input.actorId,
      confirmedAt: input.confirmedAt,
    };
    await this.saveConfirmedPlan(confirmed);
    return confirmed;
  }

  async saveFigurePlanDispositions(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    items: readonly FigurePlanItemDisposition[];
    recordedAt: string;
  }): Promise<void> {
    void input.actorId;
    void input.recordedAt;
    const stored = this.proposals.get(input.proposalId);
    if (!stored || stored.projectId !== input.projectId) {
      throw new Error(`FigurePlan proposal ${input.proposalId} was not found in this project.`);
    }
    const requiredIds = new Set(
      stored.proposal.sourceMappings.map((mapping) => mapping.proposalElementId),
    );
    if (
      input.items.length !== requiredIds.size ||
      input.items.some((item) => !requiredIds.has(item.proposalElementId)) ||
      new Set(input.items.map((item) => item.proposalElementId)).size !== input.items.length
    ) {
      throw new Error('Every FigurePlan proposal item requires exactly one disposition.');
    }
    for (const item of input.items) {
      if (item.disposition === 'edited' && !item.editedValue?.trim()) {
        throw new Error('An edited FigurePlan item requires editedValue.');
      }
      if (
        (item.disposition === 'rejected' || item.disposition === 'open-question') &&
        !item.reason?.trim()
      ) {
        throw new Error('Rejected and open-question items require a reason.');
      }
    }
    const key = this.key(input.projectId, input.proposalId);
    if (this.proposalDispositions.has(key)) {
      throw new Error('FigurePlan dispositions are immutable once recorded.');
    }
    this.proposalDispositions.set(key, structuredClone(input.items));
  }

  async getFigurePlanDispositions(
    projectId: string,
    proposalId: string,
  ): Promise<readonly FigurePlanItemDisposition[]> {
    return structuredClone(this.proposalDispositions.get(this.key(projectId, proposalId)) ?? []);
  }

  async saveConfirmedPlan(plan: ConfirmedFigurePlanRecord): Promise<void> {
    this.confirmedPlans.set(this.key(plan.projectId, plan.id), structuredClone(plan));
  }

  async getConfirmedPlan(
    projectId: string,
    planId: string,
  ): Promise<ConfirmedFigurePlanRecord | null> {
    return structuredClone(this.confirmedPlans.get(this.key(projectId, planId)) ?? null);
  }

  async saveDraft(input: {
    run: AiRun;
    asset: GeneratedDraftAsset;
    auditEvents: readonly AiAuditEvent[];
    retentionExpiresAt: string;
  }): Promise<void> {
    this.assertNewRun(input.run.id);
    this.runs.set(input.run.id, {
      run: structuredClone(input.run),
      retentionExpiresAt: input.retentionExpiresAt,
    });
    this.assets.set(input.asset.id, structuredClone(input.asset));
    await this.saveAuditEvents(input.auditEvents);
    await this.registerDependency({
      projectId: input.run.projectId,
      kind: 'figure-plan',
      targetId: input.asset.confirmedPlanId,
      aiRunIds: [input.run.id],
      reviewerDecisionIds: [],
    });
  }

  async saveDraftJob(projectId: string, job: DraftJob): Promise<void> {
    this.jobs.set(this.key(projectId, job.id), structuredClone(job));
  }

  async getDraftJob(projectId: string, jobId: string): Promise<DraftJob | null> {
    return structuredClone(this.jobs.get(this.key(projectId, jobId)) ?? null);
  }

  async saveAuditEvents(events: readonly AiAuditEvent[]): Promise<void> {
    for (const event of events) {
      if (!this.auditEvents.some((existing) => existing.id === event.id)) {
        this.auditEvents.push(structuredClone(event));
      }
    }
  }

  async listAuditEvents(projectId: string): Promise<readonly AiAuditEvent[]> {
    return structuredClone(
      this.auditEvents
        .filter((event) => event.projectId === projectId)
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
    );
  }

  async registerDependency(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    aiRunIds: readonly string[];
    reviewerDecisionIds: readonly string[];
  }): Promise<void> {
    const key = this.dependencyKey(input.projectId, input.kind, input.targetId);
    const current = this.dependencies.get(key) ?? { aiRunIds: [], reviewerDecisionIds: [] };
    this.dependencies.set(key, {
      aiRunIds: [...new Set([...current.aiRunIds, ...input.aiRunIds])],
      reviewerDecisionIds: [
        ...new Set([...current.reviewerDecisionIds, ...input.reviewerDecisionIds]),
      ],
    });
  }

  async resolveDependencies(
    projectId: string,
    kind: DependencyChangeKind,
    targetId: string,
  ): Promise<DependencyResolution> {
    return structuredClone(
      this.dependencies.get(this.dependencyKey(projectId, kind, targetId)) ?? {
        aiRunIds: [],
        reviewerDecisionIds: [],
      },
    );
  }

  async saveInvalidation(input: {
    projectId: string;
    invalidation: Readonly<AiInvalidation>;
    auditEvents: readonly AiAuditEvent[];
  }): Promise<void> {
    await this.saveAuditEvents(input.auditEvents);
  }

  async resolveAndSaveInvalidation(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    build: (resolution: DependencyResolution) => DependencyInvalidationBundle;
  }): Promise<DependencyInvalidationBundle | null> {
    const dependencies = await this.resolveDependencies(
      input.projectId,
      input.kind,
      input.targetId,
    );
    if (dependencies.aiRunIds.length === 0) return null;
    const result = input.build(dependencies);
    await this.saveInvalidation({
      projectId: input.projectId,
      invalidation: result.invalidation,
      auditEvents: result.auditEvents,
    });
    return result;
  }

  async getCanonicalFigureRevision(
    projectId: string,
    revisionId: string,
  ): Promise<CanonicalFigureRevisionRecord | null> {
    return structuredClone(this.revisions.get(this.key(projectId, revisionId)) ?? null);
  }

  async saveCanonicalFigureRevision(revision: CanonicalFigureRevisionRecord): Promise<void> {
    this.revisions.set(this.key(revision.projectId, revision.id), structuredClone(revision));
  }

  async saveDraftHandoff(projectId: string, assetId: string, revisionId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Draft asset ${assetId} was not found.`);
    this.assets.set(assetId, {
      ...asset,
      independentFigureRevisionId: revisionId,
      exportEligible: false,
    });
    await this.registerDependency({
      projectId,
      kind: 'linked-revision',
      targetId: revisionId,
      aiRunIds: [asset.aiRunId],
      reviewerDecisionIds: [],
    });
  }

  async purgeExpired(now: Date): Promise<number> {
    let purged = 0;
    for (const [id, record] of this.runs) {
      if (Date.parse(record.retentionExpiresAt) <= now.getTime() && !this.expiredRuns.has(id)) {
        this.expiredRuns.add(id);
        purged += 1;
      }
    }
    return purged;
  }

  private assertNewRun(runId: string): void {
    if (this.runs.has(runId)) throw new Error(`AI run ${runId} is immutable and already exists.`);
  }

  private key(projectId: string, id: string): string {
    return `${projectId}:${id}`;
  }

  private dependencyKey(projectId: string, kind: DependencyChangeKind, targetId: string): string {
    return `${projectId}:${kind}:${targetId}`;
  }
}
