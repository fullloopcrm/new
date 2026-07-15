import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/auth/login's legacy PIN fallback used to compare the submitted
 * password against `(process.env.ADMIN_PASSWORD || '').trim()`. If
 * ADMIN_PASSWORD was ever unset (misconfigured env, new environment that
 * hasn't had secrets provisioned yet), that resolved to `''`, and
 * `password === adminPassword` became `password === ''` — a request with
 * `{"password": ""}` walked straight into a full owner session, no
 * credentials required. This proves an unconfigured ADMIN_PASSWORD now
 * denies the legacy-PIN path entirely instead of degrading to an
 * empty-string password, matching the ADMIN_PASSWORD HMAC-secret fix in
 * lib/nycmaid/auth.ts (same root cause, different call site).
 */

let countResult: { count: number | null; error: unknown }
let sessionCookieSet: string | null

function rateLimitEventsTable() {
  return {
    select: () => ({
      eq: () => ({
        gte: async () => countResult,
      }),
    }),
    insert: async () => ({ error: null }),
  }
}

function adminUsersTable() {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'rate_limit_events') return rateLimitEventsTable()
      if (table === 'admin_users') return adminUsersTable()
      throw new Error(`unexpected table in auth/login empty-password test: ${table}`)
    },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string) => {
      if (name === 'admin_session') sessionCookieSet = value
    },
  }),
}))

vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  emailAdmins: vi.fn(async () => {}),
}))

vi.mock('@/lib/nycmaid/notify', () => ({
  notify: vi.fn(async () => {}),
}))

function req(body: unknown): Request {
  return {
    headers: {
      get: (name: string) => {
        if (name === 'x-forwarded-for') return '203.0.113.9'
        if (name === 'user-agent') return 'vitest'
        return null
      },
    },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  vi.resetModules()
  countResult = { count: 0, error: null }
  sessionCookieSet = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('auth/login — empty/unconfigured ADMIN_PASSWORD fails closed', () => {
  it('rejects an empty-string password when ADMIN_PASSWORD is unset', async () => {
    delete process.env.ADMIN_PASSWORD

    const { POST } = await import('./route')
    const res = await POST(req({ password: '' }))

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('rejects an omitted password when ADMIN_PASSWORD is unset', async () => {
    delete process.env.ADMIN_PASSWORD

    const { POST } = await import('./route')
    const res = await POST(req({}))

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('rejects an empty-string password when ADMIN_PASSWORD is set to a non-empty value', async () => {
    process.env.ADMIN_PASSWORD = 'real-secret-pin'

    const { POST } = await import('./route')
    const res = await POST(req({ password: '' }))

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('control: the real PIN still logs in once ADMIN_PASSWORD is configured', async () => {
    process.env.ADMIN_PASSWORD = 'real-secret-pin'

    const { POST } = await import('./route')
    const res = await POST(req({ password: 'real-secret-pin' }))

    expect(res.status).toBe(200)
    expect(sessionCookieSet).not.toBeNull()
  })
})
