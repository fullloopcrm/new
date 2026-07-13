import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  encryptionKeyAvailable,
  encryptTenantSecrets,
  ENCRYPTED_TENANT_FIELDS,
} from './secret-crypto'

/**
 * secret-crypto is the encryption-at-rest layer for tenant vendor credentials
 * (Stripe/Telnyx/Resend/IMAP/Anthropic/Telegram secrets). A bug here means
 * either secrets are silently stored in plaintext, or a tampered/corrupted
 * envelope decrypts to garbage instead of failing loudly. Both are load-bearing
 * for every integration that reads these columns back and calls a vendor API
 * with the result.
 */

const VALID_KEY = 'a'.repeat(64) // 32 bytes hex
const OTHER_KEY = 'b'.repeat(64)

const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SECRET_ENCRYPTION_KEY
  } else {
    process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
  }
  vi.restoreAllMocks()
})

describe('encryptSecret / decryptSecret — round trip', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
  })

  it('round-trips a plaintext secret', () => {
    const plaintext = 'sk_live_super_secret_value'
    const envelope = encryptSecret(plaintext)
    expect(envelope).not.toBe(plaintext)
    expect(decryptSecret(envelope)).toBe(plaintext)
  })

  it('produces the v1: envelope format with 3 colon-separated segments', () => {
    const envelope = encryptSecret('hello')
    expect(envelope.startsWith('v1:')).toBe(true)
    expect(envelope.split(':')).toHaveLength(4) // 'v1', iv, ct, tag
  })

  it('produces a different envelope each time (random IV)', () => {
    const a = encryptSecret('same-value')
    const b = encryptSecret('same-value')
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('same-value')
    expect(decryptSecret(b)).toBe('same-value')
  })

  it('returns empty string unchanged for both encrypt and decrypt', () => {
    expect(encryptSecret('')).toBe('')
    expect(decryptSecret('')).toBe('')
  })

  it('round-trips unicode content', () => {
    const plaintext = '密钥🔒—value with spaces and ürf'
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext)
  })
})

describe('decryptSecret — legacy plaintext fallback', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
  })

  it('returns unmigrated plaintext unchanged (no v1: prefix)', () => {
    expect(decryptSecret('plain-legacy-api-key')).toBe('plain-legacy-api-key')
  })

  it('does not throw for legacy plaintext even without a key configured', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(decryptSecret('plain-legacy-api-key')).toBe('plain-legacy-api-key')
  })
})

describe('decryptSecret — tamper detection (GCM auth tag)', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
  })

  it('rejects a ciphertext that has been altered', () => {
    const envelope = encryptSecret('sensitive-value')
    const [prefix, iv, ct, tag] = envelope.split(':')
    const flippedCt = ct.slice(0, -2) + (ct.slice(-2) === 'AA' ? 'BB' : 'AA')
    const tampered = `${prefix}:${iv}:${flippedCt}:${tag}`
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('rejects an auth tag that has been altered', () => {
    const envelope = encryptSecret('sensitive-value')
    const [prefix, iv, ct, tag] = envelope.split(':')
    const flippedTag = tag.slice(0, -2) + (tag.slice(-2) === 'AA' ? 'BB' : 'AA')
    const tampered = `${prefix}:${iv}:${ct}:${flippedTag}`
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('fails to decrypt with the wrong key (cross-tenant key confusion)', () => {
    const envelope = encryptSecret('sensitive-value')
    process.env.SECRET_ENCRYPTION_KEY = OTHER_KEY
    expect(() => decryptSecret(envelope)).toThrow()
  })

  it('throws on a malformed envelope missing segments', () => {
    expect(() => decryptSecret('v1:onlyonepart')).toThrow('Malformed encryption envelope')
  })
})

describe('getKey validation (via encryptSecret/decryptSecret)', () => {
  it('throws when SECRET_ENCRYPTION_KEY is not set', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(() => encryptSecret('value')).toThrow('SECRET_ENCRYPTION_KEY not set')
  })

  it('throws when SECRET_ENCRYPTION_KEY is the wrong length', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'tooshort'
    expect(() => encryptSecret('value')).toThrow('64 hex chars')
  })
})

describe('isEncrypted', () => {
  it.each([
    ['v1: envelope', 'v1:abc:def:ghi', true],
    ['plain string', 'plaintext-value', false],
    ['empty string', '', false],
    ['null', null, false],
    ['undefined', undefined, false],
  ])('%s -> %s', (_label, value, expected) => {
    expect(isEncrypted(value as string | null | undefined)).toBe(expected)
  })
})

describe('encryptionKeyAvailable', () => {
  afterEach(() => {
    delete process.env.SECRET_ENCRYPTION_KEY
  })

  it('true for a well-formed 64-hex-char key', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    expect(encryptionKeyAvailable()).toBe(true)
  })

  it('false when unset', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(encryptionKeyAvailable()).toBe(false)
  })

  it('false when the wrong length', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'short'
    expect(encryptionKeyAvailable()).toBe(false)
  })
})

describe('encryptTenantSecrets', () => {
  afterEach(() => {
    delete process.env.SECRET_ENCRYPTION_KEY
  })

  it('encrypts every field in ENCRYPTED_TENANT_FIELDS present in the input', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const updates: Record<string, string> = {}
    for (const field of ENCRYPTED_TENANT_FIELDS) updates[field] = `raw-${field}`
    const out = encryptTenantSecrets(updates)
    for (const field of ENCRYPTED_TENANT_FIELDS) {
      expect(isEncrypted(out[field] as string)).toBe(true)
      expect(decryptSecret(out[field] as string)).toBe(`raw-${field}`)
    }
  })

  it('leaves non-secret fields untouched', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const out = encryptTenantSecrets({ business_name: 'Acme Cleaning', stripe_api_key: 'sk_live_x' })
    expect(out.business_name).toBe('Acme Cleaning')
    expect(isEncrypted(out.stripe_api_key as string)).toBe(true)
  })

  it('does not mutate the input object', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const updates = { stripe_api_key: 'sk_live_x' }
    const frozenCopy = { ...updates }
    encryptTenantSecrets(updates)
    expect(updates).toEqual(frozenCopy)
  })

  it('is idempotent — skips a value that is already encrypted', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const already = encryptSecret('sk_live_x')
    const out = encryptTenantSecrets({ stripe_api_key: already })
    expect(out.stripe_api_key).toBe(already)
  })

  it('leaves empty-string secret fields untouched (does not encrypt "")', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const out = encryptTenantSecrets({ stripe_api_key: '' })
    expect(out.stripe_api_key).toBe('')
  })

  it('leaves null/undefined secret fields untouched', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const out = encryptTenantSecrets({ stripe_api_key: null, telnyx_api_key: undefined })
    expect(out.stripe_api_key).toBeNull()
    expect(out.telnyx_api_key).toBeUndefined()
  })

  it('degrades to plaintext (does not throw) when no encryption key is configured', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    const out = encryptTenantSecrets({ stripe_api_key: 'sk_live_x' })
    expect(out.stripe_api_key).toBe('sk_live_x')
    expect(isEncrypted(out.stripe_api_key as string)).toBe(false)
  })

  it('warns once (not per-call) when no key is configured', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    encryptTenantSecrets({ stripe_api_key: 'a' })
    encryptTenantSecrets({ stripe_api_key: 'b' })
    // _warnedNoKey is module-level state; the exact call count depends on
    // whether an earlier test in this run already tripped it, but it must
    // not fire once per call within this test.
    const callsInThisTest = warnSpy.mock.calls.length
    expect(callsInThisTest).toBeLessThan(2)
  })
})
