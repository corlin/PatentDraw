import type {
  CandidateSelectionRequest,
  CreateFigureRevisionRequest,
  CreateRuleRunRequest,
  FigureRevision,
  RuleRun,
  SvgSanitizationRun,
  WorkflowProblem,
  WorkflowSnapshot,
} from '@patentdraw/contracts';

export const DEMO_WORKFLOW_PROJECT_ID = 'project-fixture-pump';
export const DEMO_WORKFLOW_FIGURE_ID = 'figure-fixture-pump-01';
export const DEMO_WORKFLOW_ACTOR_ID = 'drafter-fixture-01';

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

export function loadWorkflow(): Promise<WorkflowSnapshot> {
  return requestJson(`${base}/workflow`, { method: 'GET' });
}

export async function loadRevision(revisionId: string): Promise<{
  revision: FigureRevision;
  sanitizationRun: SvgSanitizationRun;
}> {
  return requestJson(`${base}/revisions/${encodeURIComponent(revisionId)}`, { method: 'GET' });
}

export async function loadRevisionSvg(revisionId: string): Promise<string> {
  const response = await fetch(`${base}/revisions/${encodeURIComponent(revisionId)}/svg`, {
    method: 'GET',
    headers: identityHeaders(),
  });
  if (!response.ok) throw await responseProblem(response);
  return response.text();
}

export async function listRevisions(): Promise<readonly FigureRevision[]> {
  const result = await requestJson<{ revisions: readonly FigureRevision[] }>(`${base}/revisions`, {
    method: 'GET',
  });
  return result.revisions;
}

export async function listRuleRuns(): Promise<readonly RuleRun[]> {
  const result = await requestJson<{ ruleRuns: readonly RuleRun[] }>(`${base}/rule-runs`, {
    method: 'GET',
  });
  return result.ruleRuns;
}

export function createRevision(
  request: CreateFigureRevisionRequest,
  idempotencyKey: string,
): Promise<RevisionCommandResponse> {
  return requestJson(`${base}/revisions`, {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
    body: JSON.stringify(request),
  });
}

export function selectRevision(
  request: CandidateSelectionRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
): Promise<{ workflow: WorkflowSnapshot }> {
  return requestJson(`${base}/candidate-selections`, {
    method: 'POST',
    headers: {
      'if-match': workflow.etag,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(request),
  });
}

export function runRules(
  revisionId: string,
  request: CreateRuleRunRequest,
  workflow: WorkflowSnapshot,
  idempotencyKey: string,
): Promise<{ run: RuleRun; workflow: WorkflowSnapshot }> {
  return requestJson(`${base}/revisions/${encodeURIComponent(revisionId)}/rule-runs`, {
    method: 'POST',
    headers: {
      'if-match': workflow.etag,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(request),
  });
}

export async function loadRuleRun(ruleRunId: string): Promise<RuleRun> {
  const result = await requestJson<{ run: RuleRun }>(
    `${base}/rule-runs/${encodeURIComponent(ruleRunId)}`,
    { method: 'GET' },
  );
  return result.run;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...identityHeaders(),
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

function identityHeaders(): Record<string, string> {
  return {
    'x-patentdraw-project-id': DEMO_WORKFLOW_PROJECT_ID,
    'x-patentdraw-actor-id': DEMO_WORKFLOW_ACTOR_ID,
  };
}
