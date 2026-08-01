import type {
  BlockingGate,
  ProjectRole,
  WorkflowAction,
  WorkflowActionName,
  WorkflowSnapshot,
  WorkflowState,
} from '@patentdraw/contracts';

import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import type { SvgWorkflowRepository, WorkflowProjectionRecord } from './repository.js';

interface SnapshotEvidence {
  projection: WorkflowProjectionRecord;
  revisionAuthorId?: string;
  ruleHasFailures: boolean;
  technicalDecision?: 'approve-structural-correspondence' | 'return-for-change';
  technicalActorId?: string;
  attorneyDecision?: 'approve-export' | 'reject-export';
  invalidationAction?: WorkflowActionName;
  inconsistent: boolean;
}

export async function getWorkflowSnapshot(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  figureId: string;
}): Promise<WorkflowSnapshot> {
  const projection = await input.repository.getProjection(input.context.projectId, input.figureId);
  const evidence = await loadEvidence(input.repository, projection);
  return deriveWorkflowSnapshot(input.context, evidence);
}

export function deriveWorkflowSnapshot(
  context: ProjectContext,
  evidence: SnapshotEvidence,
): WorkflowSnapshot {
  const current = currentReferences(evidence.projection);
  const inconsistentGate: BlockingGate = {
    code: 'workflow-projection-inconsistent',
    message:
      'The workflow references unavailable evidence. Reload or ask an administrator to repair it.',
    recoveryAction: 'reload-current-workflow',
  };

  let state: WorkflowState;
  let primaryAction: WorkflowAction;

  if (evidence.inconsistent) {
    state = 'invalidated';
    primaryAction = action('reload-current-workflow', '重新加载工作流', 'enabled', undefined, [
      inconsistentGate,
    ]);
  } else if (evidence.projection.currentInvalidationId) {
    state = 'invalidated';
    primaryAction = action(
      evidence.invalidationAction ?? 'create-revision',
      '按失效点重新开始',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
    );
  } else if (!evidence.projection.currentRevisionId) {
    state = 'canonical-revision';
    primaryAction = action(
      'import-revision',
      '导入规范 SVG 修订',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
    );
  } else if (!evidence.projection.currentRuleRunId) {
    state = 'canonical-revision';
    primaryAction = action(
      'run-checks',
      '运行规则检查',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
      evidence.projection.currentRevisionId,
    );
  } else if (evidence.ruleHasFailures) {
    state = 'checks-blocked';
    primaryAction = action(
      'create-revision',
      '修复并创建新修订',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
      evidence.projection.currentRevisionId,
    );
  } else if (!evidence.projection.currentCandidateId) {
    state = 'checks-ready';
    primaryAction = action(
      'create-export-candidate',
      '创建送审候选',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
      evidence.projection.currentRuleRunId,
    );
  } else if (!evidence.projection.currentTechnicalDecisionId) {
    state = 'technical-review';
    const selfReview = evidence.revisionAuthorId === context.actorId;
    const enabled = context.activeRole === 'technical-reviewer' && !selfReview;
    const gates: BlockingGate[] = [];
    if (context.activeRole !== 'technical-reviewer') gates.push(roleGate('technical-reviewer'));
    if (selfReview) {
      gates.push({
        code: 'revision-author-cannot-technically-approve',
        message: 'The canonical revision author cannot provide its technical approval.',
      });
    }
    primaryAction = action(
      'technical-approve',
      '批准结构对应',
      enabled ? 'enabled' : selfReview ? 'disabled' : 'waiting',
      'technical-reviewer',
      gates,
      evidence.projection.currentCandidateId,
    );
  } else if (evidence.technicalDecision === 'return-for-change') {
    state = 'changes-requested';
    primaryAction = action(
      'create-revision',
      '按审核意见创建新修订',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
      evidence.projection.currentRevisionId,
    );
  } else if (!evidence.projection.currentAttorneyDecisionId) {
    state = 'attorney-approval';
    const sameReviewer = evidence.technicalActorId === context.actorId;
    const enabled = context.activeRole === 'attorney-agent' && !sameReviewer;
    const gates: BlockingGate[] = [];
    if (context.activeRole !== 'attorney-agent') gates.push(roleGate('attorney-agent'));
    if (sameReviewer) {
      gates.push({
        code: 'technical-reviewer-cannot-attorney-approve',
        message: 'The technical reviewer cannot also provide the attorney approval.',
      });
    }
    primaryAction = action(
      'attorney-approve',
      '提交代理审批',
      enabled ? 'enabled' : sameReviewer ? 'disabled' : 'waiting',
      'attorney-agent',
      gates,
      evidence.projection.currentCandidateId,
    );
  } else if (evidence.attorneyDecision === 'reject-export') {
    state = 'changes-requested';
    primaryAction = action(
      'create-revision',
      '按代理意见创建新修订',
      canDraft(context) ? 'enabled' : 'waiting',
      'drafter',
      canDraft(context) ? [] : [roleGate('drafter')],
      evidence.projection.currentRevisionId,
    );
  } else if (!evidence.projection.currentExportPackageId) {
    state = 'approved-for-export';
    const enabled = context.activeRole === 'attorney-agent';
    primaryAction = action(
      'create-export',
      '创建可追溯导出包',
      enabled ? 'enabled' : 'waiting',
      'attorney-agent',
      enabled ? [] : [roleGate('attorney-agent')],
      evidence.projection.currentCandidateId,
    );
  } else {
    state = 'exported';
    primaryAction = action(
      'download-export',
      '下载导出包',
      'enabled',
      undefined,
      [],
      evidence.projection.currentExportPackageId,
    );
  }

  const actions = [primaryAction];
  if (state === 'technical-review' && primaryAction.availability === 'enabled') {
    actions.push(
      action(
        'technical-return',
        '退回修改',
        'enabled',
        'technical-reviewer',
        [],
        evidence.projection.currentCandidateId,
      ),
    );
  }

  return {
    version: evidence.projection.version,
    etag: `workflow:${evidence.projection.version}`,
    state,
    actor: { id: context.actorId, activeRole: context.activeRole, roles: [...context.roles] },
    current,
    primaryAction,
    actions,
    blockingGates: [...primaryAction.blockingGates],
  };
}

async function loadEvidence(
  repository: SvgWorkflowRepository,
  projection: WorkflowProjectionRecord,
): Promise<SnapshotEvidence> {
  const revision = projection.currentRevisionId
    ? await repository.getRevision(projection.projectId, projection.currentRevisionId)
    : null;
  const ruleRun = projection.currentRuleRunId
    ? await repository.getRuleRun(projection.projectId, projection.currentRuleRunId)
    : null;
  const candidate = projection.currentCandidateId
    ? await repository.getExportCandidate(projection.projectId, projection.currentCandidateId)
    : null;
  const technical = projection.currentTechnicalDecisionId
    ? await repository.getTechnicalDecision(
        projection.projectId,
        projection.currentTechnicalDecisionId,
      )
    : null;
  const attorney = projection.currentAttorneyDecisionId
    ? await repository.getAttorneyDecision(
        projection.projectId,
        projection.currentAttorneyDecisionId,
      )
    : null;
  const invalidation = projection.currentInvalidationId
    ? await repository.getInvalidation(projection.projectId, projection.currentInvalidationId)
    : null;
  const exportPackage = projection.currentExportPackageId
    ? await repository.getExportPackage(projection.projectId, projection.currentExportPackageId)
    : null;

  return {
    projection,
    ...(revision ? { revisionAuthorId: revision.createdByActorId } : {}),
    ruleHasFailures: (ruleRun?.summary.fail ?? 0) > 0,
    ...(technical
      ? { technicalDecision: technical.decision, technicalActorId: technical.actorId }
      : {}),
    ...(attorney ? { attorneyDecision: attorney.decision } : {}),
    ...(invalidation
      ? { invalidationAction: invalidationAction(invalidation.earliestRequiredAction) }
      : {}),
    inconsistent:
      Boolean(projection.currentRevisionId) !== Boolean(revision) ||
      Boolean(projection.currentRuleRunId) !== Boolean(ruleRun) ||
      Boolean(projection.currentCandidateId) !== Boolean(candidate) ||
      Boolean(projection.currentTechnicalDecisionId) !== Boolean(technical) ||
      Boolean(projection.currentAttorneyDecisionId) !== Boolean(attorney) ||
      Boolean(projection.currentInvalidationId) !== Boolean(invalidation) ||
      Boolean(projection.currentExportPackageId) !== Boolean(exportPackage),
  };
}

function currentReferences(projection: WorkflowProjectionRecord): WorkflowSnapshot['current'] {
  const current: WorkflowSnapshot['current'] = {};
  if (projection.currentRevisionId) current.revisionId = projection.currentRevisionId;
  if (projection.currentRuleRunId) current.ruleRunId = projection.currentRuleRunId;
  if (projection.currentCandidateId) current.candidateId = projection.currentCandidateId;
  if (projection.currentTechnicalDecisionId) {
    current.technicalDecisionId = projection.currentTechnicalDecisionId;
  }
  if (projection.currentAttorneyDecisionId) {
    current.attorneyDecisionId = projection.currentAttorneyDecisionId;
  }
  if (projection.currentExportPackageId)
    current.exportPackageId = projection.currentExportPackageId;
  return current;
}

function action(
  name: WorkflowActionName,
  label: string,
  availability: WorkflowAction['availability'],
  requiredRole: ProjectRole | undefined,
  blockingGates: BlockingGate[],
  targetId?: string,
): WorkflowAction {
  return {
    action: name,
    label,
    availability,
    ...(requiredRole ? { requiredRole } : {}),
    ...(targetId ? { targetId } : {}),
    blockingGates,
  };
}

function roleGate(role: ProjectRole): BlockingGate {
  return {
    code: 'required-active-role',
    message: `Switch to or wait for the required ${role} role.`,
    recoveryAction: 'await-required-role',
  };
}

function canDraft(context: ProjectContext): boolean {
  return context.activeRole === 'drafter' || context.activeRole === 'contributor';
}

function invalidationAction(
  earliest:
    | 'create-or-select-revision'
    | 'run-checks'
    | 'submit-technical-review'
    | 'submit-attorney-approval'
    | 'create-export',
): WorkflowActionName {
  const actions: Record<typeof earliest, WorkflowActionName> = {
    'create-or-select-revision': 'create-revision',
    'run-checks': 'run-checks',
    'submit-technical-review': 'technical-approve',
    'submit-attorney-approval': 'attorney-approve',
    'create-export': 'create-export',
  };
  return actions[earliest];
}
