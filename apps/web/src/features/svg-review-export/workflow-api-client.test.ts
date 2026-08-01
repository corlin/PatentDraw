import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowSnapshot } from '@patentdraw/contracts';

import {
  DEMO_WORKFLOW_ACTORS,
  createExportCandidate,
  createRevision,
  loadWorkflow,
  submitTechnicalDecision,
} from './workflow-api-client.js';

describe('SVG workflow API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses a read-only workflow request and command idempotency headers', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(workflowFixture()));
    vi.stubGlobal('fetch', fetchMock);
    await loadWorkflow();
    await createRevision(
      {
        svgText: '<svg/>',
        origin: { kind: 'import' },
        confirmedFigurePlanId: 'plan-01',
        sourceLinks: [{ sourceAssetId: 'source-01', contentHash: `sha256:${'a'.repeat(64)}` }],
        referenceRegistryVersionId: 'registry-01',
        sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
      },
      'revision-key-01',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'idempotency-key': 'revision-key-01' }),
    });
  });

  it.each([409, 422])('preserves structured %s workflow problems', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            type: 'urn:patentdraw:problem:stale-workflow',
            title: 'Workflow rejected',
            status,
            code: status === 409 ? 'stale-workflow' : 'sanitization-rejected',
            detail: 'A bounded fixture problem.',
            current: { workflowVersion: 2, state: 'canonical-revision' },
          },
          status,
        ),
      ),
    );
    await expect(loadWorkflow()).rejects.toMatchObject({
      status,
      problem: expect.objectContaining({ detail: 'A bounded fixture problem.' }),
    });
  });

  it('binds candidate and technical-decision commands to actor identity and ETag', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const workflow = workflowFixture() as WorkflowSnapshot;
    const hash = `sha256:${'a'.repeat(64)}` as const;
    await createExportCandidate(
      {
        revisionId: 'revision-01',
        revisionHash: hash,
        revisionFingerprint: hash,
        ruleRunId: 'run-01',
        ruleProfileHash: hash,
        exportSettings: { format: 'sanitized-svg-master', textState: 'live-text' },
      },
      workflow,
      'candidate-key-01',
    );
    await submitTechnicalDecision(
      'candidate-01',
      {
        candidateFingerprint: hash,
        decision: 'approve-structural-correspondence',
        reason: 'Reviewed.',
        findingDispositions: [],
      },
      workflow,
      'technical-key-01',
      DEMO_WORKFLOW_ACTORS.technicalReviewer,
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/export-candidates');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'if-match': 'workflow:0',
        'idempotency-key': 'candidate-key-01',
        'x-patentdraw-actor-id': DEMO_WORKFLOW_ACTORS.drafter,
      }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/technical-decisions');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'idempotency-key': 'technical-key-01',
        'x-patentdraw-actor-id': DEMO_WORKFLOW_ACTORS.technicalReviewer,
      }),
    });
  });
});

function workflowFixture() {
  return {
    version: 0,
    etag: 'workflow:0',
    state: 'canonical-revision',
    actor: { id: 'drafter-fixture-01', activeRole: 'drafter', roles: ['drafter'] },
    current: {},
    primaryAction: {
      action: 'import-revision',
      label: '导入 SVG',
      availability: 'enabled',
      blockingGates: [],
    },
    actions: [],
    blockingGates: [],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
