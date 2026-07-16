import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * ingest/lead POST rate-limit hardening.
 *
 * BUG (fixed this pass): secret-gated but shared across every standalone
 * marketing site that funnels leads through this sink — had zero rate
 * limiting, unlike the host-resolved sibling /api/lead route (5 req/10min
 * per tenant+ip via rateLimitDb). The route's own docstring already treats
 * "a compromised site" leaking the shared secret as an anticipated threat;
 * without a rate limit, that secret alone lets an attacker flood
 * clients/portal_leads/deals rows and admin emails unbounded. FIX: same
 * rateLimitDb(tenant+ip) guard as /api/lead, checked after tenant resolution
 * and before any write.
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number }>
let rateLimitAllowed: boolean
let clientsTableTouched: boolean

const TENANT = { id: 'tenant_1', name: 'Acme', slug: 'acme' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      clientsTableTouched = true
      throw new Error(`unexpected table access: ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async (slug: string) => (slug === 'acme' ? TENANT : null),
}))

vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: () => 'https://acme.example.com' }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))

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
  rateLimitAllowed = false // default to denied so an accidental write is loud, not silently green
  clientsTableTouched = false
  process.env.INGEST_SECRET = 'shhh'
})

afterEach(() => {
  process.env.INGEST_SECRET = ORIGINAL_SECRET
})

describe('POST /api/ingest/lead — secret alone no longer bypasses rate limiting', () => {
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
    expect(rateLimitCalls[0].key).toBe('ingest-lead:tenant_1:203.0.113.5')
  })

  it('fails to 429 when the limiter denies, without touching the clients table', async () => {
    const res = await POST(postReq({ tenant_slug: 'acme', name: 'A', phone: '5551234567' }))
    expect(res.status).toBe(429)
    expect(clientsTableTouched).toBe(false)
  })

  it('proceeds to the write path once the limiter allows', async () => {
    rateLimitAllowed = true
    const res = await POST(postReq({ tenant_slug: 'acme', name: 'A', phone: '5551234567' }))
    // Writes happen after the gate — with supabaseAdmin.from() mocked to throw,
    // reaching the write path surfaces as a 500 (caught by the route's try/catch)
    // rather than the 401/400/429 the gate itself would return.
    expect(res.status).toBe(500)
    expect(clientsTableTouched).toBe(true)
  })
})
