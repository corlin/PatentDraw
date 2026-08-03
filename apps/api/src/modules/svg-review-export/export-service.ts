import { createHash, randomUUID } from 'node:crypto';

import type {
  CreateExportPackageRequest,
  ExportManifest,
  ExportPackage,
  Sha256,
} from '@patentdraw/contracts';

import type { PrivateObjectStorage } from '../../infrastructure/object-storage.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import { WorkflowCommandError } from './problems.js';
import {
  StaleWorkflowError,
  type SvgWorkflowRepository,
  type WorkflowProjectionRecord,
} from './repository.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';

const encoder = new TextEncoder();

export async function createExportPackage(input: {
  repository: SvgWorkflowRepository;
  storage: PrivateObjectStorage;
  context: ProjectContext;
  figureId: string;
  candidateId: string;
  expectedVersion: number;
  request: CreateExportPackageRequest;
  packageId?: string;
  now?: () => Date;
}): Promise<{
  package: ExportPackage;
  manifest: ExportManifest;
  projection: WorkflowProjectionRecord;
}> {
  assertAttorneyAgent(input.context);
  const current = await input.repository.getProjection(input.context.projectId, input.figureId);
  if (current.version !== input.expectedVersion) throw new StaleWorkflowError(current);
  if (
    current.currentCandidateId !== input.candidateId ||
    current.currentTechnicalDecisionId !== input.request.technicalDecisionId ||
    current.currentAttorneyDecisionId !== input.request.attorneyDecisionId
  ) {
    throw new WorkflowCommandError(
      'attorney-approval-required',
      409,
      'The current candidate requires the exact current technical and attorney approvals.',
    );
  }
  const [candidate, technicalDecision, attorneyDecision] = await Promise.all([
    input.repository.getExportCandidate(input.context.projectId, input.candidateId),
    input.repository.getTechnicalDecision(
      input.context.projectId,
      input.request.technicalDecisionId,
    ),
    input.repository.getAttorneyDecision(input.context.projectId, input.request.attorneyDecisionId),
  ]);
  if (!candidate || candidate.figureId !== input.figureId) {
    throw new WorkflowCommandError(
      'export-candidate-not-found',
      404,
      'Export candidate was not found.',
    );
  }
  if (
    candidate.candidateFingerprint !== input.request.candidateFingerprint ||
    technicalDecision?.candidateFingerprint !== candidate.candidateFingerprint ||
    attorneyDecision?.candidateFingerprint !== candidate.candidateFingerprint
  ) {
    throw new WorkflowCommandError(
      'candidate-fingerprint-mismatch',
      409,
      'The export candidate or approval fingerprint is stale.',
    );
  }
  if (
    !technicalDecision ||
    technicalDecision.candidateId !== candidate.id ||
    technicalDecision.decision !== 'approve-structural-correspondence' ||
    !attorneyDecision ||
    attorneyDecision.candidateId !== candidate.id ||
    attorneyDecision.technicalDecisionId !== technicalDecision.id ||
    attorneyDecision.decision !== 'approve-export'
  ) {
    throw new WorkflowCommandError(
      'attorney-approval-required',
      409,
      'A current approve-export decision over the approved candidate is required.',
    );
  }
  if (attorneyDecision.actorId !== input.context.actorId) {
    throw new WorkflowCommandError(
      'approving-attorney-required-for-export',
      403,
      'The attorney who approved this candidate must create its export package.',
    );
  }

  const [revision, ruleRun] = await Promise.all([
    input.repository.getRevision(input.context.projectId, candidate.revisionId),
    input.repository.getRuleRun(input.context.projectId, candidate.ruleRunId),
  ]);
  if (!revision || !ruleRun) {
    throw new WorkflowCommandError(
      'candidate-evidence-not-found',
      404,
      'Export evidence was not found.',
    );
  }
  const svgBytes = await input.storage.get(revision.canonicalSvgHash);
  const svgHash = hashBytes(svgBytes);
  if (svgHash !== revision.canonicalSvgHash || svgHash !== candidate.revisionHash) {
    throw new WorkflowCommandError(
      'export-svg-hash-mismatch',
      409,
      'The stored canonical SVG bytes no longer match the approved revision hash.',
    );
  }

  const packageId = input.packageId ?? `export-package:${randomUUID()}`;
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const cnipaLimitation =
    candidate.cnipaAssessment.label === 'CNIPA-XML-evidence-recorded'
      ? 'Matching external CNIPA XML evidence was recorded; it does not prove filing or office acceptance.'
      : candidate.cnipaAssessment.label === 'not-CNIPA-electronic-submission-ready'
        ? 'This SVG asset is not a CNIPA XML electronic filing package and does not prove filing.'
        : 'No CNIPA electronic-filing readiness claim is made for this SVG asset.';
  const limitations: ExportManifest['limitations'] = [
    'reviewed-drawing-asset',
    'not-an-office-filing-event',
    'no-office-acceptance-assertion',
  ];
  if (candidate.cnipaAssessment.label !== 'not-applicable') {
    limitations.push(candidate.cnipaAssessment.label);
  }
  const manifest: ExportManifest = {
    schemaVersion: 'patentdraw-export-manifest/1',
    packageId,
    candidateFingerprint: candidate.candidateFingerprint,
    projectId: input.context.projectId,
    figureId: input.figureId,
    revision: {
      id: revision.id,
      canonicalSvgHash: revision.canonicalSvgHash,
      ...(revision.parentRevisionId ? { parentRevisionId: revision.parentRevisionId } : {}),
      sourceLinks: revision.sourceLinks.map((item) => ({
        id: item.sourceAssetId,
        hash: item.contentHash,
      })),
    },
    sheet: {
      standard: revision.sheet.standard,
      widthMm: revision.sheet.widthMm,
      heightMm: revision.sheet.heightMm,
      viewBox: revision.sheet.viewBox,
    },
    textState: revision.textState,
    ruleRun: {
      id: ruleRun.id,
      profileId: ruleRun.profileId,
      profileVersion: ruleRun.profileVersion,
      profileHash: ruleRun.profileHash,
      warnings: ruleRun.findings
        .filter((finding) => finding.outcome === 'warning')
        .map((finding) => ({
          findingId: finding.id,
          ruleId: finding.ruleId,
          summary: finding.remediation.summary,
        })),
    },
    review: {
      technicalDecisionId: technicalDecision.id,
      attorneyDecisionId: attorneyDecision.id,
    },
    cnipa: {
      label: candidate.cnipaAssessment.label,
      ...(candidate.cnipaAssessment.evidenceId
        ? { evidenceId: candidate.cnipaAssessment.evidenceId }
        : {}),
      limitation: cnipaLimitation,
    },
    artifacts: [
      {
        path: 'figure.svg',
        mediaType: 'image/svg+xml',
        sha256: svgHash,
        byteLength: svgBytes.byteLength,
      },
    ],
    export: { actorId: input.context.actorId, occurredAt: createdAt },
    limitations,
  };
  const manifestBytes = encoder.encode(canonicalJson(manifest));
  const [storedSvg, storedManifest] = await Promise.all([
    input.storage.put(svgBytes),
    input.storage.put(manifestBytes),
  ]);
  const [verifiedSvg, verifiedManifest] = await Promise.all([
    input.storage.get(storedSvg.blobHash),
    input.storage.get(storedManifest.blobHash),
  ]);
  if (hashBytes(verifiedSvg) !== storedSvg.blobHash || storedSvg.blobHash !== svgHash) {
    throw new WorkflowCommandError(
      'export-svg-hash-mismatch',
      409,
      'Exported SVG verification failed.',
    );
  }
  if (hashBytes(verifiedManifest) !== storedManifest.blobHash) {
    throw new WorkflowCommandError(
      'export-manifest-hash-mismatch',
      409,
      'Export manifest verification failed.',
    );
  }

  const exportPackage: ExportPackage = {
    id: packageId,
    projectId: input.context.projectId,
    figureId: input.figureId,
    candidateId: candidate.id,
    candidateFingerprint: candidate.candidateFingerprint,
    revisionId: revision.id,
    ruleRunId: ruleRun.id,
    technicalDecisionId: technicalDecision.id,
    attorneyDecisionId: attorneyDecision.id,
    svgHash: storedSvg.blobHash as Sha256,
    manifestHash: storedManifest.blobHash as Sha256,
    cnipaLabel: candidate.cnipaAssessment.label,
    createdByActorId: input.context.actorId,
    createdAt,
  };
  await input.repository.saveExportPackage(exportPackage);
  const projection = await input.repository.compareAndSwapProjection({
    expectedVersion: input.expectedVersion,
    next: { ...withoutVersion(current), currentExportPackageId: exportPackage.id },
  });
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType: 'auditable-svg-export-created',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [exportPackage.id, candidate.id, technicalDecision.id, attorneyDecision.id],
    outcome: 'accepted',
    reasonCode: 'reviewed-drawing-asset-exported',
    reason: 'A hash-bound SVG and canonical manifest were exported without an office filing claim.',
    fingerprints: {
      candidate: candidate.candidateFingerprint,
      svg: exportPackage.svgHash,
      manifest: exportPackage.manifestHash,
    },
    occurredAt: createdAt,
  });
  return { package: exportPackage, manifest, projection };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashBytes(content: Uint8Array): Sha256 {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function assertAttorneyAgent(context: ProjectContext): void {
  if (context.activeRole !== 'attorney-agent' || !context.roles.includes('attorney-agent')) {
    throw new WorkflowCommandError(
      'attorney-agent-role-required',
      403,
      'An assigned active attorney-agent role is required.',
    );
  }
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
