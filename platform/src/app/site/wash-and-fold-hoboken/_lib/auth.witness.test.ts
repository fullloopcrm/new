import { describe, it, expect, beforeEach, vi } from 'vitest'

// This file only exercises pure signing/comparison functions (no DB calls),
// but auth.ts imports supabaseAdmin at module load time — stub the client so
// the import doesn't require real Supabase credentials in the test env.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}))

/**
 * verifySessionCookie/verifyClientSession/protectCronAPI compared an HMAC
 * signature (or the CRON_SECRET bearer header) with a naive `!==`/`===`,
 * which leaks the expected value byte-by-byte via timing — the same class
 * already fixed for CRON_SECRET across cron/admin routes (de510a4e) and the
 * global ADMIN_PIN in /api/admin-auth (413adc6f), just missed on this
 * per-tenant site's own admin/client session + cron auth. Fixed with the
 * shared `safeEqual()` constant-time compare.
 */

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'wf-hob-test-secret'
  process.env.CRON_SECRET = 'wf-hob-cron-secret'
})

describe('wash-and-fold-hoboken auth — session cookie signature (constant-time)', () => {
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

describe('wash-and-fold-hoboken auth — client session signature (constant-time)', () => {
  it('rejects a client session with a forged signature', async () => {
    const { createClientSession, verifyClientSession } = await import('./auth')
    const valid = createClientSession('client-123')
    const parts = valid.split('.')
    const forgedSig = parts[2].split('').reverse().join('')
    const forged = [...parts.slice(0, 2), forgedSig].join('.')

    expect(verifyClientSession(forged)).toBeNull()
  })

  it('control: a freshly-issued client session still verifies', async () => {
    const { createClientSession, verifyClientSession } = await import('./auth')
    const valid = createClientSession('client-123')

    expect(verifyClientSession(valid)).toBe('client-123')
  })
})

describe('wash-and-fold-hoboken auth — protectCronAPI (constant-time)', () => {
  function req(authHeader: string | null): Request {
    return {
      headers: { get: (name: string) => (name === 'authorization' ? authHeader : null) },
    } as unknown as Request
  }

  it('rejects a same-length wrong secret', async () => {
    const { protectCronAPI } = await import('./auth')
    const res = protectCronAPI(req('Bearer wf-hob-cron-secreX'))
    expect(res?.status).toBe(401)
  })

  it('rejects a missing authorization header without throwing', async () => {
    const { protectCronAPI } = await import('./auth')
    expect(() => protectCronAPI(req(null))).not.toThrow()
    expect(protectCronAPI(req(null))?.status).toBe(401)
  })

  it('control: the real CRON_SECRET bearer header passes', async () => {
    const { protectCronAPI } = await import('./auth')
    const res = protectCronAPI(req('Bearer wf-hob-cron-secret'))
    expect(res).toBeNull()
  })
})
