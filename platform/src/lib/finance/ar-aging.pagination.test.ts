import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * fin-04: getArAging() had two genuinely unbounded queries (invoices,
 * bookings) with no .limit()/.range() at all. Proves both are now capped,
 * not just that the function still runs.
 */

const limitSpy = vi.fn()

function chain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    is: () => c,
    in: () => c,
    order: () => c,
    limit: (...args: unknown[]) => { limitSpy(...args); return c },
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null }),
  }
  return c
}

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({ from: () => chain() }),
}))

import { getArAging } from './ar-aging'

beforeEach(() => {
  limitSpy.mockClear()
})

describe('getArAging — pagination guard', () => {
  it('caps both the invoices query and the bookings query with an explicit .limit()', async () => {
    await getArAging('tenant-a')
    expect(limitSpy).toHaveBeenCalledTimes(2)
    for (const call of limitSpy.mock.calls) {
      expect(typeof call[0]).toBe('number')
      expect(call[0]).toBeGreaterThan(0)
    }
  })
})
