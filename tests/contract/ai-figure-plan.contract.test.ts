import {
  AiRunSchema,
  ConfirmFigurePlanRequestSchema,
  DraftRejectRequestSchema,
  DraftRetryRequestSchema,
  FigurePlanDispositionRequestSchema,
  FigurePlanRequestSchema,
  FigurePlanResultSchema,
} from '../../packages/contracts/src/index.js';
import {
  authorisedFigurePlanRequest,
  groundedFigurePlanResult,
} from '../../packages/fixtures/src/index.js';
import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

describe('FigurePlan contract', () => {
  it('accepts a canonical authorised request and a source-mapped proposal', () => {
    expect(Value.Check(FigurePlanRequestSchema, authorisedFigurePlanRequest)).toBe(true);
    expect(Value.Check(FigurePlanResultSchema, groundedFigurePlanResult)).toBe(true);
    expect(
      Value.Check(ConfirmFigurePlanRequestSchema, {
        proposalId: groundedFigurePlanResult.proposal.id,
      }),
    ).toBe(true);
  });

  it('requires an immutable request-input hash in every AI run record', () => {
    const runWithoutHash = {
      id: 'run-fixture-01',
      projectId: 'project-fixture-pump',
      actorId: 'drafter-fixture-01',
      provider: 'deterministic-test-double',
      model: 'fixture-model',
      modelVersion: 'v1',
      instructionVersion: 'fixture-instruction-v1',
      selectedSourceHashes: ['sha256:fixture-disclosure-01'],
      consentRecordId: 'consent-fixture-01',
      status: 'proposed',
      limitationState: 'source-mapped-proposal',
      createdAt: '2026-07-31T00:00:00.000Z',
    };

    expect(Value.Check(AiRunSchema, runWithoutHash)).toBe(false);
    expect(
      Value.Check(AiRunSchema, {
        ...runWithoutHash,
        requestInputHash: 'sha256:fixture-request-input',
        retentionExpiresAt: '2026-08-30T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('requires explicit disposition for every proposal item and bounded draft recovery commands', () => {
    expect(
      Value.Check(FigurePlanDispositionRequestSchema, {
        proposalId: groundedFigurePlanResult.proposal.id,
        items: groundedFigurePlanResult.proposal.sourceMappings.map((mapping, index) => ({
          proposalElementId: mapping.proposalElementId,
          disposition: index === 1 ? 'edited' : index === 2 ? 'rejected' : index === 3 ? 'open-question' : 'accepted',
          ...(index === 1 ? { editedValue: '叶轮组件（110）' } : {}),
          ...(index === 2 || index === 3 ? { reason: 'Fixture reviewer disposition.' } : {}),
        })),
      }),
    ).toBe(true);
    expect(Value.Check(DraftRejectRequestSchema, { reason: 'Not suitable as reference.' })).toBe(true);
    expect(Value.Check(DraftRetryRequestSchema, {})).toBe(false);
  });
});
