import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/team-portal/jobs/release — a tech handing their own job back to
 * the open pool fired zero notifications, unlike its sibling /reassign (which
 * already pushes both the outgoing and incoming tech). A job silently
 * dropping back to unassigned had no admin-facing signal at all — the exact
 * "nobody knows this job needs a new tech" gap items (4)/(18)/(20) already
 * documented for other paths in this dispatch chain. Proves the fix: an admin
 * push fires on every successful release, escalating wording for a same-day
 * emergency the same way schedule-monitor's unassigned check already does.
 */

const { sendPushToTenantAdminsMock } = vi.hoisted(() => ({
  sendPushToTenantAdminsMock: vi.fn(async (..._args: unknown[]) => {}),
}))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: sendPushToTenantAdminsMock }))

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

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(booking_id: string): Promise<Response> {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id }) }) as unknown as Request)
}

beforeEach(() => {
  fake._store.clear()
  sendPushToTenantAdminsMock.mockClear()
  currentAuth = { id: 'tech-1', tid: TID, role: 'field' }
  fake._seed('team_members', [{ id: 'tech-1', tenant_id: TID, name: 'Sam Rivera', status: 'active' }])
})

describe('team-portal/jobs/release — admin notification', () => {
  it('pushes a plain "Job Released" alert to admins for a routine job', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TID, team_member_id: 'tech-1', status: 'confirmed', is_emergency: false, start_time: '2099-01-15T10:00:00', clients: { name: 'Jane Doe' } },
    ])
    const res = await post('bk-1')
    expect(res.status).toBe(200)
    expect(sendPushToTenantAdminsMock).toHaveBeenCalledTimes(1)
    const [tenantId, title, body] = sendPushToTenantAdminsMock.mock.calls[0] as [string, string, string, string]
    expect(tenantId).toBe(TID)
    expect(title).toBe('Job Released')
    expect(body).toContain('Sam Rivera')
    expect(body).toContain('Jane Doe')
  })

  it('escalates to an emergency-worded push when the released job is_emergency', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TID, team_member_id: 'tech-1', status: 'confirmed', is_emergency: true, start_time: '2099-01-15T10:00:00', clients: { name: 'Burst Pipe LLC' } },
    ])
    const res = await post('bk-2')
    expect(res.status).toBe(200)
    expect(sendPushToTenantAdminsMock).toHaveBeenCalledTimes(1)
    const [, title] = sendPushToTenantAdminsMock.mock.calls[0] as [string, string, string, string]
    expect(title).toBe('🚨 Emergency Job Released')
  })

  it('does not push when the release itself is rejected (not this tech\'s job)', async () => {
    fake._seed('bookings', [
      { id: 'bk-3', tenant_id: TID, team_member_id: 'someone-else', status: 'confirmed', is_emergency: false, start_time: '2099-01-15T10:00:00', clients: { name: 'Jane Doe' } },
    ])
    const res = await post('bk-3')
    expect(res.status).toBe(403)
    expect(sendPushToTenantAdminsMock).not.toHaveBeenCalled()
  })
})
