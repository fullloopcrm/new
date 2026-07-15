import { describe, it, expect, beforeEach, vi } from 'vitest'

// This file only exercises pure signing/comparison functions (no DB calls),
// but auth.ts imports supabaseAdmin at module load time — stub the client so
// the import doesn't require real Supabase credentials in the test env.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}))

/**
 * verifySessionCookie compared an HMAC signature with a naive `!==`, which
 * leaks the expected value byte-by-byte via timing — the same class already
 * fixed for CRON_SECRET across cron/admin routes (de510a4e) and the global
 * ADMIN_PIN in /api/admin-auth (413adc6f), just missed on this per-tenant
 * site's own admin session auth. Fixed with the shared `safeEqual()`
 * constant-time compare.
 */

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'nms-test-secret'
})

describe('nyc-mobile-salon auth — session cookie signature (constant-time)', () => {
  it('rejects a cookie with a same-length forged signature', async () => {
    const { createSessionCookie, verifySessionCookie } = await import('./auth')
    const valid = createSessionCookie('user-1')
    const parts = valid.split('.')
    const forgedSig = parts[3].split('').reverse().join('') // same length, wrong bytes
    const forged = [...parts.slice(0, 3), forgedSig].join('.')

    expect(verifySessionCookie(forged).valid).toBe(false)
  })

  it('rejects a cookie with a wrong-length signature without throwing', async () => {
    const { createSessionCookie, verifySessionCookie } = await import('./auth')
    const valid = createSessionCookie('user-1')
    const parts = valid.split('.')
    const forged = [...parts.slice(0, 3), 'x'].join('.')

    expect(() => verifySessionCookie(forged)).not.toThrow()
    expect(verifySessionCookie(forged).valid).toBe(false)
  })

  it('control: a freshly-issued session cookie still verifies', async () => {
    const { createSessionCookie, verifySessionCookie } = await import('./auth')
    const valid = createSessionCookie('user-1')

    const result = verifySessionCookie(valid)
    expect(result.valid).toBe(true)
    expect(result.userId).toBe('user-1')
  })

  it('control: a legacy PIN session (no userId) still verifies', async () => {
    const { createSessionCookie, verifySessionCookie } = await import('./auth')
    const valid = createSessionCookie()

    expect(verifySessionCookie(valid).valid).toBe(true)
  })
})
