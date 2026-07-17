/**
 * POST /api/admin/recurring-schedules/:id/regenerate falls back to
 * `new Date().toISOString()` for its "capture OLD future bookings to
 * delete" cutoff when the caller omits `from_date`. bookings.start_time is
 * a naive-ET TIMESTAMP (no tz); a real-UTC cutoff is shifted later by the
 * EST/EDT offset, so during the ~4-5h evening ET/UTC crossover window an
 * old booking in that window survives the delete step while the new
 * pattern's replacement for the same slot is inserted anyway -- the exact
 * duplicate-booking outcome this route exists to prevent.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5. The old
 * booking below starts 9pm ET the same evening (90 real minutes out).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  return { supabaseAdmin: fake, __fake: fake }
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
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — default cutoff, no from_date supplied', () => {
  it('deletes an old booking 90 real minutes out instead of leaving a duplicate', async () => {
    fake._seed('bookings', [
      { id: 'old-imminent', tenant_id: TENANT, schedule_id: 'sch-1', status: 'scheduled', start_time: '2026-01-05T21:00:00' },
    ])

    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ dates: ['2026-01-05'], preferred_time: '21:00' }), // no from_date
      }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bookings_removed).toBe(1)
    const remainingIds = fake._all('bookings').map((b) => b.id)
    expect(remainingIds).not.toContain('old-imminent')
  })
})
