import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelDemoDraftJob,
  confirmDemoFigurePlan,
  getDemoAuditEvents,
  getDemoDraftJob,
  getDemoInitialWorkflow,
  handoffDemoDraft,
  requestDemoDraft,
  requestDemoFigurePlan,
  rejectDemoDraftJob,
  retryDemoDraftJob,
  selectDemoDraft,
  submitDemoFigurePlanDispositions,
} from './api-client.js';

describe('AI assistance API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the source-grounded request with explicit demo identity', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: { status: 'abstained', reason: 'Fixture abstention.' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      requestDemoFigurePlan({
        purpose: 'Explain the disclosed pump.',
        selectedSourceIds: ['source-fixture-disclosure-01'],
      }),
    ).resolves.toEqual({ status: 'abstained', reason: 'Fixture abstention.' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-fixture-pump/ai-figure-plans',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-patentdraw-project-id': 'project-fixture-pump',
          'x-patentdraw-actor-id': 'drafter-fixture-01',
        }),
      }),
    );
  });

  it('uses the asynchronous draft, selection, handoff, cancellation and audit routes', async () => {
    const fetchMock = vi.fn(async (path: string | URL | Request, init?: RequestInit) => {
      void path;
      void init;
      return jsonResponse({
        id: 'job:fixture',
        status: 'queued',
        progressPercent: 0,
        events: [],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    await confirmDemoFigurePlan('proposal-fixture-grounded-01');
    await submitDemoFigurePlanDispositions('proposal-fixture-grounded-01', [
      { proposalElementId: 'sign-100', disposition: 'accepted' },
    ]);
    await requestDemoDraft('proposal-fixture-grounded-01');
    await getDemoDraftJob('job:fixture');
    await selectDemoDraft('job:fixture');
    await handoffDemoDraft('job:fixture');
    await cancelDemoDraftJob('job:fixture');
    await rejectDemoDraftJob('job:fixture', 'Not suitable.');
    await retryDemoDraftJob('job:fixture', 'proposal-fixture-grounded-01');
    await getDemoAuditEvents();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/projects/project-fixture-pump/ai-figure-plans/proposal-fixture-grounded-01/confirm',
      '/api/projects/project-fixture-pump/ai-figure-plans/proposal-fixture-grounded-01/dispositions',
      '/api/projects/project-fixture-pump/generated-draft-assets',
      '/api/projects/project-fixture-pump/generated-draft-jobs/job%3Afixture',
      '/api/projects/project-fixture-pump/generated-draft-jobs/job%3Afixture/select',
      '/api/projects/project-fixture-pump/generated-draft-assets/handoff',
      '/api/projects/project-fixture-pump/generated-draft-jobs/job%3Afixture',
      '/api/projects/project-fixture-pump/generated-draft-jobs/job%3Afixture/reject',
      '/api/projects/project-fixture-pump/generated-draft-jobs/job%3Afixture/retry',
      '/api/projects/project-fixture-pump/ai-audit',
    ]);
  });

  it('loads workflow state with one read-only GET and no AI command', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        version: 0,
        etag: 'workflow:0',
        state: 'canonical-revision',
        actor: { id: 'drafter-fixture-01', activeRole: 'drafter', roles: ['drafter'] },
        current: {},
        primaryAction: {
          action: 'import-revision',
          label: '导入',
          availability: 'enabled',
          blockingGates: [],
        },
        actions: [],
        blockingGates: [],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await getDemoInitialWorkflow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-fixture-pump/figures/figure-fixture-pump-01/workflow',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('surfaces a bounded API error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'request-rejected' }, 409)),
    );
    await expect(requestDemoDraft('proposal-fixture-grounded-01')).rejects.toThrow(
      'request-rejected',
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
