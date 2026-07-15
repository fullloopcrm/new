/**
 * leads/visits POST — missing rate limiting.
 *
 * Public, unauthenticated tracking-pixel endpoint (called by t.js) that
 * inserts an arbitrary caller-supplied tenant_id into website_visits with no
 * throttling — same high-frequency pixel class as the sibling /api/track
 * (already capped at 240/min/IP), but this one had zero limit at all,
 * letting a runaway client or scraper flood any victim tenant's
 * website_visits table with unbounded writes.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const insert = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({ insert }),
  },
}))

import { POST } from './route'

function visitReq(): Request {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'content-type': 'application/json' }),
    json: async () => ({ tenant_id: 'tenant-1', domain: 'example.com', page_url: '/' }),
  } as unknown as Request
}

describe('POST /api/leads/visits — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no DB write) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(visitReq())
    expect(res.status).toBe(429)
    expect(insert).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('leads-visits:203.0.113.9', 240, 60 * 1000)
  })

  it('allows the write through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 239 })
    insert.mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(visitReq())
    expect(res.status).toBe(204)
    expect(insert).toHaveBeenCalled()
  })
})
