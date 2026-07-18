import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Admin login PIN fallback — constant-time compare + empty-secret bypass
 * regression (P1/W1 queue-c).
 *
 * Two bugs lived on the same line: (1) `password === adminPassword` was a
 * timing side-channel on the admin PIN, and (2) `adminPassword` defaulted to
 * `''` when ADMIN_PASSWORD was unset, so an empty submitted password matched
 * an empty expected password — a full admin-session bypass requiring zero
 * configuration. Both are fixed by routing the compare through safeEqual()
 * (which rejects falsy operands) and no longer coercing the missing env var
 * to an empty string.
 */

const cookieSets: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieSets.push({ name, value, options })
    },
  }),
}))
vi.mock('@/lib/nycmaid/auth', () => ({
  createSessionCookie: () => 'session-token',
  hashPassword: (p: string) => `hashed:${p}`,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  },
}))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 4 }) }))

import { POST } from './route'

const loginReq = (body: unknown) =>
  new Request('http://x/api/auth/login', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  cookieSets.length = 0
  vi.unstubAllEnvs()
})

describe('POST /api/auth/login — PIN fallback', () => {
  it('rejects an empty password when ADMIN_PASSWORD is unset (bypass regression)', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '')
    const res = await POST(loginReq({ password: '' }))
    expect(res.status).toBe(401)
    expect(cookieSets).toEqual([])
  })

  it('rejects any password when ADMIN_PASSWORD is unset', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '')
    const res = await POST(loginReq({ password: 'whatever' }))
    expect(res.status).toBe(401)
  })

  it('rejects the wrong PIN when ADMIN_PASSWORD is configured', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-pin')
    const res = await POST(loginReq({ password: 'wrong-pin' }))
    expect(res.status).toBe(401)
    expect(cookieSets).toEqual([])
  })

  it('accepts the correct PIN when ADMIN_PASSWORD is configured', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-pin')
    const res = await POST(loginReq({ password: 'correct-pin' }))
    expect(res.status).toBe(200)
    expect(cookieSets.some((c) => c.name === 'admin_session')).toBe(true)
  })

  it('sets admin_role httpOnly so it cannot be read or forged via document.cookie/XSS', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-pin')
    await POST(loginReq({ password: 'correct-pin' }))
    const roleCookie = cookieSets.find((c) => c.name === 'admin_role')
    expect(roleCookie?.options?.httpOnly).toBe(true)
  })
})
