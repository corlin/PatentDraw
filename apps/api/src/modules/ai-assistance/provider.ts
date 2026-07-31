import type {
  DraftAssetRequest,
  FigurePlanRequest,
  FigurePlanResult,
  GeneratedDraftAsset,
} from '@patentdraw/contracts';

import { assertNoTrainingDataUse, type ProviderDataUsePolicy } from './provider-policy.js';

export interface FigurePlanProvider {
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
  readonly dataUsePolicy: ProviderDataUsePolicy;
  proposeFigurePlan(request: FigurePlanRequest): Promise<FigurePlanResult>;
}

export interface DraftAssetProvider {
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
  readonly mode: 'deterministic-test-double' | 'external';
  readonly dataUsePolicy: ProviderDataUsePolicy;
  createDraftAsset(request: DraftAssetRequest): Promise<GeneratedDraftAsset>;
}

export class DeterministicDraftAssetProvider implements DraftAssetProvider {
  readonly provider = 'deterministic-test-double';
  readonly model = 'fixture-draft-model';
  readonly modelVersion = 'v1';
  readonly mode = 'deterministic-test-double' as const;
  readonly dataUsePolicy: ProviderDataUsePolicy = {
    provider: this.provider,
    policyVersion: 'fixture-policy-v1',
    trainingUse: 'prohibited',
    verifiedAt: '2026-07-31T00:00:00.000Z',
  };

  constructor(private readonly asset: GeneratedDraftAsset) {}

  async createDraftAsset(request: DraftAssetRequest): Promise<GeneratedDraftAsset> {
    assertNoTrainingDataUse(this.dataUsePolicy, request.consent);
    return this.asset;
  }
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
