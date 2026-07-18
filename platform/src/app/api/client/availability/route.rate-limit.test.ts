import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/client/availability is public/unauthenticated (self-service
 * booking widget, no client_id/auth required) and had zero rate limit —
 * sibling gap to /api/availability, same checkAvailability() DB query,
 * same fix convention (per-IP rateLimitDb before the query).
 */

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant-1' }),
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

describe('GET /api/client/availability — rate limit', () => {
  it('429s when the rate limiter denies, without querying availability', async () => {
    rateLimitAllowed = false
    checkAvailabilityCallCount = 0
    const res = await GET(new Request('http://x/api/client/availability?date=2026-03-15'))
    expect(res.status).toBe(429)
    expect(checkAvailabilityCallCount).toBe(0)
  })

  it('resolves normally when under the limit', async () => {
    rateLimitAllowed = true
    checkAvailabilityCallCount = 0
    const res = await GET(new Request('http://x/api/client/availability?date=2026-03-15'))
    expect(res.status).toBe(200)
    expect(checkAvailabilityCallCount).toBe(1)
  })
})
