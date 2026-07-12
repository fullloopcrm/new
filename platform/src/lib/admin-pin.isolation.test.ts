import { describe, it, expect, afterAll, vi } from 'vitest'

/**
 * admin-pin.ts hashes tenant-operator login PINs as HMAC-SHA256(pin) keyed by
 * ADMIN_TOKEN_SECRET. The hash is stored on tenant_members.pin_hash and login
 * looks a member up BY this hash, so the primitive must:
 *
 *   - be deterministic (same pin + same secret -> same hash) so lookup works
 *   - be key-bound: the SAME pin under a DIFFERENT server secret must produce a
 *     DIFFERENT hash — a leaked pin_hash column cannot be validated, nor a hash
 *     forged, without the real ADMIN_TOKEN_SECRET
 *   - never expose the PIN (output is a 64-hex digest, not the input)
 *   - fail CLOSED when the secret is unconfigured (throw, never emit a
 *     guessable/constant hash an attacker could precompute)
 *   - reject malformed PINs at the validation boundary
 *
 * This module was previously exercised only via mocks (require-admin /
 * admin-token-verify stub hashAdminPin). Here the REAL HMAC runs. The secret is
 * captured in a module-level const at import, so secret-sensitive cases reload
 * the module. Key-isolation is paired with a determinism control so neither
 * passes vacuously.
 */

const SECRET_A = 'admin-pin-secret-A'
const SECRET_B = 'admin-pin-secret-B'
const ORIG = process.env.ADMIN_TOKEN_SECRET

/** Reload admin-pin with ADMIN_TOKEN_SECRET = secret (or unset when undefined). */
async function load(secret: string | undefined): Promise<typeof import('./admin-pin')> {
  vi.resetModules()
  if (secret === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = secret
  return import('./admin-pin')
}

afterAll(() => {
  if (ORIG === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = ORIG
})

describe('hashAdminPin — determinism & shape (positive control)', () => {
  it('same pin + same secret yields the same 64-hex hash, and never the raw pin', async () => {
    const { hashAdminPin } = await load(SECRET_A)
    const h1 = hashAdminPin('123456')
    const h2 = hashAdminPin('123456')
    expect(h1).toBe(h2) // deterministic → login lookup works
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(h1.includes('123456')).toBe(false) // not reversible/visible
  })

  it('different PINs produce different hashes', async () => {
    const { hashAdminPin } = await load(SECRET_A)
    expect(hashAdminPin('123456')).not.toBe(hashAdminPin('654321'))
  })
})

describe('hashAdminPin — key isolation', () => {
  it('the SAME pin under a DIFFERENT secret yields a DIFFERENT hash (hash is key-bound)', async () => {
    const a = (await load(SECRET_A)).hashAdminPin('123456')
    const b = (await load(SECRET_B)).hashAdminPin('123456')
    expect(a).not.toBe(b)

    // Determinism control: reloading with SECRET_A again reproduces `a`, proving
    // the difference above is the KEY, not per-load nondeterminism.
    const aAgain = (await load(SECRET_A)).hashAdminPin('123456')
    expect(aAgain).toBe(a)
  })
})

describe('hashAdminPin — fail closed on misconfiguration', () => {
  it('throws when ADMIN_TOKEN_SECRET is unset (never emits a constant/guessable hash)', async () => {
    const { hashAdminPin } = await load(undefined)
    expect(() => hashAdminPin('123456')).toThrow('ADMIN_TOKEN_SECRET is not configured')
  })
})

describe('isValidAdminPin — validation boundary', () => {
  it('accepts 4–8 digit PINs', async () => {
    const { isValidAdminPin } = await load(SECRET_A)
    for (const ok of ['1234', '123456', '12345678']) expect(isValidAdminPin(ok)).toBe(true)
  })

  it('rejects too-short, too-long, non-digit, empty, and whitespace PINs', async () => {
    const { isValidAdminPin } = await load(SECRET_A)
    for (const bad of ['123', '123456789', '12a456', '', ' 123456', '123456 ', 'abcdef']) {
      expect(isValidAdminPin(bad)).toBe(false)
    }
  })
})

describe('generateAdminPin — issued PINs are valid & well-formed', () => {
  it('produces a zero-padded 6-digit PIN that passes isValidAdminPin', async () => {
    const { generateAdminPin, isValidAdminPin } = await load(SECRET_A)
    for (let i = 0; i < 50; i++) {
      const pin = generateAdminPin()
      expect(pin).toMatch(/^\d{6}$/)
      expect(isValidAdminPin(pin)).toBe(true)
    }
  })
})
