import {
  authorisedFigurePlanRequest,
  authorisedProjectContext,
  groundedFigurePlanResult,
  workflowActorIds,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  InMemoryPrivateObjectStorage,
  LocalPrivateObjectStorage,
} from '../../apps/api/src/infrastructure/object-storage.js';
import { requestFigurePlan } from '../../apps/api/src/modules/ai-assistance/figure-plan-service.js';
import { DeterministicFigurePlanProvider } from '../../apps/api/src/modules/ai-assistance/provider.js';
import { InMemoryAiAssistanceRepository } from '../../apps/api/src/modules/ai-assistance/repository.js';
import { createApp } from '../../apps/api/src/app.js';
import { createDeterministicDemoOptions } from '../../apps/api/src/runtime-composition.js';

describe('AI runtime composition and persistence', () => {
  it('registers all business route families in the deterministic development runtime', async () => {
    const app = await createApp(await createDeterministicDemoOptions());
    const headers = {
      'x-patentdraw-project-id': authorisedProjectContext.projectId,
      'x-patentdraw-actor-id': authorisedProjectContext.actorId,
    };
    try {
      const figurePlan = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/ai-figure-plans`,
        headers,
        payload: authorisedFigurePlanRequest,
      });
      const audit = await app.inject({
        method: 'GET',
        url: `/projects/${authorisedProjectContext.projectId}/ai-audit`,
        headers: {
          ...headers,
          'x-patentdraw-actor-id': workflowActorIds.technicalReviewer,
        },
      });
      expect(figurePlan.statusCode).toBe(201);
      expect(audit.statusCode).toBe(200);
      expect(audit.json().events[0].provenance.modelVersion).toBe('v1');
      const proposalId = figurePlan.json().result.proposal.id as string;
      const dispositions = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/ai-figure-plans/${proposalId}/dispositions`,
        headers,
        payload: {
          proposalId,
          items: figurePlan.json().result.proposal.sourceMappings.map(
            (mapping: { proposalElementId: string }) => ({
              proposalElementId: mapping.proposalElementId,
              disposition: 'accepted',
            }),
          ),
        },
      });
      expect(dispositions.statusCode).toBe(201);
      const confirmed = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/ai-figure-plans/${proposalId}/confirm`,
        headers,
        payload: { proposalId },
      });
      expect(confirmed.statusCode).toBe(201);
      const draft = await app.inject({
        method: 'POST',
        url: `/projects/${authorisedProjectContext.projectId}/generated-draft-assets`,
        headers,
        payload: {
          projectId: authorisedProjectContext.projectId,
          confirmedPlanId: proposalId,
          allowedScope: ['housing', 'impeller'],
          instructionVersion: 'fixture-draft-instruction-v1',
          consent: authorisedFigurePlanRequest.consent,
        },
      });
      expect(draft.statusCode).toBe(202);
    } finally {
      await app.close();
    }
  });

  it('keeps immutable run evidence and records retention expiry once', async () => {
    const repository = new InMemoryAiAssistanceRepository();
    const input = {
      context: authorisedProjectContext,
      request: authorisedFigurePlanRequest,
      provider: new DeterministicFigurePlanProvider(groundedFigurePlanResult),
      repository,
      runId: 'run-retention-fixture-01',
      now: () => new Date('2026-07-31T00:00:00.000Z'),
    };
    await requestFigurePlan(input);
    await expect(requestFigurePlan(input)).rejects.toThrow('immutable');
    await expect(repository.purgeExpired(new Date('2026-08-30T00:00:00.000Z'))).resolves.toBe(1);
    await expect(repository.purgeExpired(new Date('2026-08-31T00:00:00.000Z'))).resolves.toBe(0);
  });

  it('stores private blobs by hash and removes them at retention expiry', async () => {
    const storage = new InMemoryPrivateObjectStorage();
    const content = new TextEncoder().encode('<svg/>');
    const { blobHash } = await storage.put(content, '2026-08-01T00:00:00.000Z');
    await expect(storage.get(blobHash)).resolves.toEqual(content);
    await expect(storage.purgeExpired(new Date('2026-08-01T00:00:00.000Z'))).resolves.toBe(1);
    await expect(storage.get(blobHash)).rejects.toThrow('not found');
  });

  it('encrypts local private objects at rest and decrypts only through the adapter', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'patentdraw-private-store-'));
    const storage = new LocalPrivateObjectStorage(directory, new Uint8Array(32).fill(7));
    const content = new TextEncoder().encode('<svg>confidential fixture</svg>');
    try {
      const { blobHash } = await storage.put(content);
      const raw = await readFile(path.join(directory, blobHash.slice('sha256:'.length)));
      expect(raw.includes(content)).toBe(false);
      await expect(storage.get(blobHash)).resolves.toEqual(content);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
