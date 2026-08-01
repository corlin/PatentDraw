import { WorkflowCommandError } from './problems.js';

export interface IdempotentResult<T> {
  value: T;
  replayed: boolean;
}

interface StoredIdempotentResult<T> {
  requestHash: string;
  value: T;
}

export class InMemoryIdempotencyRegistry {
  private readonly records = new Map<string, StoredIdempotentResult<unknown>>();

  async execute<T>(input: {
    projectId: string;
    key: string;
    requestHash: string;
    operation: () => Promise<T>;
  }): Promise<IdempotentResult<T>> {
    const storageKey = `${input.projectId}:${input.key}`;
    const existing = this.records.get(storageKey);
    if (existing) {
      if (existing.requestHash !== input.requestHash) {
        throw new WorkflowCommandError(
          'idempotency-key-reused',
          409,
          'The idempotency key was already used with a different request.',
        );
      }
      return { value: structuredClone(existing.value) as T, replayed: true };
    }

    const value = await input.operation();
    this.records.set(storageKey, {
      requestHash: input.requestHash,
      value: structuredClone(value),
    });
    return { value: structuredClone(value), replayed: false };
  }
}
