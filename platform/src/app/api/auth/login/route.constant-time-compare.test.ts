import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/auth/login's legacy PIN fallback compared the submitted password
 * against ADMIN_PASSWORD with a naive `===`, which leaks the password
 * byte-by-byte via timing — the same class already fixed for CRON_SECRET
 * across cron/admin routes (de510a4e) and the global ADMIN_PIN in
 * /api/admin-auth (413adc6f). This proves the fixed `safeEqual()` compare
 * still accepts/rejects correctly, including the wrong-length case
 * `Buffer.from()`-based constant-time compares must handle explicitly.
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
      throw new Error(`unexpected table in auth/login constant-time-compare test: ${table}`)
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
  process.env.ADMIN_PASSWORD = 'super-secret-pin'
})

describe('auth/login — legacy PIN constant-time compare', () => {
  it('rejects a same-length wrong password', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ password: 'super-secret-piX' })) // same length as 'super-secret-pin'

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('rejects a wrong-length password without throwing', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ password: 'x' }))

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('rejects a much-longer wrong password without throwing', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ password: 'super-secret-pin-but-way-too-long' }))

    expect(res.status).toBe(401)
    expect(sessionCookieSet).toBeNull()
  })

  it('control: the real password still logs in', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ password: 'super-secret-pin' }))

    expect(res.status).toBe(200)
    expect(sessionCookieSet).not.toBeNull()
  })
})
