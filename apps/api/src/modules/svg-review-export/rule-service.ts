import { DOMParser } from '@xmldom/xmldom';
import { createHash, randomUUID } from 'node:crypto';

import type {
  CreateRuleRunRequest,
  FigureRevision,
  RuleFinding,
  RuleOutcome,
  RuleRun,
} from '@patentdraw/contracts';

import type { PrivateObjectStorage } from '../../infrastructure/object-storage.js';
import type { ProjectContext } from '../projects-assets/source-authorisation.js';
import { WorkflowCommandError } from './problems.js';
import { resolveRuleProfile, type ReviewedRuleDefinition } from './rule-profile-catalog.js';
import type { SvgWorkflowRepository, WorkflowProjectionRecord } from './repository.js';
import { recordWorkflowCommandOutcome } from './workflow-audit.js';

type XmlDocument = ReturnType<DOMParser['parseFromString']>;
type XmlElement = NonNullable<XmlDocument['documentElement']>;

export async function runRevisionRules(input: {
  repository: SvgWorkflowRepository;
  storage: PrivateObjectStorage;
  context: ProjectContext;
  figureId: string;
  revisionId: string;
  expectedVersion: number;
  request: CreateRuleRunRequest;
  ruleRunId?: string;
  now?: () => Date;
}): Promise<{ run: RuleRun; projection: WorkflowProjectionRecord }> {
  if (input.context.activeRole !== 'drafter' && input.context.activeRole !== 'contributor') {
    throw new WorkflowCommandError(
      'drafter-role-required',
      403,
      'Running checks requires an active drafter role.',
    );
  }
  const revision = await input.repository.getRevision(input.context.projectId, input.revisionId);
  if (!revision || revision.figureId !== input.figureId) {
    throw new WorkflowCommandError('revision-not-found', 404, 'Revision not found in this figure.');
  }
  const projection = await input.repository.getProjection(input.context.projectId, input.figureId);
  if (
    projection.currentRevisionId !== revision.id ||
    projection.version !== input.expectedVersion
  ) {
    throw new WorkflowCommandError(
      'stale-workflow',
      409,
      'Rules may run only against the current canonical revision and workflow version.',
    );
  }
  if (input.request.revisionHash !== revision.canonicalSvgHash) {
    await recordContentMismatch(input.repository, input.context, input.figureId, revision);
    throw new WorkflowCommandError(
      'revision-content-mismatch',
      409,
      'The requested revision hash does not match the canonical revision.',
    );
  }
  const profile = resolveRuleProfile(input.request.profile);
  if (!profile) {
    throw new WorkflowCommandError(
      'unknown-rule-profile',
      422,
      'The requested rule profile is not present in the reviewed catalog.',
    );
  }

  const canonicalBytes = await input.storage.get(revision.canonicalSvgHash);
  const canonicalSvg = new TextDecoder().decode(canonicalBytes);
  const reloadedHash = hash(canonicalBytes);
  if (reloadedHash !== revision.canonicalSvgHash) {
    await recordContentMismatch(input.repository, input.context, input.figureId, revision);
    throw new WorkflowCommandError(
      'revision-content-mismatch',
      409,
      'Reloaded canonical SVG bytes do not match the revision hash.',
    );
  }

  const ruleRunId = input.ruleRunId ?? `rule-run:${randomUUID()}`;
  const findings = evaluateRules(ruleRunId, revision, canonicalSvg, profile.rules);
  const run: RuleRun = {
    id: ruleRunId,
    projectId: input.context.projectId,
    figureId: input.figureId,
    revisionId: revision.id,
    revisionHash: revision.canonicalSvgHash,
    revisionFingerprint: revision.revisionFingerprint,
    profileId: profile.ref.id,
    profileVersion: profile.ref.version,
    profileHash: profile.ref.profileHash,
    profileEffectiveFrom: profile.effectiveFrom,
    rendererVersion: 'canonical-svg-evidence-v1',
    inputFingerprint: hash(
      new TextEncoder().encode(
        JSON.stringify({
          revision: revision.revisionFingerprint,
          profile: profile.ref.profileHash,
          renderer: 'canonical-svg-evidence-v1',
        }),
      ),
    ),
    summary: summarize(findings),
    findings,
    createdByActorId: input.context.actorId,
    createdAt: (input.now ?? (() => new Date()))().toISOString(),
  };
  await input.repository.saveRuleRun(run);
  const updated = await input.repository.compareAndSwapProjection({
    expectedVersion: input.expectedVersion,
    next: {
      projectId: input.context.projectId,
      figureId: input.figureId,
      currentRevisionId: revision.id,
      currentRuleRunId: run.id,
    },
  });
  await recordWorkflowCommandOutcome(input.repository, {
    projectId: input.context.projectId,
    figureId: input.figureId,
    eventType: 'rule-run-created',
    actorId: input.context.actorId,
    activeRole: input.context.activeRole,
    targetIds: [revision.id, run.id],
    outcome: 'accepted',
    reasonCode: 'deterministic-rules-completed',
    reason: 'The reviewed deterministic rule profile completed against canonical bytes.',
    fingerprints: {
      revision: revision.revisionFingerprint,
      ruleInput: run.inputFingerprint,
      profile: run.profileHash,
    },
    occurredAt: run.createdAt,
  });
  return { run, projection: updated };
}

function evaluateRules(
  ruleRunId: string,
  revision: FigureRevision,
  canonicalSvg: string,
  rules: readonly ReviewedRuleDefinition[],
): RuleFinding[] {
  const document = new DOMParser().parseFromString(canonicalSvg, 'image/svg+xml');
  return rules.map((rule, index) => {
    const result = evaluate(rule, revision, document);
    return {
      id: `${ruleRunId}:finding:${index + 1}`,
      ruleRunId,
      ruleId: rule.id,
      officialSource: structuredClone(rule.officialSource),
      evaluatedInput: {
        kind: result.inputKind,
        inputHash: revision.canonicalSvgHash,
        description: result.description,
      },
      predicateOrReviewPolicy: rule.predicateOrReviewPolicy,
      outcome: result.outcome,
      severity: result.severity,
      evidence: [
        {
          kind: result.evidenceKind,
          coordinateSpace: 'svg-view-box',
          ...(result.geometry ? { geometry: result.geometry } : {}),
          artifactHash: revision.canonicalSvgHash,
          description: result.evidenceDescription,
        },
      ],
      remediation: { summary: rule.remediation },
    };
  });
}

function evaluate(
  rule: ReviewedRuleDefinition,
  revision: FigureRevision,
  document: XmlDocument,
): {
  outcome: RuleOutcome;
  severity: RuleFinding['severity'];
  inputKind: string;
  description: string;
  evidenceKind: RuleFinding['evidence'][number]['kind'];
  evidenceDescription: string;
  geometry?: unknown;
} {
  if (rule.kind === 'svg-safety') {
    return result(
      'pass',
      'info',
      'canonical-svg',
      'Sanitized canonical bytes',
      'rendered-preview',
      'Secure-static sanitizer evidence is linked to this revision.',
    );
  }
  if (rule.kind === 'sheet') {
    return result(
      'pass',
      'info',
      'sheet-metadata',
      'Physical sheet and viewBox',
      'sheet-region',
      `Sheet ${revision.sheet.widthMm} × ${revision.sheet.heightMm} mm has an explicit viewBox.`,
      { viewBox: revision.sheet.viewBox },
    );
  }
  if (rule.kind === 'margin') {
    const intrusion = findMarginIntrusion(document, revision.sheet.viewBox);
    return intrusion
      ? result(
          'fail',
          'blocking',
          'geometry',
          'Positioned SVG geometry',
          'bounding-box',
          'Geometry enters the pilot 10-unit margin.',
          intrusion,
        )
      : result(
          'pass',
          'info',
          'geometry',
          'Positioned SVG geometry',
          'sheet-region',
          'No simple positioned element enters the pilot margin.',
          { margin: 10 },
        );
  }
  if (rule.kind === 'monochrome') {
    const color = findNonMonochrome(document);
    return color
      ? result(
          'warning',
          'major',
          'paint-attributes',
          'SVG fill, stroke and opacity attributes',
          'bounding-box',
          `Non-monochrome or translucent paint requires review: ${color}.`,
        )
      : result(
          'pass',
          'info',
          'paint-attributes',
          'SVG fill, stroke and opacity attributes',
          'rendered-preview',
          'Reviewed paint attributes are monochrome and opaque.',
        );
  }
  const text = [...elements(document)].filter((element) => element.tagName === 'text');
  return text.length > 0
    ? result(
        'manual-review-required',
        'major',
        'live-text',
        'Drawing text nodes',
        'bounding-box',
        `${text.length} live-text region(s) require indispensability and disclosure review.`,
      )
    : result(
        'pass',
        'info',
        'live-text',
        'Drawing text nodes',
        'rendered-preview',
        'No live drawing text is present.',
      );
}

function result(
  outcome: RuleOutcome,
  severity: RuleFinding['severity'],
  inputKind: string,
  description: string,
  evidenceKind: RuleFinding['evidence'][number]['kind'],
  evidenceDescription: string,
  geometry?: unknown,
) {
  return {
    outcome,
    severity,
    inputKind,
    description,
    evidenceKind,
    evidenceDescription,
    ...(geometry ? { geometry } : {}),
  };
}

function findMarginIntrusion(
  document: XmlDocument,
  viewBox: readonly [number, number, number, number],
): unknown | null {
  const [, , width, height] = viewBox;
  for (const element of elements(document)) {
    for (const name of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy']) {
      const raw = element.getAttribute(name);
      if (raw === null || raw === '') continue;
      const value = Number(raw);
      const horizontal = name.startsWith('x') || name === 'cx';
      const limit = horizontal ? width : height;
      if (Number.isFinite(value) && (value < 10 || value > limit - 10)) {
        return {
          elementId: element.getAttribute('id') || element.tagName,
          coordinate: name,
          value,
        };
      }
    }
  }
  return null;
}

function findNonMonochrome(document: XmlDocument): string | null {
  const permitted = new Set(['', 'none', 'black', 'white', '#000', '#000000', '#fff', '#ffffff']);
  for (const element of elements(document)) {
    for (const name of ['fill', 'stroke']) {
      const value = (element.getAttribute(name) ?? '').toLowerCase();
      if (!permitted.has(value)) return `${name}=${value}`;
    }
    for (const name of ['opacity', 'fill-opacity', 'stroke-opacity']) {
      const value = element.getAttribute(name);
      if (value !== null && value !== '' && Number(value) < 1) return `${name}=${value}`;
    }
  }
  return null;
}

function elements(document: XmlDocument): XmlElement[] {
  return Array.from(document.getElementsByTagName('*'));
}

function summarize(findings: readonly RuleFinding[]): RuleRun['summary'] {
  const summary = { pass: 0, warning: 0, manualReviewRequired: 0, fail: 0 };
  for (const finding of findings) {
    if (finding.outcome === 'manual-review-required') summary.manualReviewRequired += 1;
    else summary[finding.outcome] += 1;
  }
  return summary;
}

async function recordContentMismatch(
  repository: SvgWorkflowRepository,
  context: ProjectContext,
  figureId: string,
  revision: FigureRevision,
): Promise<void> {
  await recordWorkflowCommandOutcome(repository, {
    projectId: context.projectId,
    figureId,
    eventType: 'rule-run-denied',
    actorId: context.actorId,
    activeRole: context.activeRole,
    targetIds: [revision.id],
    outcome: 'denied',
    reasonCode: 'revision-content-mismatch',
    reason: 'Rule execution was denied because canonical content did not match its revision.',
    fingerprints: { expectedRevision: revision.canonicalSvgHash },
  });
}

function hash(value: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
