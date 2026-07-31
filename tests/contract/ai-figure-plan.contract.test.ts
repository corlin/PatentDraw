import {
  AiRunSchema,
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
      }),
    ).toBe(true);
  });
});
