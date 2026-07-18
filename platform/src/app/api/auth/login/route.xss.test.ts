import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/auth/login (legacy nycmaid PIN login).
 *
 * `ip` (x-forwarded-for) and `ua` (user-agent) are fully attacker-controlled
 * request headers. On a successful PIN login they were interpolated raw into
 * the "Admin Login Alert" HTML email sent to owner-role admins via
 * emailAdmins(). Third-party victim: the owner admin reading the alert, not
 * whoever is logging in.
 */

const { notify, emailAdmins } = vi.hoisted(() => ({
  notify: vi.fn(async () => {}),
  emailAdmins: vi.fn(async (..._args: unknown[]) => {}),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ emailAdmins }))
vi.mock('@/lib/nycmaid/auth', () => ({
  createSessionCookie: vi.fn(() => 'session-token'),
  hashPassword: vi.fn((p: string) => `hashed:${p}`),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: vi.fn() })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 4 }) }))

import { POST } from './route'

function req(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://t/api/auth/login', { method: 'POST', body: JSON.stringify(body), headers })
}

beforeEach(() => {
  notify.mockClear()
  emailAdmins.mockClear()
  vi.stubEnv('ADMIN_PASSWORD', 'the-pin')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('auth/login/route.ts — HTML escaping of ip/user-agent in the login alert email', () => {
  const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

  it('escapes x-forwarded-for and user-agent before building the Admin Login Alert HTML', async () => {
    const res = await POST(req({ password: 'the-pin' }, { 'x-forwarded-for': PAYLOAD, 'user-agent': PAYLOAD }))
    expect(res.status).toBe(200)
    expect(emailAdmins).toHaveBeenCalledTimes(1)
    const [, html] = emailAdmins.mock.calls[0] as [string, string]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })
})
