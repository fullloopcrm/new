/**
 * ingest/application/route.ts POST — had ZERO rate limiting despite being a
 * public cross-site sink gated only by a shared INGEST_SECRET used across
 * many separate standalone tenant-site codebases (wepayyoujunk, etc). Same
 * exposure class as sibling ingest/lead: a leaked/compromised secret on any
 * one of those sites could spam unbounded team_applications writes + admin
 * notifications for any known tenant_slug.
 */
import { describe, it, expect, vi } from 'vitest'

process.env.INGEST_SECRET = 'test-ingest-secret'

const getTenantBySlug = vi.hoisted(() => vi.fn(async () => ({ id: 'tenant-1', name: 'Acme' })))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug }))

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const insertCalls: Array<{ table: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            ilike: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          }),
        }),
      }),
      insert: (_row: unknown) => {
        insertCalls.push({ table })
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 'app-1' }, error: null }) }) }
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

describe('POST /api/ingest/application — rate limiting', () => {
  it('is rate-limited per tenant+ip and rejects (no application insert) once exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(ingestReq())
    expect(res.status).toBe(429)
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('ingest-application:tenant-1:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(ingestReq())
    expect(res.status).toBe(200)
    expect(insertCalls.map((c) => c.table)).toEqual(expect.arrayContaining(['team_applications']))
  })
})
