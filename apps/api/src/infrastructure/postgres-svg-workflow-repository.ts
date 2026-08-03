import type { Pool, PoolClient } from 'pg';

import type {
  AttorneyApprovalDecision,
  CnipaEfilingEvidence,
  ExportCandidate,
  ExportPackage,
  FigureRevision,
  RuleRun,
  SvgSanitizationRun,
  TechnicalReviewDecision,
  WorkflowAuditEvent,
  WorkflowInvalidation,
} from '@patentdraw/contracts';

import {
  StaleWorkflowError,
  type ExportPackageSupersessionRecord,
  type SvgWorkflowRepository,
  type WorkflowProjectionRecord,
} from '../modules/svg-review-export/repository.js';

type ProjectionRow = {
  project_id: string;
  figure_id: string;
  version: number;
  current_revision_id: string | null;
  current_rule_run_id: string | null;
  current_candidate_id: string | null;
  current_technical_decision_id: string | null;
  current_attorney_decision_id: string | null;
  current_export_package_id: string | null;
  current_invalidation_id: string | null;
};

export class PostgresSvgWorkflowRepository implements SvgWorkflowRepository {
  constructor(private readonly pool: Pool) {}

  async saveSanitizationRun(record: SvgSanitizationRun): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_sanitization_runs
         (id, project_id, figure_id, payload, occurred_at) VALUES ($1,$2,$3,$4,$5)`,
        [record.id, record.projectId, record.figureId, JSON.stringify(record), record.occurredAt],
      ),
    );
  }

  getSanitizationRun(projectId: string, id: string): Promise<SvgSanitizationRun | null> {
    return this.readPayload('svg_sanitization_runs', projectId, id);
  }

  async saveRevision(record: FigureRevision): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_figure_revisions
         (id, project_id, figure_id, parent_revision_id, sanitization_run_id,
          revision_fingerprint, payload, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          record.id,
          record.projectId,
          record.figureId,
          record.parentRevisionId ?? null,
          record.sanitizationRunId,
          record.revisionFingerprint,
          JSON.stringify(record),
          record.createdAt,
        ],
      ),
    );
  }

  getRevision(projectId: string, id: string): Promise<FigureRevision | null> {
    return this.readPayload('svg_figure_revisions', projectId, id);
  }

  async listRevisions(projectId: string, figureId: string): Promise<readonly FigureRevision[]> {
    return this.listPayloads('svg_figure_revisions', projectId, figureId, 'created_at');
  }

  async saveRuleRun(record: RuleRun): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_rule_runs
         (id, project_id, figure_id, revision_id, input_fingerprint, payload, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          record.id,
          record.projectId,
          record.figureId,
          record.revisionId,
          record.inputFingerprint,
          JSON.stringify(record),
          record.createdAt,
        ],
      ),
    );
  }

  getRuleRun(projectId: string, id: string): Promise<RuleRun | null> {
    return this.readPayload('svg_rule_runs', projectId, id);
  }

  async listRuleRuns(projectId: string, figureId: string): Promise<readonly RuleRun[]> {
    return this.listPayloads('svg_rule_runs', projectId, figureId, 'created_at');
  }

  async saveExportCandidate(record: ExportCandidate): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_export_candidates
         (id, project_id, figure_id, revision_id, rule_run_id, candidate_fingerprint,
          payload, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          record.id,
          record.projectId,
          record.figureId,
          record.revisionId,
          record.ruleRunId,
          record.candidateFingerprint,
          JSON.stringify(record),
          record.createdAt,
        ],
      ),
    );
  }

  getExportCandidate(projectId: string, id: string): Promise<ExportCandidate | null> {
    return this.readPayload('svg_export_candidates', projectId, id);
  }

  async saveTechnicalDecision(record: TechnicalReviewDecision, projectId: string): Promise<void> {
    await this.withProject(projectId, (client) =>
      client.query(
        `INSERT INTO svg_technical_review_decisions
         (id, project_id, candidate_id, payload, decided_at) VALUES ($1,$2,$3,$4,$5)`,
        [record.id, projectId, record.candidateId, JSON.stringify(record), record.decidedAt],
      ),
    );
  }

  getTechnicalDecision(projectId: string, id: string): Promise<TechnicalReviewDecision | null> {
    return this.readPayload('svg_technical_review_decisions', projectId, id);
  }

  async saveAttorneyDecision(record: AttorneyApprovalDecision, projectId: string): Promise<void> {
    await this.withProject(projectId, (client) =>
      client.query(
        `INSERT INTO svg_attorney_approval_decisions
         (id, project_id, candidate_id, technical_decision_id, payload, decided_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          record.id,
          projectId,
          record.candidateId,
          record.technicalDecisionId,
          JSON.stringify(record),
          record.decidedAt,
        ],
      ),
    );
  }

  getAttorneyDecision(projectId: string, id: string): Promise<AttorneyApprovalDecision | null> {
    return this.readPayload('svg_attorney_approval_decisions', projectId, id);
  }

  async saveInvalidation(record: WorkflowInvalidation): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_workflow_invalidations
         (id, project_id, figure_id, payload, occurred_at) VALUES ($1,$2,$3,$4,$5)`,
        [record.id, record.projectId, record.figureId, JSON.stringify(record), record.occurredAt],
      ),
    );
  }

  getInvalidation(projectId: string, id: string): Promise<WorkflowInvalidation | null> {
    return this.readPayload('svg_workflow_invalidations', projectId, id);
  }

  async saveCnipaEvidence(record: CnipaEfilingEvidence): Promise<void> {
    await this.withProject(record.projectId, (client) =>
      client.query(
        `INSERT INTO svg_cnipa_efiling_evidence
         (id, project_id, payload, recorded_at) VALUES ($1,$2,$3,$4)`,
        [record.id, record.projectId, JSON.stringify(record), record.recordedAt],
      ),
    );
  }

  getCnipaEvidence(projectId: string, id: string): Promise<CnipaEfilingEvidence | null> {
    return this.readPayload('svg_cnipa_efiling_evidence', projectId, id);
  }

  async saveExportPackage(record: ExportPackage): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_export_packages
         (id, project_id, figure_id, candidate_id, attorney_decision_id, payload, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          record.id,
          record.projectId,
          record.figureId,
          record.candidateId,
          record.attorneyDecisionId,
          JSON.stringify(record),
          record.createdAt,
        ],
      ),
    );
  }

  getExportPackage(projectId: string, id: string): Promise<ExportPackage | null> {
    return this.readPayload('svg_export_packages', projectId, id);
  }

  listExportPackages(projectId: string, figureId: string): Promise<readonly ExportPackage[]> {
    return this.listPayloads('svg_export_packages', projectId, figureId, 'created_at');
  }

  async savePackageSupersession(record: ExportPackageSupersessionRecord): Promise<void> {
    await this.withFigure(record.projectId, record.figureId, (client) =>
      client.query(
        `INSERT INTO svg_export_package_supersessions
         (id, project_id, figure_id, superseded_package_id, replacement_package_id,
          payload, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          record.id,
          record.projectId,
          record.figureId,
          record.supersededPackageId,
          record.replacementPackageId,
          JSON.stringify(record),
          record.occurredAt,
        ],
      ),
    );
  }

  async saveAuditEvents(events: readonly WorkflowAuditEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.transaction(async (client) => {
      for (const event of events) {
        await this.ensureProject(client, event.projectId);
        const figureId = event.targetIds.find((target) => target.startsWith('figure-')) ?? null;
        await client.query(
          `INSERT INTO svg_workflow_audit_events
           (id, project_id, figure_id, payload, occurred_at) VALUES ($1,$2,$3,$4,$5)`,
          [event.id, event.projectId, figureId, JSON.stringify(event), event.occurredAt],
        );
      }
    });
  }

  async listAuditEvents(
    projectId: string,
    figureId?: string,
  ): Promise<readonly WorkflowAuditEvent[]> {
    const result = figureId
      ? await this.pool.query<{ payload: WorkflowAuditEvent }>(
          `SELECT payload FROM svg_workflow_audit_events
           WHERE project_id=$1 AND (figure_id=$2 OR payload->'targetIds' ? $2)
           ORDER BY occurred_at, id`,
          [projectId, figureId],
        )
      : await this.pool.query<{ payload: WorkflowAuditEvent }>(
          `SELECT payload FROM svg_workflow_audit_events
           WHERE project_id=$1 ORDER BY occurred_at, id`,
          [projectId],
        );
    return result.rows.map((row) => row.payload);
  }

  async getProjection(projectId: string, figureId: string): Promise<WorkflowProjectionRecord> {
    const result = await this.pool.query<ProjectionRow>(
      'SELECT * FROM svg_workflow_projections WHERE project_id=$1 AND figure_id=$2',
      [projectId, figureId],
    );
    return result.rows[0]
      ? this.mapProjection(result.rows[0])
      : { projectId, figureId, version: 0 };
  }

  async compareAndSwapProjection(input: {
    expectedVersion: number;
    next: Omit<WorkflowProjectionRecord, 'version'>;
  }): Promise<WorkflowProjectionRecord> {
    return this.transaction(async (client) => {
      await this.ensureFigure(client, input.next.projectId, input.next.figureId);
      await client.query(
        `INSERT INTO svg_workflow_projections (project_id, figure_id, version)
         VALUES ($1,$2,0) ON CONFLICT (project_id, figure_id) DO NOTHING`,
        [input.next.projectId, input.next.figureId],
      );
      const locked = await client.query<ProjectionRow>(
        `SELECT * FROM svg_workflow_projections
         WHERE project_id=$1 AND figure_id=$2 FOR UPDATE`,
        [input.next.projectId, input.next.figureId],
      );
      const current = this.mapProjection(locked.rows[0]!);
      if (current.version !== input.expectedVersion) throw new StaleWorkflowError(current);

      const updated = await client.query<ProjectionRow>(
        `UPDATE svg_workflow_projections SET
           version=version+1, current_revision_id=$3, current_rule_run_id=$4,
           current_candidate_id=$5, current_technical_decision_id=$6,
           current_attorney_decision_id=$7, current_export_package_id=$8,
           current_invalidation_id=$9
         WHERE project_id=$1 AND figure_id=$2 RETURNING *`,
        [
          input.next.projectId,
          input.next.figureId,
          input.next.currentRevisionId ?? null,
          input.next.currentRuleRunId ?? null,
          input.next.currentCandidateId ?? null,
          input.next.currentTechnicalDecisionId ?? null,
          input.next.currentAttorneyDecisionId ?? null,
          input.next.currentExportPackageId ?? null,
          input.next.currentInvalidationId ?? null,
        ],
      );
      return this.mapProjection(updated.rows[0]!);
    });
  }

  private async readPayload<T>(table: string, projectId: string, id: string): Promise<T | null> {
    const allowedTables = new Set([
      'svg_sanitization_runs',
      'svg_figure_revisions',
      'svg_rule_runs',
      'svg_export_candidates',
      'svg_technical_review_decisions',
      'svg_attorney_approval_decisions',
      'svg_workflow_invalidations',
      'svg_cnipa_efiling_evidence',
      'svg_export_packages',
    ]);
    if (!allowedTables.has(table)) throw new Error('Unsupported SVG workflow table.');
    const result = await this.pool.query<{ payload: T }>(
      `SELECT payload FROM ${table} WHERE project_id=$1 AND id=$2`,
      [projectId, id],
    );
    return result.rows[0]?.payload ?? null;
  }

  private async listPayloads<T>(
    table: 'svg_figure_revisions' | 'svg_rule_runs' | 'svg_export_packages',
    projectId: string,
    figureId: string,
    orderColumn: 'created_at',
  ): Promise<readonly T[]> {
    const result = await this.pool.query<{ payload: T }>(
      `SELECT payload FROM ${table} WHERE project_id=$1 AND figure_id=$2 ORDER BY ${orderColumn}, id`,
      [projectId, figureId],
    );
    return result.rows.map((row) => row.payload);
  }

  private async withProject<T>(
    projectId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.transaction(async (client) => {
      await this.ensureProject(client, projectId);
      return operation(client);
    });
  }

  private async withFigure<T>(
    projectId: string,
    figureId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.transaction(async (client) => {
      await this.ensureFigure(client, projectId, figureId);
      return operation(client);
    });
  }

  private async ensureProject(client: PoolClient, projectId: string): Promise<void> {
    await client.query('INSERT INTO svg_projects (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [
      projectId,
    ]);
  }

  private async ensureFigure(
    client: PoolClient,
    projectId: string,
    figureId: string,
  ): Promise<void> {
    await this.ensureProject(client, projectId);
    await client.query(
      `INSERT INTO svg_figures (id, project_id) VALUES ($1,$2)
       ON CONFLICT (id) DO NOTHING`,
      [figureId, projectId],
    );
  }

  private mapProjection(row: ProjectionRow): WorkflowProjectionRecord {
    const result: WorkflowProjectionRecord = {
      projectId: row.project_id,
      figureId: row.figure_id,
      version: row.version,
    };
    if (row.current_revision_id) result.currentRevisionId = row.current_revision_id;
    if (row.current_rule_run_id) result.currentRuleRunId = row.current_rule_run_id;
    if (row.current_candidate_id) result.currentCandidateId = row.current_candidate_id;
    if (row.current_technical_decision_id) {
      result.currentTechnicalDecisionId = row.current_technical_decision_id;
    }
    if (row.current_attorney_decision_id) {
      result.currentAttorneyDecisionId = row.current_attorney_decision_id;
    }
    if (row.current_export_package_id) {
      result.currentExportPackageId = row.current_export_package_id;
    }
    if (row.current_invalidation_id) result.currentInvalidationId = row.current_invalidation_id;
    return result;
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
