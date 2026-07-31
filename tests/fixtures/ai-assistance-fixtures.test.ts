import {
  authorisedFigurePlanRequest,
  fixtureDraftAsset,
  groundedFigurePlanResult,
  hallucinatedFigurePlanResult,
  refusalFigurePlanResult,
} from '../../packages/fixtures/src/index.js';
import { describe, expect, it } from 'vitest';

describe('six AI assistance fixtures', () => {
  const fixtures = [
    ['grounded-proposal', groundedFigurePlanResult.status, 'proposed'],
    ['provider-refusal', refusalFigurePlanResult.status, 'refused'],
    ['unmapped-hallucination', hallucinatedFigurePlanResult.status, 'manual-review-required'],
    ['authorised-request', authorisedFigurePlanRequest.consent.allowsTraining, false],
    ['draft-non-authoritative', fixtureDraftAsset.exportEligible, false],
    ['draft-unselected', fixtureDraftAsset.selectionState, 'unselected'],
  ] as const;

  it.each(fixtures)('%s has the expected bounded state', (_name, actual, expected) => {
    expect(actual).toBe(expected);
  });
});
