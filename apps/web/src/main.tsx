import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { AiAuditEvent, DraftJob, FigurePlanResult } from '@patentdraw/contracts';
import { fixtureDraftAsset, groundedFigurePlanResult } from '@patentdraw/fixtures';

import { DraftAssetPanel } from './features/ai-figure-plan/DraftAssetPanel.js';
import { AiAuditTimeline } from './features/ai-figure-plan/AiAuditTimeline.js';
import { FigurePlanPanel } from './features/ai-figure-plan/FigurePlanPanel.js';

const demoSources = [
  {
    id: 'source-fixture-disclosure-01',
    label: '虚构泵体披露材料（source-fixture-disclosure-01）',
  },
];

function FigurePlanDemo() {
  const [result, setResult] = useState<FigurePlanResult | undefined>();
  const [draftJob, setDraftJob] = useState<DraftJob>({
    id: 'job:demo-draft-fixture-01',
    status: 'ready',
    progressPercent: 100,
    asset: fixtureDraftAsset,
  });
  const [auditEvents, setAuditEvents] = useState<readonly AiAuditEvent[]>([]);

  function showFixtureProposal(input: { purpose: string }) {
    if (groundedFigurePlanResult.status !== 'proposed') {
      throw new Error('The grounded fixture must be a proposal.');
    }

    setResult({
      ...groundedFigurePlanResult,
      proposal: { ...groundedFigurePlanResult.proposal, purpose: input.purpose },
    });
  }

  function simulateSourceAuthorisationRevocation() {
    const occurredAt = '2026-07-31T00:00:00.000Z';
    setAuditEvents([
      {
        id: 'audit-demo-source-revoked',
        eventType: 'source-authorisation-revoked',
        projectId: 'project-fixture-pump',
        actorId: 'attorney-demo-01',
        occurredAt,
        targetIds: ['source-fixture-disclosure-01'],
        reason: 'Demonstration: source authorisation revoked.',
        metadata: { changedTargetId: 'source-fixture-disclosure-01' },
      },
      {
        id: 'audit-demo-run-invalidated',
        eventType: 'ai-run-invalidated',
        projectId: 'project-fixture-pump',
        actorId: 'attorney-demo-01',
        occurredAt,
        targetIds: ['run-fixture-figure-plan-01', 'run-fixture-draft-01'],
        reason: 'Dependent FigurePlan and draft run invalidated.',
        metadata: { changedTargetId: 'source-fixture-disclosure-01' },
      },
      {
        id: 'audit-demo-review-invalidated',
        eventType: 'reviewer-decision-invalidated',
        projectId: 'project-fixture-pump',
        actorId: 'attorney-demo-01',
        occurredAt,
        targetIds: ['decision-demo-01'],
        reason: 'Dependent reviewer decision invalidated.',
        metadata: { changedTargetId: 'source-fixture-disclosure-01' },
      },
    ]);
    setResult({
      status: 'manual-review-required',
      reason: 'The selected source was revoked; request a new source-grounded FigurePlan.',
    });
    setDraftJob((current) => ({
      ...current,
      status: 'invalidated',
      reason: 'The selected source was revoked; this draft cannot be reused.',
    }));
  }

  return (
    <main>
      <h1>PatentDraw — FigurePlan 人工演示</h1>
      <p>
        当前为本地、确定性虚构夹具演示：不调用真实模型、不上传材料，也不会生成 SVG、附图或提交结论。
      </p>
      <ol>
        <li>勾选已授权来源。</li>
        <li>填写本次附图用途，例如“说明泵壳和叶轮的纵向剖视关系”。</li>
        <li>点击 Request FigurePlan，并由撰写人和技术审核员核对每条来源映射。</li>
      </ol>
      <FigurePlanPanel sources={demoSources} result={result} onRequest={showFixtureProposal} />
      <section aria-labelledby="invalidation-demo-heading">
        <h2 id="invalidation-demo-heading">P3 invalidation demonstration</h2>
        <p>
          Simulates revocation of the selected source. It invalidates dependent proposal, draft, and
          review evidence.
        </p>
        <button
          type="button"
          disabled={auditEvents.length > 0}
          onClick={simulateSourceAuthorisationRevocation}
        >
          Simulate source authorisation revocation
        </button>
      </section>
      <DraftAssetPanel
        job={draftJob}
        onSelect={() =>
          setDraftJob((current) =>
            current.asset
              ? { ...current, asset: { ...current.asset, selectionState: 'selected' } }
              : current,
          )
        }
        onCreateIndependentRevision={() =>
          setDraftJob((current) =>
            current.asset
              ? {
                  ...current,
                  asset: {
                    ...current.asset,
                    independentFigureRevisionId: 'revision-demo-independent-svg-01',
                  },
                }
              : current,
          )
        }
      />
      <AiAuditTimeline events={auditEvents} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FigurePlanDemo />
  </StrictMode>,
);
