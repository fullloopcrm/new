import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  encryptionKeyAvailable,
  encryptTenantSecrets,
  ENCRYPTED_TENANT_FIELDS,
} from './secret-crypto'

/**
 * `secret-crypto.ts` is the at-rest encryption boundary for every long-lived
 * vendor credential a tenant stores (Stripe / Telnyx / Resend keys, IMAP
 * password, Anthropic key, Telegram bot token — see ENCRYPTED_TENANT_FIELDS).
 * AES-256-GCM under a single 32-byte SECRET_ENCRYPTION_KEY. It is the ONLY thing
 * standing between a Postgres row leak and every tenant's third-party account, so
 * its contract must fail CLOSED:
 *
 *   - a tampered envelope (ct / authTag / iv mutated)  -> throws, never returns garbage
 *   - an envelope encrypted under a DIFFERENT key       -> throws, never decrypts
 *   - a malformed envelope                              -> throws
 *   - ciphertext must not leak the plaintext, and two encryptions of the same
 *     value must differ (fresh IV) — no deterministic/ECB-style leakage
 *
 * This module was previously uncovered (no test imported it). These tests use
 * the REAL node crypto path (nothing mocked), so the GCM auth check is genuinely
 * the system under test. Every "throws / cannot read" assertion is paired with a
 * positive control that DOES round-trip, so none pass vacuously.
 */

// Two distinct, well-formed 32-byte (64 hex char) keys.
const KEY_A = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
const KEY_B = 'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100'
const ORIG_KEY = process.env.SECRET_ENCRYPTION_KEY

beforeEach(() => {
  process.env.SECRET_ENCRYPTION_KEY = KEY_A
})

afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIG_KEY
})

describe('secret-crypto — positive control (round-trips under the right key)', () => {
  it('encrypt → decrypt returns the original plaintext (proves the primitive can read)', () => {
    const plain = 'sk_live_super_secret_stripe_key'
    const envelope = encryptSecret(plain)
    expect(isEncrypted(envelope)).toBe(true)
    expect(decryptSecret(envelope)).toBe(plain)
  })
})

// Flip the first byte of a base64 segment and re-encode. Mutating decoded bytes
// (not the base64 char) guarantees a real change — a tail-char flip on a padded
// segment can decode to identical bytes.
function flipSegmentByte(segB64: string): string {
  const buf = Buffer.from(segB64, 'base64')
  buf[0] = buf[0] ^ 0xff
  return buf.toString('base64')
}

describe('secret-crypto — fail closed on tamper', () => {
  it('throws when the ciphertext segment is mutated (GCM auth must reject, not return garbage)', () => {
    const envelope = encryptSecret('telnyx-api-key-value')
    const [prefix, iv, ct, tag] = envelope.split(':')
    const tampered = [prefix, iv, flipSegmentByte(ct), tag].join(':')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('throws when the auth tag is mutated', () => {
    const envelope = encryptSecret('resend-api-key-value')
    const [prefix, iv, ct, tag] = envelope.split(':')
    const tampered = [prefix, iv, ct, flipSegmentByte(tag)].join(':')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('throws when the IV is mutated', () => {
    const envelope = encryptSecret('imap-password-value')
    const [prefix, iv, ct, tag] = envelope.split(':')
    const tampered = [prefix, flipSegmentByte(iv), ct, tag].join(':')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('throws on a malformed envelope (missing segments)', () => {
    expect(() => decryptSecret('v1:onlyonesegment')).toThrow('Malformed encryption envelope')
  })
})

describe('secret-crypto — key isolation', () => {
  it('a value encrypted under key A cannot be decrypted under key B (fail closed, no cross-key read)', () => {
    process.env.SECRET_ENCRYPTION_KEY = KEY_A
    const envelope = encryptSecret('anthropic-api-key-value')

    // Swap in a different key, as a mis-provisioned deploy or an attacker holding
    // an unrelated key would have. Decrypt must throw, never leak plaintext.
    process.env.SECRET_ENCRYPTION_KEY = KEY_B
    expect(() => decryptSecret(envelope)).toThrow()

    // Positive control: restore the real key and confirm it DOES read, proving
    // the throw above is key-specific and not a blanket failure.
    process.env.SECRET_ENCRYPTION_KEY = KEY_A
    expect(decryptSecret(envelope)).toBe('anthropic-api-key-value')
  })
})

describe('secret-crypto — confidentiality & non-determinism', () => {
  it('the envelope never contains the plaintext', () => {
    const plain = 'PLAINTEXT_MARKER_9f3a'
    const envelope = encryptSecret(plain)
    expect(envelope.includes(plain)).toBe(false)
  })

  it('encrypting the same value twice yields different envelopes (fresh IV, no ECB-style leak)', () => {
    const plain = 'telegram-bot-token-value'
    const a = encryptSecret(plain)
    const b = encryptSecret(plain)
    expect(a).not.toBe(b)
    // Both still decrypt back to the same plaintext.
    expect(decryptSecret(a)).toBe(plain)
    expect(decryptSecret(b)).toBe(plain)
  })
})

describe('secret-crypto — misconfiguration', () => {
  it('encryptSecret throws when SECRET_ENCRYPTION_KEY is unset', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(() => encryptSecret('x')).toThrow('SECRET_ENCRYPTION_KEY not set')
  })

  it('encryptSecret throws when the key is the wrong length (not 32 bytes)', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'deadbeef'
    expect(() => encryptSecret('x')).toThrow('64 hex chars')
  })

  it('encryptionKeyAvailable reflects a well-formed vs missing/short key', () => {
    process.env.SECRET_ENCRYPTION_KEY = KEY_A
    expect(encryptionKeyAvailable()).toBe(true)
    process.env.SECRET_ENCRYPTION_KEY = 'short'
    expect(encryptionKeyAvailable()).toBe(false)
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(encryptionKeyAvailable()).toBe(false)
  })
})

describe('secret-crypto — encryptTenantSecrets field scoping', () => {
  it('encrypts every ENCRYPTED_TENANT_FIELDS value and leaves non-secret fields untouched', () => {
    const updates = {
      stripe_api_key: 'sk_live_1',
      telnyx_api_key: 'tk_live_2',
      resend_api_key: 're_live_3',
      imap_pass: 'imap-pw',
      anthropic_api_key: 'ak_live_4',
      deepgram_api_key: 'dg_live_4b',
      indexnow_key: 'idx_5',
      telegram_bot_token: 'tg_6',
      telegram_webhook_secret: 'tg_secret_7',
      // Non-secret fields must pass through verbatim.
      business_name: 'Acme Cleaning',
      id: 'tenant-A',
    }
    const out = encryptTenantSecrets(updates)

    for (const field of ENCRYPTED_TENANT_FIELDS) {
      const raw = updates[field as keyof typeof updates] as string
      expect(isEncrypted(out[field as keyof typeof out] as string)).toBe(true)
      // And each round-trips back to its original value.
      expect(decryptSecret(out[field as keyof typeof out] as string)).toBe(raw)
    }
    expect(out.business_name).toBe('Acme Cleaning')
    expect(out.id).toBe('tenant-A')
  })

  it('does not mutate the input object', () => {
    const updates = { stripe_api_key: 'sk_live_orig' }
    const out = encryptTenantSecrets(updates)
    expect(updates.stripe_api_key).toBe('sk_live_orig') // input untouched
    expect(out.stripe_api_key).not.toBe('sk_live_orig') // output encrypted
  })

  it('is idempotent — an already-encrypted value is not double-wrapped', () => {
    const once = encryptTenantSecrets({ stripe_api_key: 'sk_live_x' })
    const twice = encryptTenantSecrets(once)
    expect(twice.stripe_api_key).toBe(once.stripe_api_key)
    expect(decryptSecret(twice.stripe_api_key)).toBe('sk_live_x')
  })

  it('with no encryption key it stores PLAINTEXT (documented graceful degradation, not a throw)', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    const out = encryptTenantSecrets({ stripe_api_key: 'sk_live_plain' })
    expect(out.stripe_api_key).toBe('sk_live_plain')
    expect(isEncrypted(out.stripe_api_key)).toBe(false)
  })
})
