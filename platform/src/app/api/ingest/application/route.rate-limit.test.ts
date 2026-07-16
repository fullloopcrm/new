import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * ingest/application POST rate-limit hardening.
 *
 * BUG (fixed this pass): secret-gated but shared across every standalone
 * tenant site that funnels job applications through this sink — had zero
 * rate limiting. Same threat model as the sibling /api/ingest/lead route
 * (fixed alongside this): a leaked/compromised-site secret alone shouldn't
 * be able to flood team_applications rows unbounded. FIX: rateLimitDb
 * (tenant+ip) guard, checked after tenant resolution and before any write.
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number }>
let rateLimitAllowed: boolean
let applicationsTableTouched: boolean

const TENANT = { id: 'tenant_1', name: 'Acme', slug: 'acme' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      applicationsTableTouched = true
      throw new Error(`unexpected table access: ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async (slug: string) => (slug === 'acme' ? TENANT : null),
}))

vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (key: string, max: number, windowMs: number) => {
    rateLimitCalls.push({ key, max, windowMs })
    return rateLimitAllowed ? { allowed: true, remaining: max - 1 } : { allowed: false, remaining: 0 }
  },
}))

import { POST } from './route'

function postReq(body: unknown, secret: string | null = 'shhh'): Request {
  return {
    json: async () => body,
    headers: { get: (h: string) => (h === 'x-ingest-secret' ? secret : '203.0.113.5') },
  } as unknown as Request
}

const ORIGINAL_SECRET = process.env.INGEST_SECRET

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = false
  applicationsTableTouched = false
  process.env.INGEST_SECRET = 'shhh'
})

afterEach(() => {
  process.env.INGEST_SECRET = ORIGINAL_SECRET
})

describe('POST /api/ingest/application — secret alone no longer bypasses rate limiting', () => {
  it('rejects an unauthenticated call before ever consulting the limiter', async () => {
    const res = await POST(postReq({ tenant_slug: 'acme' }, null))
    expect(res.status).toBe(401)
    expect(rateLimitCalls).toHaveLength(0)
  })

  it('rejects an unknown tenant_slug before ever consulting the limiter', async () => {
    const res = await POST(postReq({ tenant_slug: 'nope', name: 'A', phone: '5551234567' }))
    expect(res.status).toBe(400)
    expect(rateLimitCalls).toHaveLength(0)
  })

  it('calls the persistent rate limiter keyed by tenant+ip once the secret and slug check out', async () => {
    await POST(postReq({ tenant_slug: 'acme', name: 'A', phone: '5551234567' }))
    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('ingest-application:tenant_1:203.0.113.5')
  })

  it('fails to 429 when the limiter denies, without touching team_applications', async () => {
    const res = await POST(postReq({ tenant_slug: 'acme', name: 'A', phone: '5551234567' }))
    expect(res.status).toBe(429)
    expect(applicationsTableTouched).toBe(false)
  })

  it('proceeds to the write path once the limiter allows', async () => {
    rateLimitAllowed = true
    const res = await POST(postReq({ tenant_slug: 'acme', name: 'A', phone: '5551234567' }))
    expect(res.status).toBe(500)
    expect(applicationsTableTouched).toBe(true)
  })
})
