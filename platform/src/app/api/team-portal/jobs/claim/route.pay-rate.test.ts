import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Before this fix, claiming a job unconditionally overwrote the booking's own
 * pay_rate with the claiming member's team_members.pay_rate default. A job
 * open for self-claim can already carry a per-job rate — an admin-set
 * emergency-broadcast premium (`/api/bookings/broadcast` advertises exactly
 * booking.pay_rate as the promised "$X/hr" rate), or a previous holder's rate
 * surviving a release back to the pool. Payroll (`finance/payroll/route.ts`)
 * treats booking.pay_rate as authoritative over the member's default, so
 * clobbering it at claim time silently shorted whoever answered the
 * broadcast down to their own standard rate.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () =>
    currentAuth
      ? { auth: currentAuth, error: null }
      : { auth: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'
import { POST } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(booking_id: string) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id }) }) as unknown as Request)
}

beforeEach(() => {
  fake._store.clear()
  clearSettingsCache()
  currentAuth = { id: 'tm-1', tid: TID, role: 'worker' }
  fake._seed('tenants', [{ id: TID, booking_buffer_minutes: 60 }])
  fake._seed('team_members', [{ id: 'tm-1', tenant_id: TID, pay_rate: 25, max_jobs_per_day: null, status: 'active' }])
  fake._seed('service_types', [])
})

describe('team-portal/jobs/claim — pay_rate preservation', () => {
  it('preserves the booking\'s own premium pay_rate instead of overwriting it with the claimant\'s default', async () => {
    fake._seed('bookings', [
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', pay_rate: 89, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(200)

    const { data: after } = await supabaseAdmin.from('bookings').select('pay_rate, team_member_id').eq('id', 'open').single()
    expect((after as { pay_rate: number | null }).pay_rate).toBe(89)
    expect((after as { team_member_id: string | null }).team_member_id).toBe('tm-1')
  })

  it('falls back to the claiming member\'s own pay_rate when the booking has none set', async () => {
    fake._seed('bookings', [
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', pay_rate: null, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(200)

    const { data: after } = await supabaseAdmin.from('bookings').select('pay_rate').eq('id', 'open').single()
    expect((after as { pay_rate: number | null }).pay_rate).toBe(25)
  })
})
