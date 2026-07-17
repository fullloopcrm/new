/**
 * DELETE /api/schedules/:id cancels the schedule's future bookings via
 * `.gte('start_time', new Date().toISOString())`. bookings.start_time is a
 * naive-ET TIMESTAMP (no tz); a real-UTC .toISOString() cutoff is shifted
 * later by the EST/EDT offset, silently excluding the next ~4-5h of
 * bookings every evening ET -- a cleaner could still be dispatched to a
 * job whose schedule was just cancelled.
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
    recurring_schedules: [{ id: 'sch-A1', tenant_id: TENANT_A, status: 'active' }],
    bookings: [
      { id: 'imminent', tenant_id: TENANT_A, schedule_id: 'sch-A1', status: 'scheduled', start_time: '2026-01-05T21:00:00' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('DELETE /api/schedules/:id — cancels imminent future bookings', () => {
  it('cancels a booking starting 90 real minutes from now, not just later ones', async () => {
    const res = await DELETE(new Request('http://x'), params('sch-A1'))
    expect(res.status).toBe(200)
    const booking = fake._all('bookings').find((b) => b.id === 'imminent')
    expect(booking?.status).toBe('cancelled')
  })
})
