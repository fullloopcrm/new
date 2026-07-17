/**
 * POST /api/admin/recurring-schedules/:id/regenerate — the "capture OLD
 * future bookings to delete" query filtered
 * `.in('status', ['scheduled', 'pending'])`, omitting 'confirmed'.
 * 'confirmed' is not an edge case: a booking reaches it the ordinary way,
 * the moment a client texts YES to the SMS confirmation. So editing a
 * recurring schedule's pattern (day/time/rate) after any occurrence had
 * already been client-confirmed left that OLD confirmed row un-deleted
 * while step 3 inserted a brand-new booking for the same date — the exact
 * duplicate-booking outcome this route's own atomic-claim comment says it
 * exists to prevent, just via a different door.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [
      { id: 'sch-1', tenant_id: TENANT, client_id: 'client-1', property_id: null, pay_rate: 20, hourly_rate: 40 },
    ],
    bookings: [],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  fake._all('bookings').length = 0
  const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sch-1')
  if (schedule) delete (schedule as Record<string, unknown>).updated_at
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — old confirmed booking removed, not duplicated', () => {
  it('deletes an old CONFIRMED booking in the cutoff window alongside scheduled/pending', async () => {
    fake._seed('bookings', [
      { id: 'old-scheduled', tenant_id: TENANT, schedule_id: 'sch-1', status: 'scheduled', start_time: '2026-08-01T09:00:00' },
      { id: 'old-confirmed', tenant_id: TENANT, schedule_id: 'sch-1', status: 'confirmed', start_time: '2026-08-08T09:00:00' },
      { id: 'old-completed', tenant_id: TENANT, schedule_id: 'sch-1', status: 'completed', start_time: '2026-07-01T09:00:00' },
    ])

    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ dates: ['2026-08-01', '2026-08-08'], preferred_time: '10:00', from_date: '2026-07-15' }),
      }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bookings_created).toBe(2)
    expect(json.bookings_removed).toBe(2) // old-scheduled + old-confirmed; NOT old-completed

    const remainingIds = fake._all('bookings').map((b) => b.id)
    expect(remainingIds).not.toContain('old-scheduled')
    expect(remainingIds).not.toContain('old-confirmed')
    expect(remainingIds).toContain('old-completed') // history untouched
    // exactly 2 new + 1 untouched-history row survive; no leftover duplicate
    // for either regenerated date.
    expect(fake._all('bookings')).toHaveLength(3)
  })
})
