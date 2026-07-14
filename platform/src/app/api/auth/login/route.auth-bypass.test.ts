import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * POST /api/auth/login is the legacy nycmaid admin login (live, public, no
 * Clerk needed) — a successful hit here mints a full owner admin_session.
 *
 * Three real bugs fixed here, mutation-verified against the pre-fix code in
 * this same session (see /tmp/w4-auth-fix.diff RED run for the underlying
 * nycmaid/auth.ts signing fix):
 *   1. `(process.env.ADMIN_PASSWORD || '').trim()` defaulted to '' when the
 *      env var was unset, and the PIN fallback did `password === adminPassword`
 *      -- an attacker submitting password:'' got a zero-config owner session.
 *   2. The in-memory `Map` rate limiter resets every serverless cold start,
 *      giving no real brute-force protection; migrated to rateLimitDb
 *      failClosed, matching every other login/OTP route's convention.
 *   3. x-forwarded-for / user-agent (attacker-controlled headers) were
 *      interpolated raw into the "Admin Login Alert" HTML email -- stored XSS
 *      against whoever reads the alert inbox.
 */

let rlResult: { allowed: boolean; remaining: number } = { allowed: true, remaining: 4 }
const rlCalls: Array<{ key: string; max: number; windowMs: number; opts: { failClosed?: boolean } }> = []

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number, windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlCalls.push({ key: bucketKey, max, windowMs, opts })
    return rlResult
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}))

const emailCalls: Array<{ subject: string; html: string }> = []
vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  emailAdmins: async (subject: string, html: string) => {
    emailCalls.push({ subject, html })
  },
}))

const notifyCalls: Array<{ type: string; title: string; message: string }> = []
vi.mock('@/lib/nycmaid/notify', () => ({
  notify: async (args: { type: string; title: string; message: string }) => {
    notifyCalls.push(args)
  },
}))

const cookieSets: Array<{ name: string; value: string }> = []
vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string) => { cookieSets.push({ name, value }) },
  }),
}))

import { POST } from './route'

const ORIG_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

function loginReq(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('https://x/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.9', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  rlResult = { allowed: true, remaining: 4 }
  rlCalls.length = 0
  emailCalls.length = 0
  notifyCalls.length = 0
  cookieSets.length = 0
})

afterEach(() => {
  if (ORIG_ADMIN_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = ORIG_ADMIN_PASSWORD
})

describe('auth/login — empty ADMIN_PASSWORD must never authorize', () => {
  it('REJECTS an empty submitted password when ADMIN_PASSWORD is unset (the zero-config bypass)', async () => {
    delete process.env.ADMIN_PASSWORD
    const res = await POST(loginReq({ password: '' }))
    expect(res.status).toBe(401)
    expect(cookieSets).toHaveLength(0)
  })

  it('REJECTS a non-empty guess too when ADMIN_PASSWORD is unset', async () => {
    delete process.env.ADMIN_PASSWORD
    const res = await POST(loginReq({ password: 'anything' }))
    expect(res.status).toBe(401)
    expect(cookieSets).toHaveLength(0)
  })
})

describe('auth/login — PIN fallback with a configured secret', () => {
  it('ALLOWS the correct PIN and sets an admin_session cookie', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(loginReq({ password: 'correct-horse-battery-staple' }))
    expect(res.status).toBe(200)
    expect(cookieSets.some((c) => c.name === 'admin_session')).toBe(true)
  })

  it('REJECTS an empty password against a configured secret', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(loginReq({ password: '' }))
    expect(res.status).toBe(401)
    expect(cookieSets).toHaveLength(0)
  })

  it('REJECTS an incorrect PIN', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(loginReq({ password: 'wrong' }))
    expect(res.status).toBe(401)
  })
})

describe('auth/login — rate limiting', () => {
  it('opts the DB-backed limiter into failClosed, keyed by IP', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    await POST(loginReq({ password: 'correct-horse-battery-staple' }))
    const call = rlCalls.find((c) => c.key === 'auth_login:10.0.0.9')
    expect(call?.opts.failClosed).toBe(true)
  })

  it('denies (429) once the limiter says not allowed, before any credential check', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    rlResult = { allowed: false, remaining: 0 }
    const res = await POST(loginReq({ password: 'correct-horse-battery-staple' }))
    expect(res.status).toBe(429)
    expect(cookieSets).toHaveLength(0)
  })
})

describe('auth/login — XSS in the login-alert email', () => {
  it('escapes an attacker-controlled User-Agent before it reaches the HTML email', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const payload = '<img src=x onerror=alert(1)>'
    await POST(loginReq({ password: 'correct-horse-battery-staple' }, { 'user-agent': payload }))
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0].html).not.toContain('<img src=x onerror=alert(1)>')
    expect(emailCalls[0].html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes an attacker-controlled X-Forwarded-For before it reaches the HTML email', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const payload = '<script>alert(1)</script>'
    await POST(loginReq({ password: 'correct-horse-battery-staple' }, { 'x-forwarded-for': payload }))
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0].html).not.toContain('<script>alert(1)</script>')
    expect(emailCalls[0].html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
