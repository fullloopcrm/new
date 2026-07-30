import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * fin-05: this route had four unbounded queries (clients, and three separate
 * bookings fetches) with no .limit()/.range() at all. Proves all four are
 * now capped, not just that the route still returns 200.
 */

const limitSpy = vi.fn()

function chain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    order: () => c,
    limit: (...args: unknown[]) => { limitSpy(...args); return c },
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain() } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-a' }, error: null }),
}))

import { GET } from './route'

beforeEach(() => {
  limitSpy.mockClear()
})

describe('GET /api/client-analytics — pagination guard', () => {
  it('caps all four queries (clients, completed/cancelled/all bookings) with an explicit .limit()', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(limitSpy).toHaveBeenCalledTimes(4)
    for (const call of limitSpy.mock.calls) {
      expect(typeof call[0]).toBe('number')
      expect(call[0]).toBeGreaterThan(0)
    }
  })
})
