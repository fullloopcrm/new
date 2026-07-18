import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/availability is fully public/unauthenticated and resolves the
 * `tenant` param by slug or UUID with no rate limit — scriptable for
 * tenant-slug enumeration (probe slugs, see which resolve vs 400). Rate
 * limit is keyed per-IP, not per-tenant, so rotating the slug doesn't
 * bypass it.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: 'tenant-1' }, error: null }),
        }),
      }),
    }),
  },
}))

let checkAvailabilityCallCount = 0
vi.mock('@/lib/availability', () => ({
  checkAvailability: async () => {
    checkAvailabilityCallCount++
    return { slots: [] }
  },
}))

let rateLimitAllowed = true
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 29 : 0 }),
}))

import { GET } from './route'

function makeRequest(url: string) {
  return new Request(url) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/availability — rate limit', () => {
  it('429s when the rate limiter denies, without querying availability', async () => {
    rateLimitAllowed = false
    checkAvailabilityCallCount = 0
    const res = await GET(makeRequest('http://x/api/availability?date=2026-03-15&tenant=acme'))
    expect(res.status).toBe(429)
    expect(checkAvailabilityCallCount).toBe(0)
  })

  it('resolves normally when under the limit', async () => {
    rateLimitAllowed = true
    checkAvailabilityCallCount = 0
    const res = await GET(makeRequest('http://x/api/availability?date=2026-03-15&tenant=acme'))
    expect(res.status).toBe(200)
    expect(checkAvailabilityCallCount).toBe(1)
  })
})
