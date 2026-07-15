import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/client/check resolves an unauthenticated caller-supplied
 * email/phone to a client's name+phone+email — no login required. It's the
 * identity-lookup step feeding client/send-code -> client/login (both already
 * failClosed). If the rate limiter fails OPEN during a DB outage, this becomes
 * an unbounded PII-enumeration oracle over every client record in the tenant.
 * This proves the fix: a rate-limiter DB error denies (429) BEFORE the
 * `clients` table is ever queried.
 */

let countResult: { count: number | null; error: unknown }
let clientsQueried: boolean

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

function clientsTable() {
  return {
    select: () => ({
      eq: () => ({
        ilike: () => ({
          maybeSingle: async () => {
            clientsQueried = true
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
      if (table === 'clients') return clientsTable()
      throw new Error(`unexpected table in client/check fails-closed test: ${table}`)
    },
  }),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', slug: 'acme' })),
}))

function req(url: string): Request {
  return {
    url,
    headers: {
      get: (name: string) => (name === 'x-forwarded-for' ? '203.0.113.9' : null),
    },
    json: async () => ({ email: 'victim@example.com' }),
  } as unknown as Request
}

beforeEach(() => {
  vi.resetModules()
  countResult = { count: 0, error: null }
  clientsQueried = false
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('client/check — rate limit fails closed on DB outage', () => {
  it('GET denies (429) and never queries clients when the rate-limit count query errors', async () => {
    countResult = { count: null, error: { message: 'db outage' } }

    const { GET } = await import('./route')
    const res = await GET(req('https://acme.example.com/api/client/check?email=victim@example.com'))

    expect(res.status).toBe(429)
    expect(clientsQueried).toBe(false)
  })

  it('POST denies (429) and never queries clients when the rate-limit count query errors', async () => {
    countResult = { count: null, error: { message: 'db outage' } }

    const { POST } = await import('./route')
    const res = await POST(req('https://acme.example.com/api/client/check'))

    expect(res.status).toBe(429)
    expect(clientsQueried).toBe(false)
  })

  it('denies (429) once the per-window limit is exhausted, independent of any DB error', async () => {
    countResult = { count: 10, error: null }

    const { GET } = await import('./route')
    const res = await GET(req('https://acme.example.com/api/client/check?email=victim@example.com'))

    expect(res.status).toBe(429)
    expect(clientsQueried).toBe(false)
  })

  it('allows through to the client lookup once the rate limiter is healthy again', async () => {
    countResult = { count: 0, error: null }

    const { GET } = await import('./route')
    const res = await GET(req('https://acme.example.com/api/client/check?email=victim@example.com'))

    expect(res.status).toBe(200)
    expect(clientsQueried).toBe(true)
  })
})
