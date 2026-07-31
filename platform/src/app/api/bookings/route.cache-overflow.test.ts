import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Live bug (2026-07-30): unstable_cache doesn't soft-fail when a result
 * exceeds Next.js's data-cache entry size limit (2MB) -- it throws, and that
 * throw propagated all the way out of GET /api/bookings as an uncaught 500.
 * BookingsAdmin.tsx's loadBookings() always requests the full history with a
 * wide date range ("every booking for accurate stat cards and status tabs"),
 * so any tenant with enough booking history (nycmaid: 3000+ rows) 500'd on
 * every single admin Bookings page load. Route must fall back to the
 * uncached fetch instead of failing the request.
 */

const FAKE_ROWS = [{ id: 'bk-1', status: 'scheduled', start_time: '2026-08-01T09:00:00', clients: null, client_properties: null }]

vi.mock('next/cache', () => ({
  unstable_cache: () => () => {
    throw new Error('Failed to set Next.js data cache for unstable_cache /api/bookings...  fetchBookingsList, items over 2MB can not be cached (2932192 bytes)')
  },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: 'tenant-A', tenant: { slug: 'nycmaid' } })),
  AuthError: class AuthError extends Error {},
}))

// A single self-chaining thenable: every filter method the real PostgREST
// builder supports (eq/gte/lte/order/range) can be called in any order and
// returns the same object, which resolves to the fixed result when awaited --
// matching how supabase-js's builder is simultaneously chainable and a Promise.
function makeChain() {
  const chain: Record<string, unknown> = {}
  for (const method of ['eq', 'gte', 'lte', 'order', 'range']) {
    chain[method] = () => chain
  }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: FAKE_ROWS, count: FAKE_ROWS.length, error: null })
  return chain
}

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: () => ({
      select: () => makeChain(),
    }),
  }),
}))

import { GET } from './route'

describe('GET /api/bookings — falls back when the cache write overflows', () => {
  it('returns the bookings instead of a 500 when unstable_cache throws', async () => {
    const req = new NextRequest('http://localhost/api/bookings?limit=1000&page=1&from=2000-01-01&to=2100-01-01')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings).toEqual(FAKE_ROWS)
    expect(json.total).toBe(1)
  })
})
