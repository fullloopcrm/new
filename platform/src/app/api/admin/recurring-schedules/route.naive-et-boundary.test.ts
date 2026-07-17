/**
 * GET /api/admin/recurring-schedules attaches each schedule's
 * `next_booking_date` via `.gte('start_time', new Date().toISOString())`.
 * bookings.start_time is a naive-ET TIMESTAMP (no tz); a real-UTC
 * .toISOString() cutoff is shifted later by the EST/EDT offset, silently
 * excluding the next ~4-5h of bookings every evening ET -- the genuinely
 * next-upcoming booking reads as if there were none.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5. The
 * booking below starts 9pm ET the same evening (90 real minutes out).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A } = vi.hoisted(() => ({ TENANT_A: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [{ id: 'sch-A1', tenant_id: TENANT_A }],
    bookings: [
      { id: 'imminent', tenant_id: TENANT_A, schedule_id: 'sch-A1', status: 'scheduled', start_time: '2026-01-05T21:00:00' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { GET } from './route'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/admin/recurring-schedules — next_booking_date blind spot', () => {
  it('reports next_booking_date for a booking starting 90 real minutes from now', async () => {
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(json[0].next_booking_date).toBe('2026-01-05T21:00:00')
  })
})
