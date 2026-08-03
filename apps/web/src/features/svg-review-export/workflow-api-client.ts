import type {
  AttorneyApprovalDecision,
  AttorneyApprovalDecisionRequest,
  CandidateSelectionRequest,
  CreateExportCandidateRequest,
  CreateFigureRevisionRequest,
  CreateRuleRunRequest,
  ExportCandidate,
  ExportManifest,
  ExportPackage,
  FigureRevision,
  RuleRun,
  SvgSanitizationRun,
  TechnicalReviewDecision,
  TechnicalReviewDecisionRequest,
  WorkflowProblem,
  WorkflowSnapshot,
} from '@patentdraw/contracts';

export const DEMO_WORKFLOW_PROJECT_ID = 'project-fixture-pump';
export const DEMO_WORKFLOW_FIGURE_ID = 'figure-fixture-pump-01';
export const DEMO_WORKFLOW_ACTOR_ID = 'drafter-fixture-01';
export const DEMO_WORKFLOW_ACTORS = {
  drafter: DEMO_WORKFLOW_ACTOR_ID,
  technicalReviewer: 'technical-reviewer-fixture-01',
  attorneyAgent: 'attorney-fixture-01',
} as const;
export type DemoWorkflowActorId = (typeof DEMO_WORKFLOW_ACTORS)[keyof typeof DEMO_WORKFLOW_ACTORS];

const base = `/api/projects/${DEMO_WORKFLOW_PROJECT_ID}/figures/${DEMO_WORKFLOW_FIGURE_ID}`;

export class WorkflowApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly problem: WorkflowProblem,
  ) {
    super(problem.detail);
    this.name = 'WorkflowApiProblem';
  }
}

export interface RevisionCommandResponse {
  status: 'accepted' | 'rejected';
  sanitizationRun: SvgSanitizationRun;
  revision?: FigureRevision;
  workflow: WorkflowSnapshot;
}

export function loadWorkflow(
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<WorkflowSnapshot> {
  return requestJson(`${base}/workflow`, { method: 'GET' }, actorId);
}

export async function loadRevision(
  revisionId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<{
  revision: FigureRevision;
  sanitizationRun: SvgSanitizationRun;
}> {
  return requestJson(
    `${base}/revisions/${encodeURIComponent(revisionId)}`,
    { method: 'GET' },
    actorId,
  );
}

export async function loadRevisionSvg(
  revisionId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<string> {
  const response = await fetch(`${base}/revisions/${encodeURIComponent(revisionId)}/svg`, {
    method: 'GET',
    headers: identityHeaders(actorId),
  });
  if (!response.ok) throw await responseProblem(response);
  return response.text();
}

export async function listRevisions(
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<readonly FigureRevision[]> {
  const result = await requestJson<{ revisions: readonly FigureRevision[] }>(
    `${base}/revisions`,
    {
      method: 'GET',
    },
    actorId,
  );
  return result.revisions;
}

export async function listRuleRuns(
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<readonly RuleRun[]> {
  const result = await requestJson<{ ruleRuns: readonly RuleRun[] }>(
    `${base}/rule-runs`,
    {
      method: 'GET',
    },
    actorId,
  );
  return result.ruleRuns;
}

export function createRevision(
  request: CreateFigureRevisionRequest,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<RevisionCommandResponse> {
  return requestJson(
    `${base}/revisions`,
    {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export function selectRevision(
  request: CandidateSelectionRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<{ workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/candidate-selections`,
    {
      method: 'POST',
      headers: {
        'if-match': workflow.etag,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export function runRules(
  revisionId: string,
  request: CreateRuleRunRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<{ run: RuleRun; workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/revisions/${encodeURIComponent(revisionId)}/rule-runs`,
    {
      method: 'POST',
      headers: {
        'if-match': workflow.etag,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export async function loadRuleRun(
  ruleRunId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<RuleRun> {
  const result = await requestJson<{ run: RuleRun }>(
    `${base}/rule-runs/${encodeURIComponent(ruleRunId)}`,
    { method: 'GET' },
    actorId,
  );
  return result.run;
}

export function createExportCandidate(
  request: CreateExportCandidateRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<{ candidate: ExportCandidate; workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/export-candidates`,
    {
      method: 'POST',
      headers: { 'if-match': workflow.etag, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export async function loadExportCandidate(
  candidateId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<ExportCandidate> {
  const result = await requestJson<{ candidate: ExportCandidate }>(
    `${base}/export-candidates/${encodeURIComponent(candidateId)}`,
    { method: 'GET' },
    actorId,
  );
  return result.candidate;
}

export function submitTechnicalDecision(
  candidateId: string,
  request: TechnicalReviewDecisionRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId,
): Promise<{ decision: TechnicalReviewDecision; workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/export-candidates/${encodeURIComponent(candidateId)}/technical-decisions`,
    {
      method: 'POST',
      headers: { 'if-match': workflow.etag, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export async function loadTechnicalDecision(
  decisionId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<TechnicalReviewDecision> {
  const result = await requestJson<{ decision: TechnicalReviewDecision }>(
    `${base}/technical-decisions/${encodeURIComponent(decisionId)}`,
    { method: 'GET' },
    actorId,
  );
  return result.decision;
}

export function submitAttorneyDecision(
  candidateId: string,
  request: AttorneyApprovalDecisionRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId,
): Promise<{ decision: AttorneyApprovalDecision; workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/export-candidates/${encodeURIComponent(candidateId)}/attorney-decisions`,
    {
      method: 'POST',
      headers: { 'if-match': workflow.etag, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(request),
    },
    actorId,
  );
}

export async function loadAttorneyDecision(
  decisionId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<AttorneyApprovalDecision> {
  const result = await requestJson<{ decision: AttorneyApprovalDecision }>(
    `${base}/attorney-decisions/${encodeURIComponent(decisionId)}`,
    { method: 'GET' },
    actorId,
  );
  return result.decision;
}

export function createExportPackage(
  candidate: ExportCandidate,
  technicalDecisionId: string,
  attorneyDecisionId: string,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
  actorId: DemoWorkflowActorId,
): Promise<{ package: ExportPackage; manifest: ExportManifest; workflow: WorkflowSnapshot }> {
  return requestJson(
    `${base}/export-candidates/${encodeURIComponent(candidate.id)}/export-packages`,
    {
      method: 'POST',
      headers: { 'if-match': workflow.etag, 'idempotency-key': idempotencyKey },
      body: JSON.stringify({
        candidateFingerprint: candidate.candidateFingerprint,
        technicalDecisionId,
        attorneyDecisionId,
      }),
    },
    actorId,
  );
}

export async function loadExportPackage(
  packageId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<ExportPackage> {
  const result = await requestJson<{ package: ExportPackage }>(
    `${base}/export-packages/${encodeURIComponent(packageId)}`,
    { method: 'GET' },
    actorId,
  );
  return result.package;
}

export async function loadExportManifest(
  packageId: string,
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<ExportManifest> {
  return requestJson(
    `${base}/export-packages/${encodeURIComponent(packageId)}/manifest`,
    { method: 'GET' },
    actorId,
  );
}

export async function listExportPackages(
  actorId: DemoWorkflowActorId = DEMO_WORKFLOW_ACTOR_ID,
): Promise<readonly ExportPackage[]> {
  const result = await requestJson<{ packages: readonly ExportPackage[] }>(
    `${base}/export-packages`,
    { method: 'GET' },
    actorId,
  );
  return result.packages;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  actorId: DemoWorkflowActorId,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...identityHeaders(actorId),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw await responseProblem(response);
  return (await response.json()) as T;
}

async function responseProblem(response: Response): Promise<WorkflowApiProblem> {
  const body = (await response.json().catch(() => ({}))) as Partial<WorkflowProblem>;
  return new WorkflowApiProblem(response.status, {
    type: body.type ?? 'urn:patentdraw:problem:request-failed',
    title: body.title ?? 'Workflow request failed',
    status: response.status,
    code: body.code ?? 'request-failed',
    detail: body.detail ?? `Request failed with status ${response.status}.`,
    ...(body.instance ? { instance: body.instance } : {}),
    ...(body.unmetGates ? { unmetGates: body.unmetGates } : {}),
    ...(body.current ? { current: body.current } : {}),
  });
}

function identityHeaders(actorId: DemoWorkflowActorId): Record<string, string> {
  return {
    'x-patentdraw-project-id': DEMO_WORKFLOW_PROJECT_ID,
    'x-patentdraw-actor-id': actorId,
  };
}
