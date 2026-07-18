import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DAILY-CAP TOCTOU RACE — flagged in deploy-prep/toctou-audit-p1-w3.md
 * (2026-07-13) and left explicitly unfixed: the daily `max_jobs_per_day` cap
 * was enforced via a plain COUNT-then-decide read, separate from the atomic
 * `team_member_id IS NULL` claim UPDATE. Two near-simultaneous claims for two
 * DIFFERENT open bookings by the SAME member could both read the same
 * pre-claim count and both pass the cap check, landing the member over cap.
 *
 * Fixed via claim_open_job() (2026_07_18_claim_open_job_atomic.sql) — the cap
 * count and the claim UPDATE now run inside one DB transaction, serialized by
 * a FOR UPDATE lock on the member's own row.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const { fakeClaimOpenJobRpc } = await import('./claim-open-job-rpc-fake')
  return { supabaseAdmin: { ...fake, rpc: fakeClaimOpenJobRpc(fake) } }
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

// The route's cap window is [today 00:00, tomorrow 00:00) in real wall-clock
// time (`new Date()`), so fixture bookings must fall on the actual current
// day, not a fixed future date like the overlap-guard tests use.
function todayAt(hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toISOString().slice(0, 19)
}

beforeEach(() => {
  fake._store.clear()
  clearSettingsCache()
  currentAuth = { id: 'tm-1', tid: TID, role: 'worker' }
  fake._seed('tenants', [{ id: TID, booking_buffer_minutes: 0 }])
  fake._seed('team_members', [{ id: 'tm-1', tenant_id: TID, pay_rate: 25, max_jobs_per_day: 1, status: 'active' }])
  fake._seed('service_types', [])
})

describe('team-portal/jobs/claim — daily cap race', () => {
  it('rejects a single claim once the member is already at cap', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'confirmed', start_time: todayAt(9), end_time: todayAt(10), pay_rate: null },
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: todayAt(15), end_time: todayAt(16), pay_rate: null },
    ])

    const res = await post('open')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/Daily job limit reached \(1\)/)
  })

  it('two concurrent claims for two DIFFERENT open bookings by the same member: exactly one succeeds, not both', async () => {
    fake._seed('bookings', [
      { id: 'open-a', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: todayAt(9), end_time: todayAt(10), pay_rate: null },
      { id: 'open-b', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: todayAt(15), end_time: todayAt(16), pay_rate: null },
    ])

    const [r1, r2] = await Promise.all([post('open-a'), post('open-b')])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])

    const claimedCount = fake._all('bookings').filter((b) => b.team_member_id === 'tm-1').length
    expect(claimedCount).toBe(1)
  })

  it('a released cap slot can be reused (cap check is live, not one-shot)', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'cancelled', start_time: todayAt(9), end_time: todayAt(10), pay_rate: null },
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: todayAt(15), end_time: todayAt(16), pay_rate: null },
    ])

    const res = await post('open')
    expect(res.status).toBe(200)
  })
})
