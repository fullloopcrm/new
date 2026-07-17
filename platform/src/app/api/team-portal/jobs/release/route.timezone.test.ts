import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/team-portal/jobs/release — the admin push announcing a released
 * job ("released Jane's job (Aug 10, 1:00 AM) back to the open pool")
 * rendered `start_time` with `toLocaleString` and no `timeZone` option — same
 * UTC-implicit bug class as items (70)/(115)/(117), just in a file added
 * after that sweep. Directly archetype-relevant: a same-day emergency
 * release mid-shift is exactly the case where the wrong hour/date is most
 * costly to an admin trying to re-dispatch it. Proves the fix: the push now
 * shows the tenant's own Pacific date/time, not the UTC one.
 */

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(async (..._args: unknown[]) => true),
}))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: pushMock }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))

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
import { POST } from './route'

const TID = 'tenant-release-tz'
const MEMBER_ID = 'tm-1'
// 2026-08-10T05:00:00Z = Aug 10, 1:00 AM Eastern but still Aug 9, 10:00 PM
// in America/Los_Angeles — a timestamp only a real Pacific-zone render gets
// right; the old bare toLocaleString would show Aug 10.
const START_TIME = '2026-08-10T05:00:00.000Z'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(booking_id: string) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id }) }))
}

beforeEach(() => {
  fake._store.clear()
  pushMock.mockClear()
  currentAuth = { id: MEMBER_ID, tid: TID, role: 'tech' }
  fake._seed('tenants', [{ id: TID, timezone: 'America/Los_Angeles' }])
  fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TID, name: 'Sam Tech' }])
  fake._seed('bookings', [
    { id: 'bk-1', tenant_id: TID, team_member_id: MEMBER_ID, status: 'confirmed', is_emergency: true, start_time: START_TIME, clients: { name: 'Jane Doe' } },
  ])
})

describe('team-portal/jobs/release — admin push renders in the tenant\'s own timezone', () => {
  it('shows the Pacific calendar date/time, not the UTC one', async () => {
    const res = await post('bk-1')
    expect(res.status).toBe(200)
    expect(pushMock).toHaveBeenCalledTimes(1)
    const [, , body] = pushMock.mock.calls[0] as [string, string, string, string]
    expect(body).toContain('Aug 9')
    expect(body).toContain('10:00 PM')
    expect(body).not.toContain('Aug 10')
    expect(body).not.toContain('1:00 AM')
  })
})
