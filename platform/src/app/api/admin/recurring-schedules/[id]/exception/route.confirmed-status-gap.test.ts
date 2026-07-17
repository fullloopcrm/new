/**
 * POST /api/admin/recurring-schedules/:id/exception — the "apply to the
 * materialized booking" query filtered
 * `.in('status', ['scheduled', 'pending'])`, omitting 'confirmed'. An admin
 * recording a skip/move/reassign exception for one occurrence date got a
 * success response and the exception row was written (so future
 * regeneration would honor it), but if that date's booking had already been
 * client-confirmed via SMS, the booking itself silently never changed —
 * `bookings_updated` under-reported and the wrong thing happened on the
 * calendar (visit not skipped, not moved, not reassigned).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [{ id: 'sch-1', tenant_id: TENANT, duration_hours: 3 }],
    team_members: [{ id: 'tm-x', tenant_id: TENANT, name: 'Reassignee' }],
    recurring_exceptions: [],
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
  fake._all('recurring_exceptions').length = 0
  fake._seed('bookings', [
    { id: 'bk-confirmed', tenant_id: TENANT, schedule_id: 'sch-1', status: 'confirmed', start_time: '2026-08-01T09:00:00' },
  ])
})

describe('POST /api/admin/recurring-schedules/:id/exception — applies to confirmed bookings', () => {
  it('skip: deletes an already-confirmed booking for that date', async () => {
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ occurrence_date: '2026-08-01', type: 'skip' }) }),
      params('sch-1'),
    )
    const json = await res.json()
    expect(json.bookings_updated).toBe(1)
    expect(fake._all('bookings')).toHaveLength(0)
  })

  it('reassign: updates team_member_id on an already-confirmed booking for that date', async () => {
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-x' }),
      }),
      params('sch-1'),
    )
    const json = await res.json()
    expect(json.bookings_updated).toBe(1)
    expect(fake._all('bookings')[0]?.team_member_id).toBe('tm-x')
  })
})
