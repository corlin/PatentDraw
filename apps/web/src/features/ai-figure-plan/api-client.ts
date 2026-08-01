import type {
  AiAuditEvent,
  DraftHandoffResult,
  DraftJob,
  FigurePlanItemDisposition,
  FigurePlanRequest,
  FigurePlanResult,
  WorkflowSnapshot,
} from '@patentdraw/contracts';

export const DEMO_PROJECT_ID = 'project-fixture-pump';
export const DEMO_ACTOR_ID = 'drafter-fixture-01';

const identityHeaders = {
  'x-patentdraw-project-id': DEMO_PROJECT_ID,
  'x-patentdraw-actor-id': DEMO_ACTOR_ID,
};
const sourceHashes = new Map([['source-fixture-disclosure-01', 'sha256:fixture-disclosure-01']]);
const consent = {
  id: 'consent-fixture-01',
  recordedAt: '2026-07-31T00:00:00.000Z',
  allowsProviderProcessing: true as const,
  allowsTraining: false as const,
};

export async function requestDemoFigurePlan(input: {
  purpose: string;
  selectedSourceIds: readonly string[];
}): Promise<FigurePlanResult> {
  const request: FigurePlanRequest = {
    projectId: DEMO_PROJECT_ID,
    selectedSources: input.selectedSourceIds.map((id) => {
      const contentHash = sourceHashes.get(id);
      if (!contentHash) throw new Error(`No demo content hash is configured for ${id}.`);
      return { id, contentHash };
    }),
    figurePurpose: input.purpose,
    allowedScope: ['housing', 'impeller'],
    assistanceType: 'figure-plan',
    instructionVersion: 'fixture-instruction-v1',
    consent,
  };
  const response = await requestJson<{ result: FigurePlanResult }>(
    `/api/projects/${DEMO_PROJECT_ID}/ai-figure-plans`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return response.result;
}

export function confirmDemoFigurePlan(proposalId: string): Promise<void> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/ai-figure-plans/${encodeURIComponent(proposalId)}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
    },
  );
}

export function submitDemoFigurePlanDispositions(
  proposalId: string,
  items: readonly FigurePlanItemDisposition[],
): Promise<void> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/ai-figure-plans/${encodeURIComponent(proposalId)}/dispositions`,
    {
      method: 'POST',
      body: JSON.stringify({ proposalId, items }),
    },
  );
}

export function requestDemoDraft(confirmedPlanId: string): Promise<DraftJob> {
  return requestJson(`/api/projects/${DEMO_PROJECT_ID}/generated-draft-assets`, {
    method: 'POST',
    body: JSON.stringify({
      projectId: DEMO_PROJECT_ID,
      confirmedPlanId,
      allowedScope: ['housing', 'impeller'],
      instructionVersion: 'fixture-draft-instruction-v1',
      consent,
    }),
  });
}

export function getDemoDraftJob(jobId: string): Promise<DraftJob> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/generated-draft-jobs/${encodeURIComponent(jobId)}`,
  );
}

export function cancelDemoDraftJob(jobId: string): Promise<DraftJob> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/generated-draft-jobs/${encodeURIComponent(jobId)}`,
    { method: 'DELETE' },
  );
}

export function rejectDemoDraftJob(jobId: string, reason: string): Promise<DraftJob> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/generated-draft-jobs/${encodeURIComponent(jobId)}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export function retryDemoDraftJob(jobId: string, confirmedPlanId: string): Promise<DraftJob> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/generated-draft-jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
      body: JSON.stringify({
        request: {
          projectId: DEMO_PROJECT_ID,
          confirmedPlanId,
          allowedScope: ['housing', 'impeller'],
          instructionVersion: 'fixture-draft-instruction-v1',
          consent,
        },
      }),
    },
  );
}

export function selectDemoDraft(jobId: string): Promise<DraftJob> {
  return requestJson(
    `/api/projects/${DEMO_PROJECT_ID}/generated-draft-jobs/${encodeURIComponent(jobId)}/select`,
    { method: 'POST' },
  );
}

export function handoffDemoDraft(jobId: string): Promise<DraftHandoffResult> {
  return requestJson(`/api/projects/${DEMO_PROJECT_ID}/generated-draft-assets/handoff`, {
    method: 'POST',
    body: JSON.stringify({
      jobId,
      canonicalFigureRevisionId: 'revision-demo-independent-svg-01',
    }),
  });
}

export async function getDemoAuditEvents(): Promise<readonly AiAuditEvent[]> {
  const response = await requestJson<{ events: readonly AiAuditEvent[] }>(
    `/api/projects/${DEMO_PROJECT_ID}/ai-audit`,
  );
  return response.events;
}

export function getDemoInitialWorkflow(): Promise<WorkflowSnapshot> {
  return requestJson(`/api/projects/${DEMO_PROJECT_ID}/figures/figure-fixture-pump-01/workflow`, {
    method: 'GET',
  });
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...identityHeaders,
    ...(init.body ? { 'content-type': 'application/json' } : {}),
  };
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const body = (await response.json()) as T & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(body.message ?? body.error ?? `Request failed with ${response.status}.`);
  }
  return body;
}
