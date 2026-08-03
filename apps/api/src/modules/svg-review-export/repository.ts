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

export interface WorkflowProjectionRecord {
  projectId: string;
  figureId: string;
  version: number;
  currentRevisionId?: string;
  currentRuleRunId?: string;
  currentCandidateId?: string;
  currentTechnicalDecisionId?: string;
  currentAttorneyDecisionId?: string;
  currentExportPackageId?: string;
  currentInvalidationId?: string;
}

export interface ExportPackageSupersessionRecord {
  id: string;
  projectId: string;
  figureId: string;
  supersededPackageId: string;
  replacementPackageId: string;
  actorId: string;
  reason: string;
  occurredAt: string;
}

export interface SvgWorkflowRepository {
  saveSanitizationRun(record: SvgSanitizationRun): Promise<void>;
  getSanitizationRun(projectId: string, id: string): Promise<SvgSanitizationRun | null>;
  saveRevision(record: FigureRevision): Promise<void>;
  getRevision(projectId: string, id: string): Promise<FigureRevision | null>;
  listRevisions(projectId: string, figureId: string): Promise<readonly FigureRevision[]>;
  saveRuleRun(record: RuleRun): Promise<void>;
  getRuleRun(projectId: string, id: string): Promise<RuleRun | null>;
  listRuleRuns(projectId: string, figureId: string): Promise<readonly RuleRun[]>;
  saveExportCandidate(record: ExportCandidate): Promise<void>;
  getExportCandidate(projectId: string, id: string): Promise<ExportCandidate | null>;
  saveTechnicalDecision(record: TechnicalReviewDecision, projectId: string): Promise<void>;
  getTechnicalDecision(projectId: string, id: string): Promise<TechnicalReviewDecision | null>;
  saveAttorneyDecision(record: AttorneyApprovalDecision, projectId: string): Promise<void>;
  getAttorneyDecision(projectId: string, id: string): Promise<AttorneyApprovalDecision | null>;
  saveInvalidation(record: WorkflowInvalidation): Promise<void>;
  getInvalidation(projectId: string, id: string): Promise<WorkflowInvalidation | null>;
  saveCnipaEvidence(record: CnipaEfilingEvidence): Promise<void>;
  getCnipaEvidence(projectId: string, id: string): Promise<CnipaEfilingEvidence | null>;
  saveExportPackage(record: ExportPackage): Promise<void>;
  getExportPackage(projectId: string, id: string): Promise<ExportPackage | null>;
  listExportPackages(projectId: string, figureId: string): Promise<readonly ExportPackage[]>;
  savePackageSupersession(record: ExportPackageSupersessionRecord): Promise<void>;
  saveAuditEvents(events: readonly WorkflowAuditEvent[]): Promise<void>;
  listAuditEvents(projectId: string, figureId?: string): Promise<readonly WorkflowAuditEvent[]>;
  getProjection(projectId: string, figureId: string): Promise<WorkflowProjectionRecord>;
  compareAndSwapProjection(input: {
    expectedVersion: number;
    next: Omit<WorkflowProjectionRecord, 'version'>;
  }): Promise<WorkflowProjectionRecord>;
}

export class StaleWorkflowError extends Error {
  constructor(readonly current: WorkflowProjectionRecord) {
    super(`Workflow projection is at version ${current.version}; reload before retrying.`);
    this.name = 'StaleWorkflowError';
  }
}

type StoredRecord =
  | SvgSanitizationRun
  | FigureRevision
  | RuleRun
  | ExportCandidate
  | TechnicalReviewDecision
  | AttorneyApprovalDecision
  | WorkflowInvalidation
  | CnipaEfilingEvidence
  | ExportPackage
  | ExportPackageSupersessionRecord
  | WorkflowAuditEvent;

export class InMemorySvgWorkflowRepository implements SvgWorkflowRepository {
  private readonly sanitizationRuns = new Map<string, SvgSanitizationRun>();
  private readonly revisions = new Map<string, FigureRevision>();
  private readonly ruleRuns = new Map<string, RuleRun>();
  private readonly candidates = new Map<string, ExportCandidate>();
  private readonly technicalDecisions = new Map<string, TechnicalReviewDecision>();
  private readonly attorneyDecisions = new Map<string, AttorneyApprovalDecision>();
  private readonly invalidations = new Map<string, WorkflowInvalidation>();
  private readonly cnipaEvidence = new Map<string, CnipaEfilingEvidence>();
  private readonly packages = new Map<string, ExportPackage>();
  private readonly supersessions = new Map<string, ExportPackageSupersessionRecord>();
  private readonly auditEvents = new Map<string, WorkflowAuditEvent>();
  private readonly projections = new Map<string, WorkflowProjectionRecord>();

  async saveSanitizationRun(record: SvgSanitizationRun): Promise<void> {
    this.insert(this.sanitizationRuns, record.projectId, record);
  }

  async getSanitizationRun(projectId: string, id: string): Promise<SvgSanitizationRun | null> {
    return this.read(this.sanitizationRuns, projectId, id);
  }

  async saveRevision(record: FigureRevision): Promise<void> {
    this.insert(this.revisions, record.projectId, record);
  }

  async getRevision(projectId: string, id: string): Promise<FigureRevision | null> {
    return this.read(this.revisions, projectId, id);
  }

  async listRevisions(projectId: string, figureId: string): Promise<readonly FigureRevision[]> {
    return this.list(this.revisions, projectId, (record) => record.figureId === figureId).sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt),
    );
  }

  async saveRuleRun(record: RuleRun): Promise<void> {
    this.insert(this.ruleRuns, record.projectId, record);
  }

  async getRuleRun(projectId: string, id: string): Promise<RuleRun | null> {
    return this.read(this.ruleRuns, projectId, id);
  }

  async listRuleRuns(projectId: string, figureId: string): Promise<readonly RuleRun[]> {
    return this.list(this.ruleRuns, projectId, (record) => record.figureId === figureId).sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt),
    );
  }

  async saveExportCandidate(record: ExportCandidate): Promise<void> {
    this.insert(this.candidates, record.projectId, record);
  }

  async getExportCandidate(projectId: string, id: string): Promise<ExportCandidate | null> {
    return this.read(this.candidates, projectId, id);
  }

  async saveTechnicalDecision(record: TechnicalReviewDecision, projectId: string): Promise<void> {
    this.insert(this.technicalDecisions, projectId, record);
  }

  async getTechnicalDecision(
    projectId: string,
    id: string,
  ): Promise<TechnicalReviewDecision | null> {
    return this.read(this.technicalDecisions, projectId, id);
  }

  async saveAttorneyDecision(record: AttorneyApprovalDecision, projectId: string): Promise<void> {
    this.insert(this.attorneyDecisions, projectId, record);
  }

  async getAttorneyDecision(
    projectId: string,
    id: string,
  ): Promise<AttorneyApprovalDecision | null> {
    return this.read(this.attorneyDecisions, projectId, id);
  }

  async saveInvalidation(record: WorkflowInvalidation): Promise<void> {
    this.insert(this.invalidations, record.projectId, record);
  }

  async getInvalidation(projectId: string, id: string): Promise<WorkflowInvalidation | null> {
    return this.read(this.invalidations, projectId, id);
  }

  async saveCnipaEvidence(record: CnipaEfilingEvidence): Promise<void> {
    this.insert(this.cnipaEvidence, record.projectId, record);
  }

  async getCnipaEvidence(projectId: string, id: string): Promise<CnipaEfilingEvidence | null> {
    return this.read(this.cnipaEvidence, projectId, id);
  }

  async saveExportPackage(record: ExportPackage): Promise<void> {
    this.insert(this.packages, record.projectId, record);
  }

  async getExportPackage(projectId: string, id: string): Promise<ExportPackage | null> {
    return this.read(this.packages, projectId, id);
  }

  async listExportPackages(projectId: string, figureId: string): Promise<readonly ExportPackage[]> {
    return this.list(this.packages, projectId, (record) => record.figureId === figureId).sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt),
    );
  }

  async savePackageSupersession(record: ExportPackageSupersessionRecord): Promise<void> {
    this.insert(this.supersessions, record.projectId, record);
  }

  async saveAuditEvents(events: readonly WorkflowAuditEvent[]): Promise<void> {
    for (const event of events) this.insert(this.auditEvents, event.projectId, event);
  }

  async listAuditEvents(
    projectId: string,
    figureId?: string,
  ): Promise<readonly WorkflowAuditEvent[]> {
    return [...this.auditEvents.entries()]
      .filter(([key, event]) => {
        const inProject = key.startsWith(`${projectId}:`);
        return inProject && (!figureId || event.targetIds.includes(figureId));
      })
      .map(([, event]) => structuredClone(event))
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }

  async getProjection(projectId: string, figureId: string): Promise<WorkflowProjectionRecord> {
    const current = this.projections.get(this.projectionKey(projectId, figureId));
    return structuredClone(current ?? { projectId, figureId, version: 0 });
  }

  async compareAndSwapProjection(input: {
    expectedVersion: number;
    next: Omit<WorkflowProjectionRecord, 'version'>;
  }): Promise<WorkflowProjectionRecord> {
    const key = this.projectionKey(input.next.projectId, input.next.figureId);
    const current = this.projections.get(key) ?? {
      projectId: input.next.projectId,
      figureId: input.next.figureId,
      version: 0,
    };
    if (current.version !== input.expectedVersion) {
      throw new StaleWorkflowError(structuredClone(current));
    }
    const updated: WorkflowProjectionRecord = {
      ...structuredClone(input.next),
      version: current.version + 1,
    };
    this.projections.set(key, updated);
    return structuredClone(updated);
  }

  private insert<T extends StoredRecord>(map: Map<string, T>, projectId: string, record: T): void {
    const key = `${projectId}:${record.id}`;
    if (map.has(key)) throw new Error(`Append-only record ${record.id} already exists.`);
    map.set(key, structuredClone(record));
  }

  private read<T extends StoredRecord>(
    map: Map<string, T>,
    projectId: string,
    id: string,
  ): T | null {
    const record = map.get(`${projectId}:${id}`);
    return record ? structuredClone(record) : null;
  }

  private list<T extends StoredRecord>(
    map: Map<string, T>,
    projectId: string,
    predicate: (record: T) => boolean,
  ): T[] {
    return [...map.entries()]
      .filter(([key, record]) => key.startsWith(`${projectId}:`) && predicate(record))
      .map(([, record]) => structuredClone(record));
  }

  private projectionKey(projectId: string, figureId: string): string {
    return `${projectId}:${figureId}`;
  }
}
