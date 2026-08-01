import { authorisedProjectContext, fixtureFigureId } from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { InMemoryPrivateObjectStorage } from '../../apps/api/src/infrastructure/object-storage.js';
import { CNIPA_2026_PROFILE } from '../../apps/api/src/modules/svg-review-export/rule-profile-catalog.js';
import { InMemorySvgWorkflowRepository } from '../../apps/api/src/modules/svg-review-export/repository.js';
import { createFigureRevision, selectFigureRevision } from '../../apps/api/src/modules/svg-review-export/revision-service.js';
import { runRevisionRules } from '../../apps/api/src/modules/svg-review-export/rule-service.js';

const hash = `sha256:${'1'.repeat(64)}` as const;

describe('repeatable SVG rule runs', () => {
  it('emits all four outcomes with evidence and preserves rerun history', async () => {
    const repository = new InMemorySvgWorkflowRepository();
    const storage = new InMemoryPrivateObjectStorage();
    const created = await createFigureRevision({
      repository,
      storage,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      request: {
        svgText: '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect x="5" y="20" width="20" height="20" fill="#e8a33a" stroke="#000"/><text x="30" y="60">100</text></svg>',
        origin: { kind: 'import' },
        confirmedFigurePlanId: 'proposal-fixture-grounded-01',
        sourceLinks: [{ sourceAssetId: 'source-01', contentHash: hash }],
        referenceRegistryVersionId: 'registry-01',
        sheet: { standard: 'A4', widthMm: 210, heightMm: 297, orientation: 'portrait' },
      },
      revisionId: 'revision-rules-01',
      sanitizationRunId: 'sanitize-rules-01',
    });
    if (created.status !== 'accepted') throw new Error('Expected accepted revision.');
    await selectFigureRevision({
      repository,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      expectedVersion: 0,
      expectedCurrentRevisionId: null,
      revisionId: created.revision.id,
      revisionFingerprint: created.revision.revisionFingerprint,
    });

    const first = await runRevisionRules({
      repository,
      storage,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      revisionId: created.revision.id,
      expectedVersion: 1,
      request: { revisionHash: created.revision.canonicalSvgHash, profile: CNIPA_2026_PROFILE.ref },
      ruleRunId: 'run-rules-01',
    });
    expect(new Set(first.run.findings.map((finding) => finding.outcome))).toEqual(
      new Set(['pass', 'warning', 'manual-review-required', 'fail']),
    );
    expect(first.run.findings.every((finding) => finding.officialSource.url && finding.remediation.summary)).toBe(true);
    expect(first.run.findings.every((finding) => finding.evidence.length > 0)).toBe(true);

    const second = await runRevisionRules({
      repository,
      storage,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      revisionId: created.revision.id,
      expectedVersion: 2,
      request: { revisionHash: created.revision.canonicalSvgHash, profile: CNIPA_2026_PROFILE.ref },
      ruleRunId: 'run-rules-02',
    });
    expect(second.run.id).not.toBe(first.run.id);
    expect(await repository.getRuleRun(authorisedProjectContext.projectId, first.run.id)).not.toBeNull();
  });
});
