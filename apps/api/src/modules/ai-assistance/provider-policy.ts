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

export class ProviderOperationalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderOperationalError';
  }
}

export interface ProviderOperationalControls {
  maxRetries: number;
  retentionDays: number;
}

export const DEFAULT_PROVIDER_OPERATIONAL_CONTROLS: ProviderOperationalControls = {
  maxRetries: 2,
  retentionDays: 30,
};

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

export function assertDraftProviderGate(input: {
  mode: 'deterministic-test-double' | 'external';
  policy: ProviderDataUsePolicy;
  consent: ConsentRecord;
  externalProviderEnabled?: boolean | undefined;
}): void {
  assertNoTrainingDataUse(input.policy, input.consent);
  if (input.mode === 'external' && !input.externalProviderEnabled) {
    throw new ProviderPolicyError(
      'External image providers are disabled until an explicit pilot gate.',
    );
  }
}

export async function executeWithProviderControls<T>(
  operation: () => Promise<T>,
  controls: ProviderOperationalControls = DEFAULT_PROVIDER_OPERATIONAL_CONTROLS,
): Promise<T> {
  if (
    !Number.isInteger(controls.maxRetries) ||
    controls.maxRetries < 0 ||
    controls.maxRetries > 3
  ) {
    throw new ProviderPolicyError('Provider retry count must be an integer from 0 through 3.');
  }
  if (
    !Number.isInteger(controls.retentionDays) ||
    controls.retentionDays < 1 ||
    controls.retentionDays > 90
  ) {
    throw new ProviderPolicyError('Provider retention must be an integer from 1 through 90 days.');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= controls.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!(error instanceof ProviderOperationalError) || attempt === controls.maxRetries) break;
    }
  }
  throw lastError;
}
