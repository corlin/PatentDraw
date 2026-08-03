import { randomUUID } from 'node:crypto';

import type {
  CnipaEfilingEvidence,
  CreateCnipaEfilingEvidenceRequest,
  Sha256,
} from '@patentdraw/contracts';

import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import { WorkflowCommandError } from './problems.js';
import type { SvgWorkflowRepository } from './repository.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';

export interface CnipaEfilingAssessment {
  label: 'not-CNIPA-electronic-submission-ready' | 'CNIPA-XML-evidence-recorded';
  evidenceId?: string;
  limitation: string;
}

export async function recordCnipaEfilingEvidence(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  request: CreateCnipaEfilingEvidenceRequest;
  evidenceId?: string;
  now?: () => Date;
}): Promise<CnipaEfilingEvidence> {
  assertAttorneyAgent(input.context);
  if (input.request.previewProofreadAttestation.confirmed !== true) {
    throw new WorkflowCommandError(
      'cnipa-proofread-attestation-required',
      422,
      'The external CNIPA XML preview must be proofread and explicitly attested.',
    );
  }
  if (input.request.linkedRevisions.length === 0) {
    throw new WorkflowCommandError(
      'cnipa-linked-revision-required',
      422,
      'At least one exact canonical revision must be linked to the external evidence.',
    );
  }
  let firstFigureId: string | undefined;
  for (const linked of input.request.linkedRevisions) {
    const revision = await input.repository.getRevision(input.context.projectId, linked.revisionId);
    if (!revision || revision.canonicalSvgHash !== linked.canonicalSvgHash) {
      throw new WorkflowCommandError(
        'cnipa-evidence-revision-mismatch',
        422,
        'The external CNIPA evidence does not match the named canonical SVG revision.',
      );
    }
    firstFigureId ??= revision.figureId;
  }
  if (
    input.request.previewProofreadAttestation.actorId !== input.context.actorId ||
    input.request.reviewedByActorId !== input.context.actorId
  ) {
    throw new WorkflowCommandError(
      'cnipa-evidence-actor-mismatch',
      403,
      'The active attorney must be the named proofreader and evidence reviewer.',
    );
  }

  const recordedAt = (input.now ?? (() => new Date()))().toISOString();
  const evidence: CnipaEfilingEvidence = {
    id: input.evidenceId ?? `cnipa-evidence:${randomUUID()}`,
    projectId: input.context.projectId,
    applicationDate: input.request.applicationDate,
    declaredRoute: input.request.declaredRoute,
    policyEffectiveDate: input.request.policyEffectiveDate,
    linkedRevisions: input.request.linkedRevisions.map((item) => ({ ...item })),
    xmlPackageHash: input.request.xmlPackageHash,
    converter: { ...input.request.converter },
    dataStandardVersion: input.request.dataStandardVersion.trim(),
    previewProofreadAttestation: {
      confirmed: true,
      actorId: input.request.previewProofreadAttestation.actorId,
      confirmedAt: input.request.previewProofreadAttestation.confirmedAt,
    },
    reviewedByActorId: input.request.reviewedByActorId,
    reviewedAt: input.request.reviewedAt,
    recordedByActorId: input.context.actorId,
    recordedAt,
  };
  await input.repository.saveCnipaEvidence(evidence);
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: firstFigureId!,
    eventType: 'cnipa-external-evidence-recorded',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [evidence.id, ...evidence.linkedRevisions.map((item) => item.revisionId)],
    outcome: 'accepted',
    reasonCode: 'external-xml-evidence-recorded',
    reason:
      'External XML conversion and proofread evidence was recorded; this is not a filing event.',
    fingerprints: {
      xmlPackage: evidence.xmlPackageHash,
      ...Object.fromEntries(
        evidence.linkedRevisions.map((item, index) => [
          `revision${index + 1}`,
          item.canonicalSvgHash,
        ]),
      ),
    },
    occurredAt: recordedAt,
  });
  return evidence;
}

export async function assessCnipaEfilingEvidence(input: {
  repository: SvgWorkflowRepository;
  projectId: string;
  revisionId: string;
  revisionHash: Sha256;
  evidenceId?: string;
}): Promise<CnipaEfilingAssessment> {
  const noEvidence: CnipaEfilingAssessment = {
    label: 'not-CNIPA-electronic-submission-ready',
    limitation:
      'This SVG asset is not a CNIPA XML electronic filing package and does not prove filing.',
  };
  if (!input.evidenceId) return noEvidence;
  const evidence = await input.repository.getCnipaEvidence(input.projectId, input.evidenceId);
  const linked = evidence?.linkedRevisions.find((item) => item.revisionId === input.revisionId);
  if (!evidence || !linked || linked.canonicalSvgHash !== input.revisionHash) return noEvidence;
  return {
    label: 'CNIPA-XML-evidence-recorded',
    evidenceId: evidence.id,
    limitation:
      'Matching external CNIPA XML conversion evidence was recorded; it does not prove filing or office acceptance.',
  };
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
