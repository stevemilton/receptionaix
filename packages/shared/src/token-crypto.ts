/**
 * Symmetric encryption for OAuth tokens stored in the database.
 *
 * Uses AES-256-GCM with a random IV per encryption.
 * Requires TOKEN_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * Stored format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(): Buffer | null {
  const hex = process.env['TOKEN_ENCRYPTION_KEY'];
  if (!hex || hex.length !== 64) {
    return null;
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a JSON-serializable value.
 * Returns the encrypted string, or null if encryption is not configured.
 */
export function encryptToken(data: unknown): string | null {
  const key = getKey();
  if (!key) {
    console.warn('[TokenCrypto] TOKEN_ENCRYPTION_KEY not set — storing token unencrypted');
    return null;
  }

  const plaintext = JSON.stringify(data);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted token string.
 * Returns the parsed JSON object, or null on failure.
 */
export function decryptToken<T = unknown>(encrypted: string): T | null {
  const key = getKey();
  if (!key) {
    console.warn('[TokenCrypto] TOKEN_ENCRYPTION_KEY not set — cannot decrypt');
    return null;
  }

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      return null;
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('[TokenCrypto] Decryption failed:', error);
    return null;
  }
}

/**
 * Check whether a value looks like an encrypted token (hex:hex:hex format)
 * vs. a plain JSON object.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value);
}
