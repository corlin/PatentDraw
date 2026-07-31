import { DraftJobSchema, GeneratedDraftAssetSchema } from '../../packages/contracts/src/index.js';
import { fixtureDraftAsset } from '../../packages/fixtures/src/index.js';
import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

describe('generated draft asset contract', () => {
  it('accepts only a permanently non-exportable draft asset', () => {
    expect(Value.Check(GeneratedDraftAssetSchema, fixtureDraftAsset)).toBe(true);
    expect(
      Value.Check(GeneratedDraftAssetSchema, { ...fixtureDraftAsset, exportEligible: true }),
    ).toBe(false);
  });

  it('exposes cancellable job progress without treating a draft as a canonical revision', () => {
    expect(
      Value.Check(DraftJobSchema, { id: 'job-fixture-01', status: 'queued', progressPercent: 0 }),
    ).toBe(true);
  });
});
