/**
 * POST /api/admin/recurring-schedules — orphaned schedule on bookings-batch failure.
 *
 * The route created the `recurring_schedules` row, then batch-inserted the
 * first ~6 weeks of `bookings`. If that batch insert failed (e.g. the real
 * fn_block_booking_overlap trigger rejecting the whole statement on one
 * overlapping occurrence — same failure mode covered for the cron in
 * generate-recurring and for the quote-conversion path in
 * sale-to-recurring.ts), the schedule row was left behind: 'active', zero
 * bookings, no way for the admin to know it's broken. The weekly cron would
 * then keep trying to generate against it forever, and a retry created a
 * second, duplicate schedule alongside the orphan. Fix: roll back the
 * schedule row when the bookings batch fails.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A } = vi.hoisted(() => ({ TENANT_A: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    clients: [{ id: 'client-A', tenant_id: TENANT_A, name: 'Own Client' }],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const jsonReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const baseBody = {
  client_id: 'client-A',
  recurring_type: 'weekly',
  start_date: '2026-08-01',
  preferred_time: '09:00',
}

describe('POST /api/admin/recurring-schedules — bookings batch-insert failure rollback', () => {
  it('does not leave an orphaned schedule when the bookings insert fails', async () => {
    // Deterministic first occurrence for this body is 2026-08-01T09:00:00.
    fake._addUniqueConstraint('bookings', 'start_time')
    fake._seed('bookings', [
      { id: 'existing-booking-1', tenant_id: TENANT_A, start_time: '2026-08-01T09:00:00' },
    ])

    const res = await POST(jsonReq(baseBody))
    expect(res.status).toBe(500)
    expect(fake._all('recurring_schedules').length).toBe(0)

    // Clear the conflict and retry — succeeds cleanly, exactly one schedule.
    fake._store.set('bookings', fake._all('bookings').filter((b) => b.id !== 'existing-booking-1'))
    const retried = await POST(jsonReq(baseBody))
    expect(retried.status).toBe(200)
    expect(fake._all('recurring_schedules').length).toBe(1)
  })
})
