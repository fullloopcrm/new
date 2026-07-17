import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/schedules/[id]/pause built its "cancel bookings within the pause
 * window" cutoff via `new Date().toISOString()` -- a real-UTC instant --
 * compared against bookings.start_time, a naive-ET TIMESTAMP (no tz). This
 * is the exact bug class fixed session-wide across the rest of the
 * recurring-schedules feature in d69ae7e1 (admin/recurring-schedules,
 * admin/recurring-schedules/[id], schedules/[id]) -- this sibling pause
 * route was missed by that sweep.
 *
 * During the ~4-5h evening ET/UTC crossover window, the real-UTC cutoff is
 * shifted LATER than the true ET "now", so an imminent booking (already
 * started, in the recent past relative to true ET now) reads as still in
 * the future relative to the real-UTC cutoff and gets excluded from the
 * `.gte('start_time', now)` filter -- leaving it 'scheduled' even though
 * the schedule was just paused for that window. A cleaner could still be
 * dispatched to a job whose schedule was just paused.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5. The
 * booking below starts 9pm ET the same evening (90 real minutes out) --
 * true ET "now" is 7:30pm, so this booking IS in the future and must be
 * cancelled.
 */

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [
      { id: 'sch-1', tenant_id: TENANT, client_id: 'client-1', recurring_type: 'weekly', status: 'active' },
    ],
    bookings: [],
    notifications: [],
    audit_logs: [],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  fake._all('bookings').length = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/schedules/[id]/pause — naive-ET boundary on the cancel-window cutoff', () => {
  it('cancels a booking starting 90 real minutes from now, not just later ones', async () => {
    fake._seed('bookings', [
      { id: 'imminent', tenant_id: TENANT, schedule_id: 'sch-1', client_id: 'client-1', status: 'scheduled', start_time: '2026-01-05T21:00:00' },
    ])

    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ paused_until: '2026-02-01' }) }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bookings_cancelled).toBe(1)
    const booking = fake._all('bookings').find((b) => b.id === 'imminent')
    expect(booking?.status).toBe('cancelled')
  })
})
