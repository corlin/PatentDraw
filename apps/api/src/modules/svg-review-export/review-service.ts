import { createHash, randomUUID } from 'node:crypto';

import type {
  CreateExportCandidateRequest,
  ExportCandidate,
  RuleRun,
  TechnicalReviewDecision,
  TechnicalReviewDecisionRequest,
} from '@patentdraw/contracts';

import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import { WorkflowCommandError } from './problems.js';
import {
  StaleWorkflowError,
  type SvgWorkflowRepository,
  type WorkflowProjectionRecord,
} from './repository.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';

export async function createExportCandidate(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  figureId: string;
  expectedVersion: number;
  request: CreateExportCandidateRequest;
  candidateId?: string;
  now?: () => Date;
}): Promise<{ candidate: ExportCandidate; projection: WorkflowProjectionRecord }> {
  assertDrafter(input.context);
  const current = await currentProjection(input);
  if (
    current.currentRevisionId !== input.request.revisionId ||
    current.currentRuleRunId !== input.request.ruleRunId
  ) {
    throw new WorkflowCommandError(
      'checked-candidate-stale',
      409,
      'The requested revision and rule run are not the current checked candidate.',
    );
  }
  const revision = await input.repository.getRevision(
    input.context.projectId,
    input.request.revisionId,
  );
  const ruleRun = await input.repository.getRuleRun(
    input.context.projectId,
    input.request.ruleRunId,
  );
  if (
    !revision ||
    revision.figureId !== input.figureId ||
    !ruleRun ||
    ruleRun.figureId !== input.figureId
  ) {
    throw new WorkflowCommandError(
      'checked-candidate-not-found',
      404,
      'The checked revision or rule run was not found in this figure.',
    );
  }
  if (
    revision.canonicalSvgHash !== input.request.revisionHash ||
    revision.revisionFingerprint !== input.request.revisionFingerprint ||
    ruleRun.revisionId !== revision.id ||
    ruleRun.revisionHash !== revision.canonicalSvgHash ||
    ruleRun.revisionFingerprint !== revision.revisionFingerprint ||
    ruleRun.profileHash !== input.request.ruleProfileHash
  ) {
    throw new WorkflowCommandError(
      'checked-candidate-fingerprint-mismatch',
      409,
      'The revision, rule run or reviewed profile fingerprint is stale.',
    );
  }
  if (ruleRun.summary.fail > 0) {
    throw new WorkflowCommandError(
      'blocking-findings-present',
      422,
      'A candidate cannot be created while the current rule run contains fail findings.',
      ruleRun.findings
        .filter((finding) => finding.outcome === 'fail')
        .map((finding) => ({
          code: 'blocking-rule-finding',
          message: finding.remediation.summary,
          targetId: finding.id,
          recoveryAction: 'create-revision' as const,
        })),
    );
  }

  const exportSettingsHash = hashCanonical(input.request.exportSettings);
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const base = {
    projectId: input.context.projectId,
    figureId: input.figureId,
    revisionId: revision.id,
    revisionHash: revision.canonicalSvgHash,
    revisionFingerprint: revision.revisionFingerprint,
    ruleRunId: ruleRun.id,
    ruleProfileHash: ruleRun.profileHash,
    warningFindingIds: findingIds(ruleRun, 'warning'),
    manualFindingIds: findingIds(ruleRun, 'manual-review-required'),
    exportSettings: structuredClone(input.request.exportSettings),
    exportSettingsHash,
    cnipaAssessment: {
      label: ruleRun.profileId.startsWith('CNIPA')
        ? ('not-CNIPA-electronic-submission-ready' as const)
        : ('not-applicable' as const),
    },
  };
  const candidate: ExportCandidate = {
    id: input.candidateId ?? `candidate:${randomUUID()}`,
    ...base,
    candidateFingerprint: hashCanonical(base),
    createdByActorId: input.context.actorId,
    createdAt,
  };
  await input.repository.saveExportCandidate(candidate);
  const projection = await input.repository.compareAndSwapProjection({
    expectedVersion: input.expectedVersion,
    next: {
      ...withoutVersion(current),
      currentCandidateId: candidate.id,
    },
  });
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType: 'export-candidate-created',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [candidate.id, revision.id, ruleRun.id],
    outcome: 'accepted',
    reasonCode: 'candidate-created-for-technical-review',
    reason: 'The exact checked revision and rule run were bound as an export candidate.',
    fingerprints: { candidate: candidate.candidateFingerprint },
    occurredAt: createdAt,
  });
  return { candidate, projection };
}

export async function submitTechnicalReviewDecision(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  figureId: string;
  candidateId: string;
  expectedVersion: number;
  request: TechnicalReviewDecisionRequest;
  decisionId?: string;
  now?: () => Date;
}): Promise<{ decision: TechnicalReviewDecision; projection: WorkflowProjectionRecord }> {
  assertTechnicalReviewer(input.context);
  const current = await currentProjection(input);
  if (current.currentCandidateId !== input.candidateId) {
    throw new WorkflowCommandError(
      'current-candidate-mismatch',
      409,
      'The export candidate changed; reload before recording a technical decision.',
    );
  }
  const candidate = await input.repository.getExportCandidate(
    input.context.projectId,
    input.candidateId,
  );
  if (!candidate || candidate.figureId !== input.figureId) {
    throw new WorkflowCommandError(
      'export-candidate-not-found',
      404,
      'Export candidate was not found.',
    );
  }
  if (candidate.candidateFingerprint !== input.request.candidateFingerprint) {
    throw new WorkflowCommandError(
      'candidate-fingerprint-mismatch',
      409,
      'The export candidate fingerprint is stale.',
    );
  }
  if (
    current.currentRevisionId !== candidate.revisionId ||
    current.currentRuleRunId !== candidate.ruleRunId
  ) {
    throw new WorkflowCommandError(
      'candidate-evidence-stale',
      409,
      'The candidate no longer points to the current revision and rule run.',
    );
  }
  const revision = await input.repository.getRevision(
    input.context.projectId,
    candidate.revisionId,
  );
  const ruleRun = await input.repository.getRuleRun(input.context.projectId, candidate.ruleRunId);
  if (!revision || !ruleRun) {
    throw new WorkflowCommandError(
      'candidate-evidence-not-found',
      404,
      'The candidate revision or rule run was not found.',
    );
  }
  if (revision.createdByActorId === input.context.actorId) {
    throw new WorkflowCommandError(
      'revision-author-cannot-technically-approve',
      403,
      'The canonical revision author cannot provide its technical review decision.',
    );
  }
  if (ruleRun.summary.fail > 0) {
    throw new WorkflowCommandError(
      'blocking-findings-present',
      422,
      'Technical review cannot proceed while fail findings remain.',
    );
  }
  validateTechnicalDecision(input.request, candidate.manualFindingIds);

  const decidedAt = (input.now ?? (() => new Date()))().toISOString();
  const decision: TechnicalReviewDecision = {
    id: input.decisionId ?? `technical-decision:${randomUUID()}`,
    candidateId: candidate.id,
    candidateFingerprint: candidate.candidateFingerprint,
    revisionId: candidate.revisionId,
    ruleRunId: candidate.ruleRunId,
    decision: input.request.decision,
    reason: input.request.reason.trim(),
    findingDispositions: input.request.findingDispositions.map((item) => ({
      ...item,
      reason: item.reason.trim(),
    })),
    actorId: input.context.actorId,
    activeRole: 'technical-reviewer',
    decidedAt,
  };
  await input.repository.saveTechnicalDecision(decision, input.context.projectId);
  const projection = await input.repository.compareAndSwapProjection({
    expectedVersion: input.expectedVersion,
    next: {
      ...withoutVersion(current),
      currentTechnicalDecisionId: decision.id,
    },
  });
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType:
      decision.decision === 'return-for-change'
        ? 'technical-review-returned'
        : 'technical-review-approved',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [candidate.id, decision.id, ...candidate.manualFindingIds],
    outcome: 'accepted',
    reasonCode: decision.decision,
    reason: decision.reason,
    fingerprints: { candidate: candidate.candidateFingerprint },
    occurredAt: decidedAt,
  });
  return { decision, projection };
}

function validateTechnicalDecision(
  request: TechnicalReviewDecisionRequest,
  requiredFindingIds: readonly string[],
): void {
  if (request.reason.trim().length === 0) {
    throw new WorkflowCommandError(
      'technical-review-reason-required',
      422,
      'A review reason is required.',
    );
  }
  const provided = new Map<string, TechnicalReviewDecisionRequest['findingDispositions'][number]>();
  for (const disposition of request.findingDispositions) {
    if (disposition.reason.trim().length === 0 || provided.has(disposition.findingId)) {
      throw new WorkflowCommandError(
        'incomplete-finding-dispositions',
        422,
        'Every manual finding requires exactly one reasoned disposition.',
      );
    }
    provided.set(disposition.findingId, disposition);
  }
  if (
    provided.size !== requiredFindingIds.length ||
    requiredFindingIds.some((findingId) => !provided.has(findingId)) ||
    [...provided].some(([findingId]) => !requiredFindingIds.includes(findingId))
  ) {
    throw new WorkflowCommandError(
      'incomplete-finding-dispositions',
      422,
      'Every manual finding requires exactly one reasoned disposition.',
      requiredFindingIds
        .filter((findingId) => !provided.has(findingId))
        .map((findingId) => ({
          code: 'manual-finding-disposition-required',
          message: 'Record a named and reasoned technical disposition.',
          targetId: findingId,
        })),
    );
  }
  if (
    request.decision === 'approve-structural-correspondence' &&
    request.findingDispositions.some((item) => item.disposition === 'requires-change')
  ) {
    throw new WorkflowCommandError(
      'requires-change-blocks-technical-approval',
      422,
      'A technical approval cannot contain a requires-change disposition.',
    );
  }
}

async function currentProjection(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  figureId: string;
  expectedVersion: number;
}): Promise<WorkflowProjectionRecord> {
  const current = await input.repository.getProjection(input.context.projectId, input.figureId);
  if (current.version !== input.expectedVersion) throw new StaleWorkflowError(current);
  return current;
}

function assertDrafter(context: ProjectContext): void {
  if (!['drafter', 'contributor'].includes(context.activeRole)) {
    throw new WorkflowCommandError(
      'drafter-role-required',
      403,
      'Creating an export candidate requires an active drafter role.',
    );
  }
}

function assertTechnicalReviewer(context: ProjectContext): void {
  if (
    context.activeRole !== 'technical-reviewer' ||
    !context.roles.includes('technical-reviewer')
  ) {
    throw new WorkflowCommandError(
      'technical-reviewer-role-required',
      403,
      'An assigned active technical-reviewer role is required.',
    );
  }
}

function findingIds(ruleRun: RuleRun, outcome: 'warning' | 'manual-review-required'): string[] {
  return ruleRun.findings
    .filter((finding) => finding.outcome === outcome)
    .map((finding) => finding.id);
}

function withoutVersion(
  projection: WorkflowProjectionRecord,
): Omit<WorkflowProjectionRecord, 'version'> {
  return {
    projectId: projection.projectId,
    figureId: projection.figureId,
    ...(projection.currentRevisionId ? { currentRevisionId: projection.currentRevisionId } : {}),
    ...(projection.currentRuleRunId ? { currentRuleRunId: projection.currentRuleRunId } : {}),
    ...(projection.currentCandidateId ? { currentCandidateId: projection.currentCandidateId } : {}),
    ...(projection.currentTechnicalDecisionId
      ? { currentTechnicalDecisionId: projection.currentTechnicalDecisionId }
      : {}),
    ...(projection.currentAttorneyDecisionId
      ? { currentAttorneyDecisionId: projection.currentAttorneyDecisionId }
      : {}),
    ...(projection.currentExportPackageId
      ? { currentExportPackageId: projection.currentExportPackageId }
      : {}),
    ...(projection.currentInvalidationId
      ? { currentInvalidationId: projection.currentInvalidationId }
      : {}),
  };
}

function hashCanonical(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
