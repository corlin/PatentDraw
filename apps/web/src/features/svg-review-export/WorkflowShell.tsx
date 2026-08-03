import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AttorneyApprovalDecision,
  AttorneyApprovalDecisionRequest,
  DraftJob,
  ExportCandidate,
  ExportManifest,
  ExportPackage,
  FigurePlanItemDisposition,
  FigurePlanResult,
  FigureRevision,
  RuleRun,
  SvgSanitizationRun,
  TechnicalReviewDecision,
  TechnicalReviewDecisionRequest,
  WorkflowSnapshot,
} from '@patentdraw/contracts';

import {
  cancelDemoDraftJob,
  confirmDemoFigurePlan,
  getDemoDraftJob,
  rejectDemoDraftJob,
  requestDemoDraft,
  requestDemoFigurePlan,
  retryDemoDraftJob,
  selectDemoDraft,
  submitDemoFigurePlanDispositions,
} from '../ai-figure-plan/api-client.js';
import { FindingOverlay } from './FindingOverlay.js';
import { AttorneyApprovalPanel } from './AttorneyApprovalPanel.js';
import { ExportGatePanel } from './ExportGatePanel.js';
import { ExportHistory } from './ExportHistory.js';
import { ManifestPreview } from './ManifestPreview.js';
import { NextActionCard } from './NextActionCard.js';
import { RoleBoundaryNotice } from './RoleBoundaryNotice.js';
import { RuleRunPanel } from './RuleRunPanel.js';
import { SanitizationReport } from './SanitizationReport.js';
import { SvgImportDialog } from './SvgImportDialog.js';
import { SvgRevisionPanel } from './SvgRevisionPanel.js';
import { TechnicalReviewPanel } from './TechnicalReviewPanel.js';
import { WorkflowRail } from './WorkflowRail.js';
import {
  WorkflowApiProblem,
  DEMO_WORKFLOW_ACTORS,
  type DemoWorkflowActorId,
  createExportCandidate,
  createExportPackage,
  createRevision,
  listRevisions,
  listExportPackages,
  listRuleRuns,
  loadExportCandidate,
  loadAttorneyDecision,
  loadExportManifest,
  loadExportPackage,
  loadRevision,
  loadRevisionSvg,
  loadRuleRun,
  loadTechnicalDecision,
  loadWorkflow,
  runRules,
  selectRevision,
  submitTechnicalDecision,
  submitAttorneyDecision,
} from './workflow-api-client.js';

const sourceHash = `sha256:${'1'.repeat(64)}`;

export function WorkflowShell({
  enableDemoActorSwitch = false,
}: {
  enableDemoActorSwitch?: boolean;
}) {
  const [activeActorId, setActiveActorId] = useState<DemoWorkflowActorId>(
    DEMO_WORKFLOW_ACTORS.drafter,
  );
  const [workflow, setWorkflow] = useState<WorkflowSnapshot>();
  const [revision, setRevision] = useState<FigureRevision>();
  const [revisionHistory, setRevisionHistory] = useState<readonly FigureRevision[]>([]);
  const [sanitizationRun, setSanitizationRun] = useState<SvgSanitizationRun>();
  const [ruleRun, setRuleRun] = useState<RuleRun>();
  const [ruleRunHistory, setRuleRunHistory] = useState<readonly RuleRun[]>([]);
  const [candidate, setCandidate] = useState<ExportCandidate>();
  const [technicalDecision, setTechnicalDecision] = useState<TechnicalReviewDecision>();
  const [attorneyDecision, setAttorneyDecision] = useState<AttorneyApprovalDecision>();
  const [exportPackage, setExportPackage] = useState<ExportPackage>();
  const [exportManifest, setExportManifest] = useState<ExportManifest>();
  const [exportHistory, setExportHistory] = useState<readonly ExportPackage[]>([]);
  const [canonicalSvg, setCanonicalSvg] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('正在读取项目工作流…');
  const [error, setError] = useState<string>();
  const [planResult, setPlanResult] = useState<FigurePlanResult>();
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [dispositions, setDispositions] = useState<Record<string, FigurePlanItemDisposition>>({});
  const [draftJob, setDraftJob] = useState<DraftJob>();
  const importPanelRef = useRef<HTMLDivElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await loadWorkflow(activeActorId);
        if (cancelled) return;
        setWorkflow(snapshot);
        setMessage('项目状态已读取；页面加载没有创建 AI 运行或写侧审计。');
        if (snapshot.current.revisionId) {
          const loaded = await loadRevision(snapshot.current.revisionId, activeActorId);
          if (cancelled) return;
          setRevision(loaded.revision);
          setSanitizationRun(loaded.sanitizationRun);
          setCanonicalSvg(await loadRevisionSvg(loaded.revision.id, activeActorId));
          setRevisionHistory(await listRevisions(activeActorId));
        } else {
          setRevision(undefined);
          setSanitizationRun(undefined);
          setCanonicalSvg('');
          setRevisionHistory([]);
        }
        if (snapshot.current.ruleRunId) {
          setRuleRun(await loadRuleRun(snapshot.current.ruleRunId, activeActorId));
          setRuleRunHistory(await listRuleRuns(activeActorId));
        } else {
          setRuleRun(undefined);
          setRuleRunHistory([]);
        }
        if (snapshot.current.candidateId) {
          setCandidate(await loadExportCandidate(snapshot.current.candidateId, activeActorId));
        } else {
          setCandidate(undefined);
        }
        if (snapshot.current.technicalDecisionId) {
          setTechnicalDecision(
            await loadTechnicalDecision(snapshot.current.technicalDecisionId, activeActorId),
          );
        } else {
          setTechnicalDecision(undefined);
        }
        if (snapshot.current.attorneyDecisionId) {
          setAttorneyDecision(
            await loadAttorneyDecision(snapshot.current.attorneyDecisionId, activeActorId),
          );
        } else {
          setAttorneyDecision(undefined);
        }
        if (snapshot.current.exportPackageId) {
          const loadedPackage = await loadExportPackage(
            snapshot.current.exportPackageId,
            activeActorId,
          );
          setExportPackage(loadedPackage);
          setExportManifest(await loadExportManifest(loadedPackage.id, activeActorId));
        } else {
          setExportPackage(undefined);
          setExportManifest(undefined);
        }
        setExportHistory(await listExportPackages(activeActorId));
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeActorId]);

  const findings = ruleRun?.findings ?? [];
  const selectedFinding = useMemo(
    () => findings.find((finding) => finding.id === selectedFindingId),
    [findings, selectedFindingId],
  );

  async function handleImport(svgText: string, filename: string) {
    if (!workflow) return;
    setBusy(true);
    setError(undefined);
    setMessage(`正在安全清洗 ${filename}…`);
    try {
      const created = await createRevision(
        {
          svgText,
          ...(revision ? { parentRevisionId: revision.id } : {}),
          origin: { kind: 'import' },
          confirmedFigurePlanId:
            planResult?.status === 'proposed'
              ? planResult.proposal.id
              : 'proposal-fixture-grounded-01',
          sourceLinks: [{ sourceAssetId: 'source-fixture-disclosure-01', contentHash: sourceHash }],
          referenceRegistryVersionId: 'registry-fixture-01',
          sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
        },
        `revision:${filename}:${Date.now()}`,
        activeActorId,
      );
      setSanitizationRun(created.sanitizationRun);
      if (created.status === 'rejected' || !created.revision) {
        setMessage('SVG 被安全策略拒绝；未创建规范修订。');
        return;
      }
      const selected = await selectRevision(
        {
          revisionId: created.revision.id,
          revisionFingerprint: created.revision.revisionFingerprint,
          expectedCurrentRevisionId: workflow.current.revisionId ?? null,
        },
        created.workflow,
        `selection:${created.revision.id}`,
        activeActorId,
      );
      setWorkflow(selected.workflow);
      setRevision(created.revision);
      setRevisionHistory(await listRevisions(activeActorId));
      setCanonicalSvg(await loadRevisionSvg(created.revision.id, activeActorId));
      setRuleRun(undefined);
      setCandidate(undefined);
      setTechnicalDecision(undefined);
      setAttorneyDecision(undefined);
      setExportPackage(undefined);
      setExportManifest(undefined);
      setSelectedFindingId(undefined);
      setMessage(`已创建并选择修订 ${created.revision.id}。`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleRunRules() {
    if (!workflow || !revision) return;
    setBusy(true);
    setError(undefined);
    setMessage('正在运行规则检查…');
    try {
      const result = await runRules(
        revision.id,
        {
          revisionHash: revision.canonicalSvgHash,
          profile: revision.initialRuleProfile,
        },
        workflow,
        `rule-run:${revision.id}:${Date.now()}`,
        activeActorId,
      );
      setWorkflow(result.workflow);
      setRuleRun(result.run);
      setRuleRunHistory(await listRuleRuns(activeActorId));
      setSelectedFindingId(result.run.findings[0]?.id);
      setMessage(
        result.run.summary.fail > 0
          ? '规则运行完成：存在阻断项，请创建后继修订。'
          : '规则运行完成：没有 fail；警告和人工判断仍需后续复核。',
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCandidate() {
    if (!workflow || !revision || !ruleRun) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await createExportCandidate(
        {
          revisionId: revision.id,
          revisionHash: revision.canonicalSvgHash,
          revisionFingerprint: revision.revisionFingerprint,
          ruleRunId: ruleRun.id,
          ruleProfileHash: ruleRun.profileHash,
          exportSettings: {
            format: 'sanitized-svg-master',
            textState: revision.textState === 'outlined-text' ? 'outlined-text' : 'live-text',
          },
        },
        workflow,
        `candidate:${revision.id}:${ruleRun.id}`,
        activeActorId,
      );
      setCandidate(result.candidate);
      setTechnicalDecision(undefined);
      setAttorneyDecision(undefined);
      setExportPackage(undefined);
      setExportManifest(undefined);
      setWorkflow(result.workflow);
      setMessage('送审候选已绑定到精确修订和规则运行；等待独立技术复核。');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleTechnicalDecision(request: TechnicalReviewDecisionRequest) {
    if (!workflow || !candidate) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await submitTechnicalDecision(
        candidate.id,
        request,
        workflow,
        `technical:${candidate.id}:${request.decision}:${Date.now()}`,
        activeActorId,
      );
      setTechnicalDecision(result.decision);
      setAttorneyDecision(undefined);
      setExportPackage(undefined);
      setExportManifest(undefined);
      setWorkflow(result.workflow);
      setMessage(
        result.decision.decision === 'return-for-change'
          ? '技术复核已不可变退回；请由制图人创建后继修订。'
          : '技术结构对应已批准；代理人审批仍是后续独立边界。',
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleAttorneyDecision(request: AttorneyApprovalDecisionRequest) {
    if (!workflow || !candidate) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await submitAttorneyDecision(
        candidate.id,
        request,
        workflow,
        `attorney:${candidate.id}:${request.decision}:${Date.now()}`,
        activeActorId,
      );
      setAttorneyDecision(result.decision);
      setWorkflow(result.workflow);
      setMessage(
        result.decision.decision === 'approve-export'
          ? '代理人已独立批准当前候选；现在可生成哈希绑定的 SVG 与清单。'
          : '代理人已不可变拒绝当前候选。',
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateExport() {
    if (!workflow || !candidate || !technicalDecision || !attorneyDecision) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await createExportPackage(
        candidate,
        technicalDecision.id,
        attorneyDecision.id,
        workflow,
        `export:${candidate.id}:${attorneyDecision.id}`,
        activeActorId,
      );
      setExportPackage(result.package);
      setExportManifest(result.manifest);
      setWorkflow(result.workflow);
      setExportHistory(await listExportPackages(activeActorId));
      setMessage('SVG 与规范化清单已通过双哈希复验并写入不可变导出历史。');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function requestPlan() {
    setBusy(true);
    try {
      const result = await requestDemoFigurePlan({
        purpose: '说明泵壳和叶轮的纵向剖视关系。',
        selectedSourceIds: ['source-fixture-disclosure-01'],
      });
      setPlanResult(result);
      setDispositions({});
      setMessage('FigurePlan 已生成；请逐项明确处置。');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmPlan() {
    if (planResult?.status !== 'proposed') return;
    const items = planResult.proposal.sourceMappings.map(
      (mapping) => dispositions[mapping.proposalElementId],
    );
    if (items.some((item) => !item)) {
      setError('每个 FigurePlan 项都必须明确接受、拒绝、编辑或保留为开放问题。');
      return;
    }
    setBusy(true);
    try {
      await submitDemoFigurePlanDispositions(
        planResult.proposal.id,
        items as FigurePlanItemDisposition[],
      );
      await confirmDemoFigurePlan(planResult.proposal.id);
      setPlanConfirmed(true);
      setMessage('FigurePlan 已按逐项处置确认。');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    if (planResult?.status !== 'proposed') return;
    setBusy(true);
    try {
      const queued = await requestDemoDraft(planResult.proposal.id);
      setDraftJob(queued);
      await pollDraft(queued.id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function pollDraft(jobId: string) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = await getDemoDraftJob(jobId);
      setDraftJob(current);
      if (!['queued', 'running'].includes(current.status)) return;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
  }

  async function draftAction(action: 'cancel' | 'select' | 'reject' | 'retry') {
    if (!draftJob || planResult?.status !== 'proposed') return;
    setBusy(true);
    try {
      const next =
        action === 'cancel'
          ? await cancelDemoDraftJob(draftJob.id)
          : action === 'select'
            ? await selectDemoDraft(draftJob.id)
            : action === 'reject'
              ? await rejectDemoDraftJob(draftJob.id, '制图人明确拒绝作为正式制图参考。')
              : await retryDemoDraftJob(draftJob.id, planResult.proposal.id);
      setDraftJob(next);
      if (action === 'retry') await pollDraft(next.id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function updateDisposition(
    proposalElementId: string,
    disposition: FigurePlanItemDisposition['disposition'],
  ) {
    setDispositions((current) => ({
      ...current,
      [proposalElementId]: {
        proposalElementId,
        disposition,
        ...(disposition === 'edited' ? { editedValue: `${proposalElementId}（已人工编辑）` } : {}),
        ...(disposition === 'rejected' || disposition === 'open-question'
          ? { reason: '由制图人记录的示例理由。' }
          : {}),
      },
    }));
  }

  function primaryAction(action: WorkflowSnapshot['primaryAction']['action']) {
    if (action === 'run-checks') void handleRunRules();
    if (action === 'create-export-candidate') void handleCreateCandidate();
    if (action === 'technical-approve' || action === 'technical-return') {
      reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (action === 'attorney-approve' || action === 'attorney-reject') {
      reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (action === 'create-export') void handleCreateExport();
    if (action === 'import-revision' || action === 'create-revision') {
      importPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (!workflow) {
    return (
      <main className="workflow-loading" aria-busy="true">
        <p role="status">{error ?? message}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <strong>PatentDraw</strong>
        </div>
        <span className="top-divider" />
        <div className="project-title">离心泵纵向剖视图 · P3</div>
        <div className="profile-chip">{revision?.initialRuleProfile.id ?? 'CNIPA-2026.1'}</div>
        <div className="actor-chip">
          {workflow.actor.id} · {workflow.actor.activeRole}
        </div>
        <div className="sync-state">● 工作流 v{workflow.version}</div>
      </header>

      <WorkflowRail state={workflow.state} />

      <section className="canvas-workspace" aria-label="规范 SVG 画布">
        <div className="canvas-toolbar">
          <strong>{revision ? revision.id : '尚无规范修订'}</strong>
          <span className="canvas-meta">
            {revision ? revision.canonicalSvgHash.slice(0, 24) : '等待导入 SVG'}
          </span>
        </div>
        <div className="svg-canvas">
          {canonicalSvg ? (
            <div className="canonical-svg" dangerouslySetInnerHTML={{ __html: canonicalSvg }} />
          ) : (
            <div className="canvas-empty">
              <img src="/assets/pump-section-figure.png" alt="仅作为布局参考的泵剖视图" />
              <p>当前展示是布局参考；导入后才会显示规范化 SVG。</p>
            </div>
          )}
          <FindingOverlay
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelect={setSelectedFindingId}
          />
        </div>
        <div className="provenance-strip">
          <span>来源：虚构授权材料</span>
          <span>规范主文件：{revision ? '已建立' : '未建立'}</span>
          <span>所选证据：{selectedFinding?.ruleId ?? '无'}</span>
        </div>
      </section>

      <aside className="workflow-inspector" aria-label="工作流检查器">
        <div className="status-region" aria-live="polite">
          {message}
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <NextActionCard action={workflow.primaryAction} busy={busy} onAction={primaryAction} />

        <RoleBoundaryNotice
          workflow={workflow}
          {...(enableDemoActorSwitch ? { activeActorId, onActorChange: setActiveActorId } : {})}
        />

        <details className="upstream-panel">
          <summary>上游 FigurePlan 与 AI 草图（显式操作）</summary>
          {!planResult && (
            <button type="button" onClick={() => void requestPlan()}>
              生成 FigurePlan
            </button>
          )}
          {planResult?.status === 'proposed' && (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>来源</th>
                    <th>处置</th>
                  </tr>
                </thead>
                <tbody>
                  {planResult.proposal.sourceMappings.map((mapping) => (
                    <tr key={mapping.proposalElementId}>
                      <td>{mapping.proposalElementId}</td>
                      <td>{mapping.locationReference}</td>
                      <td>
                        <select
                          aria-label={`${mapping.proposalElementId} 处置`}
                          value={dispositions[mapping.proposalElementId]?.disposition ?? ''}
                          onChange={(event) =>
                            updateDisposition(
                              mapping.proposalElementId,
                              event.target.value as FigurePlanItemDisposition['disposition'],
                            )
                          }
                        >
                          <option value="">请选择</option>
                          <option value="accepted">接受</option>
                          <option value="rejected">拒绝</option>
                          <option value="edited">编辑</option>
                          <option value="open-question">开放问题</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                disabled={busy || planConfirmed}
                onClick={() => void confirmPlan()}
              >
                {planConfirmed ? 'FigurePlan 已确认' : '提交逐项处置并确认'}
              </button>
              {planConfirmed && !draftJob && (
                <button type="button" onClick={() => void createDraft()}>
                  生成非权威草图
                </button>
              )}
            </div>
          )}
          {draftJob && (
            <div className="draft-actions">
              <p>
                草图任务：{draftJob.status} · {draftJob.progressPercent}%
              </p>
              {['queued', 'running'].includes(draftJob.status) && (
                <button type="button" onClick={() => void draftAction('cancel')}>
                  取消
                </button>
              )}
              {draftJob.status === 'ready' && draftJob.asset?.selectionState === 'unselected' && (
                <button type="button" onClick={() => void draftAction('select')}>
                  设为参考
                </button>
              )}
              {draftJob.status === 'ready' && (
                <button type="button" onClick={() => void draftAction('reject')}>
                  拒绝草图
                </button>
              )}
              {['failed', 'refused', 'cancelled', 'rejected'].includes(draftJob.status) && (
                <button type="button" onClick={() => void draftAction('retry')}>
                  重试生成
                </button>
              )}
            </div>
          )}
        </details>

        <div ref={importPanelRef}>
          <SvgImportDialog
            busy={busy}
            currentRevisionId={revision?.id}
            onImport={(text, name) => void handleImport(text, name)}
          />
        </div>
        <SanitizationReport run={sanitizationRun} />
        <SvgRevisionPanel revision={revision} history={revisionHistory} />
        {revision && (
          <button
            type="button"
            className="secondary-action"
            disabled={busy}
            onClick={() => void handleRunRules()}
          >
            运行 {revision.initialRuleProfile.id} 规则检查
          </button>
        )}
        <RuleRunPanel
          run={ruleRun}
          history={ruleRunHistory}
          onSelectFinding={setSelectedFindingId}
        />
        <div ref={reviewPanelRef}>
          {candidate && ruleRun && (
            <TechnicalReviewPanel
              key={candidate.id}
              candidate={candidate}
              ruleRun={ruleRun}
              decision={technicalDecision}
              canReview={
                workflow.actor.activeRole === 'technical-reviewer' &&
                workflow.primaryAction.action === 'technical-approve' &&
                workflow.primaryAction.availability === 'enabled'
              }
              busy={busy}
              onSubmit={(request) => void handleTechnicalDecision(request)}
            />
          )}
          {candidate &&
            technicalDecision?.decision === 'approve-structural-correspondence' &&
            !attorneyDecision && (
              <AttorneyApprovalPanel
                key={`${candidate.id}:attorney`}
                candidate={candidate}
                technicalDecision={technicalDecision}
                canApprove={
                  workflow.actor.activeRole === 'attorney-agent' &&
                  workflow.primaryAction.action === 'attorney-approve' &&
                  workflow.primaryAction.availability === 'enabled'
                }
                busy={busy}
                onSubmit={(request) => void handleAttorneyDecision(request)}
              />
            )}
          {candidate && technicalDecision && attorneyDecision?.decision === 'approve-export' && (
            <ExportGatePanel
              candidate={candidate}
              attorneyDecisionId={attorneyDecision.id}
              packageRecord={exportPackage}
              busy={busy}
              canExport={
                workflow.actor.activeRole === 'attorney-agent' &&
                workflow.primaryAction.action === 'create-export' &&
                workflow.primaryAction.availability === 'enabled'
              }
              onExport={() => void handleCreateExport()}
            />
          )}
          {exportManifest && <ManifestPreview manifest={exportManifest} />}
          <ExportHistory packages={exportHistory} />
        </div>
      </aside>
    </main>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof WorkflowApiProblem) {
    return `${error.problem.code}：${error.problem.detail}`;
  }
  return error instanceof Error ? error.message : '发生未知错误。';
}
