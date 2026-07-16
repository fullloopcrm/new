/**
 * /api/leads/visits POST is the public tracking-pixel sink for `public/t.js`
 * (embedded on every tenant's marketing site, firing on every visit/scroll/
 * CTA tick). It is unauthenticated by design (CORS: *) but, unlike its
 * sibling /api/track (240/min/IP), had no rate limiting at all -- an
 * anonymous scraper could pummel the `website_visits` table with unlimited
 * inserts against any tenant_id. Fixed by applying the same rateLimitDb
 * bucket pattern used on /api/track.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const inserted: Record<string, unknown>[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
        inserted.push(row)
        return Promise.resolve({ error: null })
      }),
    }),
  },
}))

vi.mock('@/lib/require-permission', () => ({ requirePermission: vi.fn() }))

function fakeRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : key === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  inserted.length = 0
  rateLimitDb.mockReset()
})

describe('leads/visits POST — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const req = fakeRequest({ tenant_id: 'tenant-1', action: 'visit' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(inserted).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('leads-visits:1.2.3.4'),
      240,
      60 * 1000
    )
  })

  it('allows the insert through when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 239 })
    const { POST } = await import('./route')
    const req = fakeRequest({ tenant_id: 'tenant-1', action: 'visit' })
    const res = await POST(req)
    expect(res.status).toBe(204)
    expect(inserted).toHaveLength(1)
  })
})
