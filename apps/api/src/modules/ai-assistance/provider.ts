import type { FigurePlanRequest, FigurePlanResult } from '@patentdraw/contracts';

import { assertNoTrainingDataUse, type ProviderDataUsePolicy } from './provider-policy.js';

export interface FigurePlanProvider {
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
  readonly dataUsePolicy: ProviderDataUsePolicy;
  proposeFigurePlan(request: FigurePlanRequest): Promise<FigurePlanResult>;
}

export class DeterministicFigurePlanProvider implements FigurePlanProvider {
  readonly provider = 'deterministic-test-double';
  readonly model = 'fixture-model';
  readonly modelVersion = 'v1';
  readonly dataUsePolicy: ProviderDataUsePolicy = {
    provider: this.provider,
    policyVersion: 'fixture-policy-v1',
    trainingUse: 'prohibited',
    verifiedAt: '2026-07-31T00:00:00.000Z',
  };

  constructor(private readonly result: FigurePlanResult) {}

  async proposeFigurePlan(request: FigurePlanRequest): Promise<FigurePlanResult> {
    assertNoTrainingDataUse(this.dataUsePolicy, request.consent);
    return this.result;
  }
}
