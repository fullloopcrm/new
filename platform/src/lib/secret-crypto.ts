/**
 * Symmetric encryption for long-lived secrets stored in Postgres (refresh
 * tokens, API keys). AES-256-GCM. Envelope format:
 *
 *   v1:<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>
 *
 * Key: hex-encoded 32-byte (256-bit) key in SECRET_ENCRYPTION_KEY env var.
 * Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 *
 * Backwards compatible: decryptSecret() returns the input unchanged if it
 * doesn't start with our `v1:` prefix, so unmigrated plaintext secrets still
 * work. Re-saving them via encryptSecret() upgrades them in place.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENVELOPE_PREFIX = 'v1:'
const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 12 // GCM standard

function getKey(): Buffer {
  const hex = process.env.SECRET_ENCRYPTION_KEY
  if (!hex) {
    throw new Error('SECRET_ENCRYPTION_KEY not set — cannot encrypt/decrypt secrets')
  }
  if (hex.length !== 64) {
    throw new Error('SECRET_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${ENVELOPE_PREFIX}${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`
}

export function decryptSecret(envelope: string): string {
  if (!envelope) return envelope
  if (!envelope.startsWith(ENVELOPE_PREFIX)) {
    // Legacy plaintext — return as-is. Caller should re-save to migrate.
    return envelope
  }
  const key = getKey()
  const [, ivB64, ctB64, tagB64] = envelope.split(':')
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error('Malformed encryption envelope')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()])
  return decrypted.toString('utf8')
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(ENVELOPE_PREFIX)
}

/**
 * Tenant columns that hold vendor secrets and must be encrypted at rest.
 * Single source of truth — every write path that touches these columns must
 * run values through encryptTenantSecrets() before saving. Keep in sync when
 * adding a new integration credential column.
 */
export const ENCRYPTED_TENANT_FIELDS = [
  'stripe_api_key',
  'telnyx_api_key',
  'resend_api_key',
  'imap_pass',
  'anthropic_api_key',
  'indexnow_key',
  'telegram_bot_token',
] as const

/**
 * Return a copy of `updates` with any ENCRYPTED_TENANT_FIELDS encrypted.
 * Idempotent (skips already-encrypted values) and non-destructive (leaves
 * empty/null values untouched so callers keep control over clear-vs-skip
 * semantics). Does not mutate the input.
 */
export function encryptTenantSecrets<T extends Record<string, unknown>>(updates: T): T {
  const out: Record<string, unknown> = { ...updates }
  for (const field of ENCRYPTED_TENANT_FIELDS) {
    const v = out[field]
    if (typeof v === 'string' && v.length > 0 && !isEncrypted(v)) {
      out[field] = encryptSecret(v)
    }
  }
  return out as T
}
