import type { Pool, PoolClient } from 'pg';

import type {
  AiAuditEvent,
  AiRun,
  DraftJob,
  FigurePlanItemDisposition,
  FigurePlanProposal,
  GeneratedDraftAsset,
} from '@patentdraw/contracts';

import type { AiInvalidation } from '../modules/ai-assistance/audit.js';
import type {
  AiAssistanceRepository,
  CanonicalFigureRevisionRecord,
  ConfirmedFigurePlanRecord,
  DependencyChangeKind,
  DependencyInvalidationBundle,
  DependencyResolution,
} from '../modules/ai-assistance/repository.js';
import type { SourceAuthority } from '../modules/projects-assets/source-authorisation.js';

export class PostgresAiAssistanceRepository implements AiAssistanceRepository {
  constructor(private readonly pool: Pool) {}

  async saveFigurePlan(input: {
    run: AiRun;
    proposal?: FigurePlanProposal;
    auditEvents: readonly AiAuditEvent[];
    selectedSources: readonly SourceAuthority[];
    scopeIds: readonly string[];
    retentionExpiresAt: string;
  }): Promise<void> {
    await this.transaction(async (client) => {
      await this.insertRun(client, input.run, input.retentionExpiresAt);
      if (input.proposal) {
        await client.query(
          `INSERT INTO figure_plan_proposals
           (id, ai_run_id, purpose, views, components, signs, open_questions, limitations,
            selected_sources, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            input.proposal.id,
            input.run.id,
            input.proposal.purpose,
            JSON.stringify(input.proposal.views),
            JSON.stringify(input.proposal.components),
            JSON.stringify(input.proposal.signs),
            JSON.stringify(input.proposal.openQuestions),
            JSON.stringify(input.proposal.limitations),
            JSON.stringify(input.selectedSources),
            input.run.createdAt,
          ],
        );
        for (const mapping of input.proposal.sourceMappings) {
          await client.query(
            `INSERT INTO figure_plan_source_mappings
             (id, proposal_id, proposal_element_id, source_asset_id, source_asset_hash, location_reference, limitation)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              `${input.proposal.id}:${mapping.proposalElementId}`,
              input.proposal.id,
              mapping.proposalElementId,
              mapping.sourceAssetId,
              mapping.sourceAssetHash,
              mapping.locationReference,
              mapping.limitation ?? null,
            ],
          );
        }
      }
      await this.insertAuditEvents(client, input.auditEvents);
      for (const source of input.selectedSources) {
        await this.insertDependency(client, input.run.projectId, 'source', source.id, input.run.id);
      }
      for (const scopeId of input.scopeIds) {
        await this.insertDependency(client, input.run.projectId, 'scope', scopeId, input.run.id);
      }
    });
  }

  async confirmFigurePlan(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    confirmedAt: string;
  }): Promise<ConfirmedFigurePlanRecord> {
    return this.transaction(async (client) => {
      const proposal = await client.query<{
        purpose: string;
        selected_sources: SourceAuthority[];
      }>(
        `SELECT proposal.purpose, proposal.selected_sources
         FROM figure_plan_proposals proposal
         JOIN ai_runs run ON run.id=proposal.ai_run_id
         WHERE proposal.id=$1 AND run.project_id=$2
         FOR SHARE`,
        [input.proposalId, input.projectId],
      );
      const row = proposal.rows[0];
      if (!row) {
        throw new Error(`FigurePlan proposal ${input.proposalId} was not found in this project.`);
      }
      const dispositionCoverage = await client.query<{
        required_count: number;
        actual_count: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM figure_plan_source_mappings WHERE proposal_id=$1) AS required_count,
           (SELECT COUNT(*)::int FROM figure_plan_dispositions WHERE proposal_id=$1) AS actual_count`,
        [input.proposalId],
      );
      if (
        !dispositionCoverage.rows[0] ||
        dispositionCoverage.rows[0].required_count !== dispositionCoverage.rows[0].actual_count
      ) {
        throw new Error('Every FigurePlan proposal item requires exactly one disposition.');
      }
      const confirmed: ConfirmedFigurePlanRecord = {
        id: input.proposalId,
        projectId: input.projectId,
        purpose: row.purpose,
        selectedSources: row.selected_sources,
        confirmedByActorId: input.actorId,
        confirmedAt: input.confirmedAt,
      };
      await client.query(
        `INSERT INTO confirmed_figure_plans
         (id, project_id, confirmed_by_actor_id, confirmed_at, purpose, selected_sources)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          confirmed.id,
          confirmed.projectId,
          confirmed.confirmedByActorId,
          confirmed.confirmedAt,
          confirmed.purpose,
          JSON.stringify(confirmed.selectedSources),
        ],
      );
      return confirmed;
    });
  }

  async saveFigurePlanDispositions(input: {
    projectId: string;
    proposalId: string;
    actorId: string;
    items: readonly FigurePlanItemDisposition[];
    recordedAt: string;
  }): Promise<void> {
    await this.transaction(async (client) => {
      const required = await client.query<{ proposal_element_id: string }>(
        `SELECT mapping.proposal_element_id
         FROM figure_plan_source_mappings mapping
         JOIN figure_plan_proposals proposal ON proposal.id=mapping.proposal_id
         JOIN ai_runs run ON run.id=proposal.ai_run_id
         WHERE mapping.proposal_id=$1 AND run.project_id=$2`,
        [input.proposalId, input.projectId],
      );
      const requiredIds = new Set(required.rows.map((row) => row.proposal_element_id));
      if (
        input.items.length !== requiredIds.size ||
        input.items.some((item) => !requiredIds.has(item.proposalElementId)) ||
        new Set(input.items.map((item) => item.proposalElementId)).size !== input.items.length
      ) {
        throw new Error('Every FigurePlan proposal item requires exactly one disposition.');
      }
      for (const item of input.items) {
        await client.query(
          `INSERT INTO figure_plan_dispositions
           (proposal_id, proposal_element_id, disposition, edited_value, reason,
            actor_id, recorded_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            input.proposalId,
            item.proposalElementId,
            item.disposition,
            item.editedValue ?? null,
            item.reason ?? null,
            input.actorId,
            input.recordedAt,
          ],
        );
      }
    });
  }

  async getFigurePlanDispositions(
    projectId: string,
    proposalId: string,
  ): Promise<readonly FigurePlanItemDisposition[]> {
    const result = await this.pool.query<{
      proposal_element_id: string;
      disposition: FigurePlanItemDisposition['disposition'];
      edited_value: string | null;
      reason: string | null;
    }>(
      `SELECT disposition.proposal_element_id, disposition.disposition,
              disposition.edited_value, disposition.reason
       FROM figure_plan_dispositions disposition
       JOIN figure_plan_proposals proposal ON proposal.id=disposition.proposal_id
       JOIN ai_runs run ON run.id=proposal.ai_run_id
       WHERE disposition.proposal_id=$1 AND run.project_id=$2
       ORDER BY disposition.proposal_element_id`,
      [proposalId, projectId],
    );
    return result.rows.map((row) => ({
      proposalElementId: row.proposal_element_id,
      disposition: row.disposition,
      ...(row.edited_value ? { editedValue: row.edited_value } : {}),
      ...(row.reason ? { reason: row.reason } : {}),
    }));
  }

  async saveConfirmedPlan(plan: ConfirmedFigurePlanRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO confirmed_figure_plans
       (id, project_id, confirmed_by_actor_id, confirmed_at, purpose, selected_sources)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        plan.id,
        plan.projectId,
        plan.confirmedByActorId,
        plan.confirmedAt,
        plan.purpose,
        JSON.stringify(plan.selectedSources),
      ],
    );
  }

  async getConfirmedPlan(
    projectId: string,
    planId: string,
  ): Promise<ConfirmedFigurePlanRecord | null> {
    const result = await this.pool.query<{
      id: string;
      project_id: string;
      purpose: string;
      selected_sources: ConfirmedFigurePlanRecord['selectedSources'];
      confirmed_by_actor_id: string;
      confirmed_at: Date;
    }>(
      `SELECT id, project_id, purpose, selected_sources, confirmed_by_actor_id, confirmed_at
       FROM confirmed_figure_plans WHERE project_id=$1 AND id=$2`,
      [projectId, planId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          projectId: row.project_id,
          purpose: row.purpose,
          selectedSources: row.selected_sources,
          confirmedByActorId: row.confirmed_by_actor_id,
          confirmedAt: row.confirmed_at.toISOString(),
        }
      : null;
  }

  async saveDraft(input: {
    run: AiRun;
    asset: GeneratedDraftAsset;
    auditEvents: readonly AiAuditEvent[];
    retentionExpiresAt: string;
  }): Promise<void> {
    await this.transaction(async (client) => {
      await this.insertRun(client, input.run, input.retentionExpiresAt);
      await client.query(
        `INSERT INTO generated_draft_assets
         (id, ai_run_id, confirmed_plan_id, blob_hash, limitation_label, selection_state,
          export_eligible, independent_figure_revision_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,$8)`,
        [
          input.asset.id,
          input.run.id,
          input.asset.confirmedPlanId,
          input.asset.blobHash,
          input.asset.limitationLabel,
          input.asset.selectionState,
          input.asset.independentFigureRevisionId ?? null,
          input.run.createdAt,
        ],
      );
      await this.insertAuditEvents(client, input.auditEvents);
      await this.insertDependency(
        client,
        input.run.projectId,
        'figure-plan',
        input.asset.confirmedPlanId,
        input.run.id,
      );
    });
  }

  async saveDraftJob(projectId: string, job: DraftJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO draft_jobs (id, project_id, status, progress_percent, payload, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,
       progress_percent=EXCLUDED.progress_percent, payload=EXCLUDED.payload, updated_at=NOW()`,
      [job.id, projectId, job.status, job.progressPercent, JSON.stringify(job)],
    );
  }

  async getDraftJob(projectId: string, jobId: string): Promise<DraftJob | null> {
    const result = await this.pool.query<{ payload: DraftJob }>(
      'SELECT payload FROM draft_jobs WHERE project_id=$1 AND id=$2',
      [projectId, jobId],
    );
    return result.rows[0]?.payload ?? null;
  }

  async saveAuditEvents(events: readonly AiAuditEvent[]): Promise<void> {
    await this.transaction((client) => this.insertAuditEvents(client, events));
  }

  async listAuditEvents(projectId: string): Promise<readonly AiAuditEvent[]> {
    const result = await this.pool.query<{ payload: AiAuditEvent }>(
      'SELECT payload FROM ai_audit_events WHERE project_id=$1 ORDER BY occurred_at, id',
      [projectId],
    );
    return result.rows.map((row) => row.payload);
  }

  async registerDependency(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    aiRunIds: readonly string[];
    reviewerDecisionIds: readonly string[];
  }): Promise<void> {
    await this.transaction(async (client) => {
      for (const runId of input.aiRunIds) {
        await this.insertDependency(client, input.projectId, input.kind, input.targetId, runId);
      }
      for (const decisionId of input.reviewerDecisionIds) {
        await client.query(
          `INSERT INTO ai_dependencies
           (project_id, change_kind, target_id, reviewer_decision_id)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [input.projectId, input.kind, input.targetId, decisionId],
        );
      }
    });
  }

  async resolveDependencies(
    projectId: string,
    kind: DependencyChangeKind,
    targetId: string,
  ): Promise<DependencyResolution> {
    const result = await this.pool.query<{
      ai_run_id: string | null;
      reviewer_decision_id: string | null;
    }>(
      `SELECT ai_run_id, reviewer_decision_id FROM ai_dependencies
       WHERE project_id=$1 AND change_kind=$2 AND target_id=$3`,
      [projectId, kind, targetId],
    );
    return {
      aiRunIds: [...new Set(result.rows.flatMap((row) => (row.ai_run_id ? [row.ai_run_id] : [])))],
      reviewerDecisionIds: [
        ...new Set(
          result.rows.flatMap((row) =>
            row.reviewer_decision_id ? [row.reviewer_decision_id] : [],
          ),
        ),
      ],
    };
  }

  async resolveAndSaveInvalidation(input: {
    projectId: string;
    kind: DependencyChangeKind;
    targetId: string;
    build: (resolution: DependencyResolution) => DependencyInvalidationBundle;
  }): Promise<DependencyInvalidationBundle | null> {
    return this.transaction(async (client) => {
      const dependencies = await this.resolveDependenciesWithClient(
        client,
        input.projectId,
        input.kind,
        input.targetId,
      );
      if (dependencies.aiRunIds.length === 0) return null;
      const result = input.build(dependencies);
      await this.insertInvalidation(client, input.projectId, result.invalidation);
      await this.insertAuditEvents(client, result.auditEvents);
      return result;
    });
  }

  async saveInvalidation(input: {
    projectId: string;
    invalidation: Readonly<AiInvalidation>;
    auditEvents: readonly AiAuditEvent[];
  }): Promise<void> {
    await this.transaction(async (client) => {
      await this.insertInvalidation(client, input.projectId, input.invalidation);
      await this.insertAuditEvents(client, input.auditEvents);
    });
  }

  async getCanonicalFigureRevision(
    projectId: string,
    revisionId: string,
  ): Promise<CanonicalFigureRevisionRecord | null> {
    const result = await this.pool.query<CanonicalFigureRevisionRecord>(
      `SELECT id, project_id AS "projectId", canonical_svg_hash AS "canonicalSvgHash",
       sanitized, created_by_actor_id AS "createdByActorId",
       source_draft_asset_id AS "sourceDraftAssetId"
       FROM canonical_figure_revisions WHERE project_id=$1 AND id=$2`,
      [projectId, revisionId],
    );
    return result.rows[0] ?? null;
  }

  async saveCanonicalFigureRevision(revision: CanonicalFigureRevisionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO canonical_figure_revisions
       (id, project_id, canonical_svg_hash, sanitized, created_by_actor_id, source_draft_asset_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        revision.id,
        revision.projectId,
        revision.canonicalSvgHash,
        revision.sanitized,
        revision.createdByActorId,
        revision.sourceDraftAssetId ?? null,
      ],
    );
  }

  async saveDraftHandoff(projectId: string, assetId: string, revisionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE generated_draft_assets SET independent_figure_revision_id=$1
       WHERE id=$2 AND export_eligible=FALSE`,
      [revisionId, assetId],
    );
    const run = await this.pool.query<{ ai_run_id: string }>(
      'SELECT ai_run_id FROM generated_draft_assets WHERE id=$1',
      [assetId],
    );
    if (run.rows[0]) {
      await this.registerDependency({
        projectId,
        kind: 'linked-revision',
        targetId: revisionId,
        aiRunIds: [run.rows[0].ai_run_id],
        reviewerDecisionIds: [],
      });
    }
  }

  async purgeExpired(now: Date): Promise<number> {
    const result = await this.pool.query<{ ai_run_id: string }>(
      `INSERT INTO ai_retention_events (ai_run_id, expired_at)
       SELECT id, $1 FROM ai_runs WHERE retention_expires_at <= $1
       ON CONFLICT (ai_run_id) DO NOTHING RETURNING ai_run_id`,
      [now.toISOString()],
    );
    return result.rows.length;
  }

  private async insertRun(
    client: PoolClient,
    run: AiRun,
    retentionExpiresAt: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO ai_runs
       (id, project_id, actor_id, request_input_hash, provider, model, model_version,
        instruction_version, selected_source_hashes, consent_record_id, output_hash, status,
        limitation_state, created_at, retention_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        run.id,
        run.projectId,
        run.actorId,
        run.requestInputHash,
        run.provider,
        run.model,
        run.modelVersion,
        run.instructionVersion,
        JSON.stringify(run.selectedSourceHashes),
        run.consentRecordId,
        run.outputHash ?? null,
        run.status,
        run.limitationState,
        run.createdAt,
        retentionExpiresAt,
      ],
    );
  }

  private async insertAuditEvents(
    client: PoolClient,
    events: readonly AiAuditEvent[],
  ): Promise<void> {
    for (const event of events) {
      await client.query(
        `INSERT INTO ai_audit_events (id, project_id, occurred_at, payload)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [event.id, event.projectId, event.occurredAt, JSON.stringify(event)],
      );
    }
  }

  private async insertInvalidation(
    client: PoolClient,
    projectId: string,
    invalidation: Readonly<AiInvalidation>,
  ): Promise<void> {
    await client.query(
      `INSERT INTO ai_invalidations
       (id, project_id, changed_target_id, affected_ai_run_ids, actor_id, occurred_at, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        invalidation.id,
        projectId,
        invalidation.changedTargetId,
        JSON.stringify(invalidation.affectedAiRunIds),
        invalidation.actorId,
        invalidation.occurredAt,
        invalidation.reason,
      ],
    );
  }

  private async resolveDependenciesWithClient(
    client: PoolClient,
    projectId: string,
    kind: DependencyChangeKind,
    targetId: string,
  ): Promise<DependencyResolution> {
    const result = await client.query<{
      ai_run_id: string | null;
      reviewer_decision_id: string | null;
    }>(
      `SELECT ai_run_id, reviewer_decision_id FROM ai_dependencies
       WHERE project_id=$1 AND change_kind=$2 AND target_id=$3
       FOR SHARE`,
      [projectId, kind, targetId],
    );
    return {
      aiRunIds: [...new Set(result.rows.flatMap((row) => (row.ai_run_id ? [row.ai_run_id] : [])))],
      reviewerDecisionIds: [
        ...new Set(
          result.rows.flatMap((row) =>
            row.reviewer_decision_id ? [row.reviewer_decision_id] : [],
          ),
        ),
      ],
    };
  }

  private async insertDependency(
    client: PoolClient,
    projectId: string,
    kind: DependencyChangeKind,
    targetId: string,
    runId: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO ai_dependencies (project_id, change_kind, target_id, ai_run_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [projectId, kind, targetId, runId],
    );
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
