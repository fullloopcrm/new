/**
 * ingest/lead/route.ts POST — had ZERO rate limiting despite being a public
 * cross-site sink gated only by a shared INGEST_SECRET used across many
 * separate standalone marketing-site codebases (nyc-tow, tolltrucksnearme,
 * etc). A leaked/compromised secret on any one of those sites could spam
 * unbounded clients/portal_leads/deals writes + admin email for any known
 * tenant_slug. Mirrors the sibling host-resolved /api/lead's rateLimitDb guard.
 */
import { describe, it, expect, vi } from 'vitest'

process.env.INGEST_SECRET = 'test-ingest-secret'

const getTenantBySlug = vi.hoisted(() => vi.fn(async () => ({ id: 'tenant-1', name: 'Acme' })))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug }))

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const emailAdmins = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins }))

vi.mock('@/lib/email-templates', () => ({
  adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })),
}))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: vi.fn(() => 'https://acme.example.com') }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

// Chainable query stub: eq/in/limit/ilike all return the same object so any
// call order resolves, and the object itself is awaitable (thenable).
function chain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    in: () => q,
    limit: () => q,
    ilike: () => q,
    order: () => q,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

const insertCalls: Array<{ table: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      // No existing clients candidates, no open deal — matches prior
      // no-dedupe/no-existing-deal defaults for this rate-limit test.
      select: () => chain({ data: table === 'deals' ? null : [] }),
      insert: (_row: unknown) => {
        insertCalls.push({ table })
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'client-1' }, error: null }) }),
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        }
      },
    }),
  },
}))

import { POST } from './route'

function ingestReq(): Request {
  const body = { tenant_slug: 'acme', name: 'Jane Doe', phone: '5551234567' }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'x-ingest-secret': 'test-ingest-secret' }),
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/ingest/lead — rate limiting', () => {
  it('is rate-limited per tenant+ip and rejects (no client insert) once exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(ingestReq())
    expect(res.status).toBe(429)
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('ingest-lead:tenant-1:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(ingestReq())
    expect(res.status).toBe(200)
    expect(insertCalls.map((c) => c.table)).toEqual(expect.arrayContaining(['clients']))
  })
})
