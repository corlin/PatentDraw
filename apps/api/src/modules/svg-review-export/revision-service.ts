import { createHash, randomUUID } from 'node:crypto';

import type {
  CandidateSelectionRequest,
  CreateFigureRevisionRequest,
  FigureRevision,
  SvgSanitizationRun,
} from '@patentdraw/contracts';

import type { PrivateObjectStorage } from '../../infrastructure/object-storage.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import { WorkflowCommandError } from './problems.js';
import { CNIPA_2026_PROFILE } from './rule-profile-catalog.js';
import type { SvgWorkflowRepository, WorkflowProjectionRecord } from './repository.js';
import { sanitizeSvg } from './svg-sanitizer.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';

export type CreateFigureRevisionResult =
  | {
      status: 'accepted';
      sanitizationRun: SvgSanitizationRun;
      revision: FigureRevision;
    }
  | { status: 'rejected'; sanitizationRun: SvgSanitizationRun };

export async function createFigureRevision(input: {
  repository: SvgWorkflowRepository;
  storage: PrivateObjectStorage;
  context: ProjectContext;
  figureId: string;
  request: CreateFigureRevisionRequest;
  revisionId?: string;
  sanitizationRunId?: string;
  now?: () => Date;
}): Promise<CreateFigureRevisionResult> {
  assertDrafter(input.context);
  const now = (input.now ?? (() => new Date()))().toISOString();
  const rawBytes = new TextEncoder().encode(input.request.svgText);
  const rawObject = await input.storage.put(rawBytes);
  const sanitized = sanitizeSvg(input.request.svgText);
  if (
    sanitized.status === 'accepted' &&
    (sanitized.widthMm !== input.request.sheet.widthMm ||
      sanitized.heightMm !== input.request.sheet.heightMm)
  ) {
    sanitized.status = 'rejected';
    delete sanitized.canonicalSvg;
    delete sanitized.canonicalSvgHash;
    sanitized.issues.push({
      code: 'sheet-metadata-mismatch',
      outcome: 'rejected',
      explanation: 'Request sheet dimensions do not match the SVG millimetre dimensions.',
    });
  }

  const sanitizationRun: SvgSanitizationRun = {
    id: input.sanitizationRunId ?? `sanitize:${randomUUID()}`,
    projectId: input.context.projectId,
    figureId: input.figureId,
    inputBlobHash: asSha256(rawObject.blobHash),
    sanitizerName: 'patentdraw-secure-static-svg',
    sanitizerVersion: '1',
    status: sanitized.status,
    ...(sanitized.canonicalSvgHash ? { canonicalSvgHash: sanitized.canonicalSvgHash } : {}),
    issues: [...sanitized.issues],
    detected: structuredClone(sanitized.detected),
    actorId: input.context.actorId,
    occurredAt: now,
  };
  await input.repository.saveSanitizationRun(sanitizationRun);

  if (
    sanitized.status === 'rejected' ||
    !sanitized.canonicalSvg ||
    !sanitized.canonicalSvgHash ||
    !sanitized.viewBox
  ) {
    await recordWorkflowCommandOutcome(input.repository, {
      projectId: input.context.projectId,
      figureId: input.figureId,
      eventType: 'revision-import-rejected',
      actorId: input.context.actorId,
      activeRole: input.context.activeRole,
      targetIds: [sanitizationRun.id],
      outcome: 'denied',
      reasonCode: 'svg-sanitization-rejected',
      reason: 'The input did not pass secure-static SVG sanitization.',
      fingerprints: { input: sanitizationRun.inputBlobHash },
      occurredAt: now,
    });
    return { status: 'rejected', sanitizationRun };
  }

  if (input.request.parentRevisionId) {
    const parent = await input.repository.getRevision(
      input.context.projectId,
      input.request.parentRevisionId,
    );
    if (!parent || parent.figureId !== input.figureId) {
      throw new WorkflowCommandError(
        'invalid-parent-revision',
        409,
        'The parent revision is unavailable in this project and figure.',
      );
    }
  }

  const storedCanonical = await input.storage.put(new TextEncoder().encode(sanitized.canonicalSvg));
  if (storedCanonical.blobHash !== sanitized.canonicalSvgHash) {
    throw new WorkflowCommandError(
      'canonical-storage-hash-mismatch',
      409,
      'Canonical SVG storage returned an unexpected content hash.',
    );
  }

  const revisionId = input.revisionId ?? `revision:${randomUUID()}`;
  const revisionFingerprint = hash(
    JSON.stringify({
      canonicalSvgHash: sanitized.canonicalSvgHash,
      sheet: { ...input.request.sheet, viewBox: sanitized.viewBox },
      sourceLinks: input.request.sourceLinks,
      confirmedFigurePlanId: input.request.confirmedFigurePlanId,
      referenceRegistryVersionId: input.request.referenceRegistryVersionId,
      initialRuleProfile: CNIPA_2026_PROFILE.ref,
    }),
  );
  const revision: FigureRevision = {
    id: revisionId,
    projectId: input.context.projectId,
    figureId: input.figureId,
    ...(input.request.parentRevisionId ? { parentRevisionId: input.request.parentRevisionId } : {}),
    canonicalSvgHash: sanitized.canonicalSvgHash,
    revisionFingerprint,
    sanitizationRunId: sanitizationRun.id,
    origin: structuredClone(input.request.origin),
    sourceLinks: structuredClone(input.request.sourceLinks),
    confirmedFigurePlanId: input.request.confirmedFigurePlanId,
    referenceRegistryVersionId: input.request.referenceRegistryVersionId,
    initialRuleProfile: structuredClone(CNIPA_2026_PROFILE.ref),
    sheet: {
      ...input.request.sheet,
      viewBox: [...sanitized.viewBox],
    },
    textState: sanitized.textState,
    semanticGroups: extractSemanticGroups(sanitized.canonicalSvg),
    createdByActorId: input.context.actorId,
    createdAt: now,
  };
  await input.repository.saveRevision(revision);
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType: 'figure-revision-created',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [revision.id, sanitizationRun.id],
    outcome: 'accepted',
    reasonCode: 'canonical-svg-created',
    reason: 'A separate sanitized canonical SVG revision was created.',
    fingerprints: {
      input: sanitizationRun.inputBlobHash,
      canonicalSvg: revision.canonicalSvgHash,
      revision: revision.revisionFingerprint,
    },
    occurredAt: now,
  });
  return { status: 'accepted', sanitizationRun, revision };
}

export async function selectFigureRevision(input: {
  repository: SvgWorkflowRepository;
  context: ProjectContext;
  figureId: string;
  expectedVersion: number;
  revisionId: CandidateSelectionRequest['revisionId'];
  revisionFingerprint: CandidateSelectionRequest['revisionFingerprint'];
  expectedCurrentRevisionId: CandidateSelectionRequest['expectedCurrentRevisionId'];
}): Promise<WorkflowProjectionRecord> {
  assertDrafter(input.context);
  const revision = await input.repository.getRevision(input.context.projectId, input.revisionId);
  if (!revision || revision.figureId !== input.figureId) {
    throw new WorkflowCommandError('revision-not-found', 404, 'Revision not found in this figure.');
  }
  if (revision.revisionFingerprint !== input.revisionFingerprint) {
    throw new WorkflowCommandError(
      'revision-fingerprint-mismatch',
      409,
      'The selected revision fingerprint is stale.',
    );
  }
  const current = await input.repository.getProjection(input.context.projectId, input.figureId);
  if ((current.currentRevisionId ?? null) !== input.expectedCurrentRevisionId) {
    throw new WorkflowCommandError(
      'current-revision-mismatch',
      409,
      'The current revision changed; reload before selecting another revision.',
    );
  }
  const updated = await input.repository.compareAndSwapProjection({
    expectedVersion: input.expectedVersion,
    next: {
      projectId: input.context.projectId,
      figureId: input.figureId,
      currentRevisionId: revision.id,
    },
  });
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType: 'current-revision-selected',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [revision.id],
    outcome: 'accepted',
    reasonCode: 'revision-selected',
    reason: 'The canonical revision became the current rule-check candidate.',
    fingerprints: { revision: revision.revisionFingerprint },
  });
  return updated;
}

function assertDrafter(context: ProjectContext): void {
  if (context.activeRole !== 'drafter' && context.activeRole !== 'contributor') {
    throw new WorkflowCommandError(
      'drafter-role-required',
      403,
      'Creating or selecting a canonical revision requires an active drafter role.',
    );
  }
}

function extractSemanticGroups(canonicalSvg: string): string[] {
  const ids = [...canonicalSvg.matchAll(/<g\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]!);
  return ids.length > 0 ? ids : ['figure-content'];
}

function asSha256(value: string): `sha256:${string}` {
  if (!/^sha256:[a-f0-9]{64}$/.test(value))
    throw new Error('Object storage returned invalid hash.');
  return value as `sha256:${string}`;
}

function hash(value: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
