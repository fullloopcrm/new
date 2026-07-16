/**
 * POST /api/admin/recurring-schedules/:id/regenerate — duplicate-submit race.
 *
 * Two concurrent regenerate calls for the same schedule (double-click of
 * Save, or a client retry after a slow response) both read the same
 * `recurring_schedules` row, then both insert a full duplicate set of new
 * booking rows for the same series before either's delete of the OLD future
 * bookings runs -- net result is duplicate scheduled bookings left on the
 * calendar/team portal for the same series. Fixed with an optimistic-
 * concurrency compare-and-swap on the row's own updated_at: only the caller
 * whose earlier read is still current wins the claim; the loser gets a clean
 * 409 instead of racing the insert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-1' }))

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
const postReq = () => new Request('http://x', { method: 'POST', body: JSON.stringify({ dates: ['2026-08-01'], preferred_time: '09:00' }) })

describe('POST /api/admin/recurring-schedules/:id/regenerate — duplicate-submit race', () => {
  beforeEach(() => {
    fake._all('bookings').length = 0
    const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sch-1')
    if (schedule) delete schedule.updated_at
  })

  it('regenerates once for a normal single call', async () => {
    const res = await POST(postReq(), params('sch-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bookings_created).toBe(1)
  })

  it('does not double-insert bookings when regenerate is double-clicked (or retried)', async () => {
    const [r1, r2] = await Promise.all([POST(postReq(), params('sch-1')), POST(postReq(), params('sch-1'))])
    const statuses = [r1.status, r2.status].sort()
    // Exactly one call wins the claim (200); the other loses it (409).
    expect(statuses).toEqual([200, 409])
    // Only the winner's booking set should exist -- no duplicates.
    expect(fake._all('bookings')).toHaveLength(1)
  })
})
