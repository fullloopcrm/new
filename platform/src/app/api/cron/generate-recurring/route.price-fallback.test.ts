/**
 * GET /api/cron/generate-recurring -- the weekly auto-refill loop never set
 * `price` on the bookings it inserts at all (unlike every sibling recurring
 * writer: sale-to-recurring.ts, admin/recurring-schedules POST, and its own
 * [id]/regenerate sibling, which falls back to the series' most recent
 * booking's price -- same convention applied here). Every occurrence this
 * cron generates (i.e. every visit beyond a schedule's initial creation
 * batch, the bulk of a recurring series' lifetime) landed with price:NULL.
 * That NULL is invisible for hourly bookings that go through a normal
 * team-portal checkout (which recomputes price unconditionally), but is real
 * and live for finance/cash-flow's near-term forecast (`if (!price)
 * continue` silently drops every upcoming occurrence) and for
 * generate-monthly-invoices (permanently excludes any occurrence still
 * unpriced when it completes) until then.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/generate-recurring', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// Fixed "now" far from any DST/ET-boundary edge -- this test is about price
// fallback, not date-boundary math.
const NOW = new Date('2026-08-01T12:00:00.000Z')

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    recurring_schedules: [{
      id: 'sched-1', tenant_id: 'tenant-A', status: 'active',
      duration_hours: 2, recurring_type: 'weekly', day_of_week: 6,
      team_member_id: null, property_id: null, service_type_id: null,
      client_id: 'client-1', hourly_rate: 90, pay_rate: null, notes: null,
      special_instructions: null, preferred_time: null,
    }],
    // Existing (already-generated) booking from a week ago, priced at 8500 --
    // old enough that the "already generated 4 weeks out" short-circuit
    // doesn't fire, so this run actually generates new occurrences.
    bookings: [{
      id: 'book-seed', schedule_id: 'sched-1', tenant_id: 'tenant-A',
      start_time: '2026-07-25T10:00:00', price: 8500,
    }],
    recurring_exceptions: [],
    notifications: [],
  }
})

describe('GET /api/cron/generate-recurring -- price fallback', () => {
  it('carries the series most recent booking price onto newly generated occurrences instead of leaving price null', async () => {
    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)
    for (const b of generated) {
      expect(b.price).toBe(8500)
    }
  })
})
