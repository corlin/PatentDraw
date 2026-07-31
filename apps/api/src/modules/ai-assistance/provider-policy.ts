import type { ConsentRecord } from '@patentdraw/contracts';

export interface ProviderDataUsePolicy {
  provider: string;
  policyVersion: string;
  trainingUse: 'prohibited';
  verifiedAt: string;
}

export class ProviderPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderPolicyError';
  }
}

export function assertNoTrainingDataUse(
  policy: ProviderDataUsePolicy,
  consent: ConsentRecord,
): void {
  if (policy.trainingUse !== 'prohibited') {
    throw new ProviderPolicyError('The provider policy must prohibit training use.');
  }

  if (!consent.allowsProviderProcessing || consent.allowsTraining) {
    throw new ProviderPolicyError(
      'The consent record does not permit the required no-training use.',
    );
  }
}
