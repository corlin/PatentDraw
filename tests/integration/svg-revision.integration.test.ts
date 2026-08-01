import { authorisedProjectContext, fixtureFigureId } from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

import { InMemoryPrivateObjectStorage } from '../../apps/api/src/infrastructure/object-storage.js';
import { InMemorySvgWorkflowRepository } from '../../apps/api/src/modules/svg-review-export/repository.js';
import {
  createFigureRevision,
  selectFigureRevision,
} from '../../apps/api/src/modules/svg-review-export/revision-service.js';

const sourceHash = `sha256:${'1'.repeat(64)}` as const;
const cleanSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect x="5" y="20" width="40" height="30" fill="none" stroke="#000"/><text x="20" y="70">100</text></svg>';

describe('canonical SVG revision lifecycle', () => {
  it('retains raw input, creates immutable parented revisions and selects with CAS', async () => {
    const repository = new InMemorySvgWorkflowRepository();
    const storage = new InMemoryPrivateObjectStorage();
    const first = await createFigureRevision({
      repository,
      storage,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      request: revisionRequest(cleanSvg),
      revisionId: 'revision-pump-v1',
      sanitizationRunId: 'sanitize-pump-v1',
      now: () => new Date('2026-08-01T00:00:00.000Z'),
    });
    expect(first.status).toBe('accepted');
    if (first.status !== 'accepted') throw new Error('Expected accepted fixture.');
    expect(await storage.get(first.sanitizationRun.inputBlobHash)).toBeInstanceOf(Uint8Array);
    expect(await storage.get(first.revision.canonicalSvgHash)).toBeInstanceOf(Uint8Array);

    const selected = await selectFigureRevision({
      repository,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      expectedVersion: 0,
      revisionId: first.revision.id,
      revisionFingerprint: first.revision.revisionFingerprint,
      expectedCurrentRevisionId: null,
    });
    expect(selected.currentRevisionId).toBe(first.revision.id);

    const second = await createFigureRevision({
      repository,
      storage,
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      request: revisionRequest(cleanSvg.replace('x="5"', 'x="15"'), first.revision.id),
      revisionId: 'revision-pump-v2',
      sanitizationRunId: 'sanitize-pump-v2',
      now: () => new Date('2026-08-01T00:01:00.000Z'),
    });
    expect(second.status).toBe('accepted');
    if (second.status !== 'accepted') throw new Error('Expected accepted child fixture.');
    expect(second.revision.parentRevisionId).toBe(first.revision.id);
    expect(await repository.getRevision(authorisedProjectContext.projectId, first.revision.id)).not.toBeNull();
    await expect(
      selectFigureRevision({
        repository,
        context: authorisedProjectContext,
        figureId: fixtureFigureId,
        expectedVersion: 0,
        revisionId: second.revision.id,
        revisionFingerprint: second.revision.revisionFingerprint,
        expectedCurrentRevisionId: first.revision.id,
      }),
    ).rejects.toThrow('version');
  });

  it('records rejection without creating a revision', async () => {
    const repository = new InMemorySvgWorkflowRepository();
    const result = await createFigureRevision({
      repository,
      storage: new InMemoryPrivateObjectStorage(),
      context: authorisedProjectContext,
      figureId: fixtureFigureId,
      request: revisionRequest('<!DOCTYPE svg><svg/>'),
      revisionId: 'must-not-exist',
      sanitizationRunId: 'sanitize-rejected',
    });
    expect(result.status).toBe('rejected');
    expect(await repository.getRevision(authorisedProjectContext.projectId, 'must-not-exist')).toBeNull();
  });
});

function revisionRequest(svgText: string, parentRevisionId?: string) {
  return {
    svgText,
    ...(parentRevisionId ? { parentRevisionId } : {}),
    origin: { kind: 'import' as const },
    confirmedFigurePlanId: 'proposal-fixture-grounded-01',
    sourceLinks: [{ sourceAssetId: 'source-fixture-disclosure-01', contentHash: sourceHash }],
    referenceRegistryVersionId: 'registry-fixture-01',
    sheet: { standard: 'A4' as const, widthMm: 210, heightMm: 297, orientation: 'portrait' as const },
  };
}
