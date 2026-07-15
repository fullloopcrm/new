import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/auth/login (the host-resolved admin PIN/password login used by
 * SiteAdminLoginClient) used to rate-limit via an in-memory Map — which
 * resets on every cold start and is per-instance under concurrent serverless
 * invocations, so it never actually bounded brute force in production. It
 * now calls rateLimitDb(..., { failClosed: true }), matching every other
 * auth-critical endpoint (admin-auth, client/login, portal/auth). This test
 * proves the fail-closed guarantee: a rate-limiter DB outage denies the
 * request (429) BEFORE any password/PIN comparison or admin_users query runs,
 * instead of silently letting brute force through while the limiter is blind.
 */

let countResult: { count: number | null; error: unknown }
let adminUsersQueried: boolean

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
          single: async () => {
            adminUsersQueried = true
            return { data: null, error: null }
          },
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
      throw new Error(`unexpected table in auth/login fails-closed test: ${table}`)
    },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: () => {},
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
  adminUsersQueried = false
  process.env.ADMIN_PASSWORD = 'legacy-pin-secret'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('auth/login — rate limit fails closed on DB outage', () => {
  it('denies (429) before ever comparing the legacy PIN when the rate-limit count query errors', async () => {
    countResult = { count: null, error: { message: 'db outage' } }

    const { POST } = await import('./route')
    const res = await POST(req({ password: 'legacy-pin-secret' }))

    expect(res.status).toBe(429)
    expect(adminUsersQueried).toBe(false)
  })

  it('denies (429) even with a correct email+password pair when the limiter is blind', async () => {
    countResult = { count: null, error: { message: 'db outage' } }

    const { POST } = await import('./route')
    const res = await POST(req({ email: 'owner@example.com', password: 'whatever' }))

    expect(res.status).toBe(429)
    // Proves the route returned before ever querying admin_users.
    expect(adminUsersQueried).toBe(false)
  })

  it('allows through to the credential check once the rate limiter is healthy again', async () => {
    countResult = { count: 0, error: null }

    const { POST } = await import('./route')
    const res = await POST(req({ password: 'legacy-pin-secret' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('denies (429) when the limit is already exhausted, independent of any DB error', async () => {
    countResult = { count: 5, error: null }

    const { POST } = await import('./route')
    const res = await POST(req({ password: 'legacy-pin-secret' }))

    expect(res.status).toBe(429)
    expect(adminUsersQueried).toBe(false)
  })
})
