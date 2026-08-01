import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface PrivateObjectStorage {
  put(content: Uint8Array, retentionExpiresAt?: string): Promise<{ blobHash: string }>;
  get(blobHash: string): Promise<Uint8Array>;
  delete(blobHash: string): Promise<void>;
  purgeExpired(now: Date): Promise<number>;
}

export class InMemoryPrivateObjectStorage implements PrivateObjectStorage {
  private readonly objects = new Map<
    string,
    { content: Uint8Array; retentionExpiresAt?: string }
  >();

  async put(content: Uint8Array, retentionExpiresAt?: string): Promise<{ blobHash: string }> {
    const blobHash = hash(content);
    this.objects.set(blobHash, {
      content: content.slice(),
      ...(retentionExpiresAt ? { retentionExpiresAt } : {}),
    });
    return { blobHash };
  }

  async get(blobHash: string): Promise<Uint8Array> {
    const value = this.objects.get(blobHash);
    if (!value) throw new Error(`Object ${blobHash} was not found.`);
    return value.content.slice();
  }

  async delete(blobHash: string): Promise<void> {
    this.objects.delete(blobHash);
  }

  async purgeExpired(now: Date): Promise<number> {
    let count = 0;
    for (const [blobHash, object] of this.objects) {
      if (object.retentionExpiresAt && Date.parse(object.retentionExpiresAt) <= now.getTime()) {
        this.objects.delete(blobHash);
        count += 1;
      }
    }
    return count;
  }
}

export class LocalPrivateObjectStorage implements PrivateObjectStorage {
  constructor(
    private readonly rootDirectory: string,
    private readonly encryptionKey: Uint8Array,
  ) {
    if (!path.isAbsolute(rootDirectory)) {
      throw new Error('Private object-storage root must be an absolute path.');
    }
    if (encryptionKey.byteLength !== 32) {
      throw new Error('Private object storage requires a 32-byte AES-256 key.');
    }
  }

  async put(content: Uint8Array): Promise<{ blobHash: string }> {
    const blobHash = hash(content);
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(content), cipher.final()]);
    const encrypted = Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
    await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 });
    await writeFile(this.objectPath(blobHash), encrypted, { mode: 0o600, flag: 'wx' }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
      },
    );
    return { blobHash };
  }

  async get(blobHash: string): Promise<Uint8Array> {
    const encrypted = await readFile(this.objectPath(blobHash));
    if (encrypted.byteLength < 28) throw new Error('Encrypted object is truncated.');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, encrypted.subarray(0, 12));
    decipher.setAuthTag(encrypted.subarray(12, 28));
    return new Uint8Array(
      Buffer.concat([decipher.update(encrypted.subarray(28)), decipher.final()]),
    );
  }

  async delete(blobHash: string): Promise<void> {
    await rm(this.objectPath(blobHash), { force: true });
  }

  async purgeExpired(): Promise<number> {
    throw new Error(
      'Local object storage requires an external retention index; use PostgreSQL-backed retention in production.',
    );
  }

  private objectPath(blobHash: string): string {
    if (!/^sha256:[a-f0-9]{64}$/.test(blobHash)) throw new Error('Invalid content-addressed hash.');
    return path.join(this.rootDirectory, blobHash.slice('sha256:'.length));
  }
}

function hash(content: Uint8Array): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}
