import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DELETE /api/team/[id] — item 118 fixed this exact bug shape on the legacy
 * `/api/cleaners/[id]` shim (unassign upcoming bookings + notify admin,
 * preserve historical team_member_id for finance/tax-export attribution).
 * But `dashboard/team/[id]/page.tsx`'s own "Remove this team member?" button
 * — the actual reachable delete path in the UI — calls DELETE /api/team/[id]
 * directly, a completely separate route that still ran the pre-fix
 * unconditional `.delete()` with none of item 118's safety: no unassignment
 * of live/upcoming bookings (a client's tech silently vanishes with no one
 * told), no `suggested_team_member_id`/`recurring_schedules` cleanup, and no
 * admin notification. Item 118 fixed the shim; the primary UI path was never
 * touched.
 *
 * Proves the fix: same unassign-upcoming-only + notify behavior as item
 * 118's /api/cleaners/[id] fix, now on the route the UI actually calls.
 */

const { notifyMock } = vi.hoisted(() => ({ notifyMock: vi.fn(async (_args: Record<string, unknown>) => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
  overridesFor: () => null,
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-A'
const MEMBER_ID = 'tech-1'

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Tommy Tech' }])
})

describe('DELETE /api/team/[id] — historical bookings keep team_member_id, only upcoming ones unassign + notify', () => {
  it('nulls team_member_id only for upcoming/in-flight bookings, leaves completed/paid/cancelled/no_show intact', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'scheduled', start_time: '2099-01-01T10:00:00Z' },
      { id: 'bk-2', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'completed', start_time: '2020-01-01T10:00:00Z' },
      { id: 'bk-3', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'paid', start_time: '2020-01-02T10:00:00Z' },
    ])

    const res = await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)

    const rows = fake._all('bookings')
    const scheduled = rows.find((r) => r.id === 'bk-1')
    const completed = rows.find((r) => r.id === 'bk-2')
    const paid = rows.find((r) => r.id === 'bk-3')
    expect(scheduled?.team_member_id).toBeNull()
    expect(completed?.team_member_id).toBe(MEMBER_ID)
    expect(paid?.team_member_id).toBe(MEMBER_ID)
  })

  it('notifies the admin with the count of upcoming bookings needing reassignment', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'scheduled', start_time: '2099-01-01T10:00:00Z' },
      { id: 'bk-2', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'confirmed', start_time: '2099-01-02T10:00:00Z' },
      { id: 'bk-3', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'completed', start_time: '2020-01-01T10:00:00Z' },
    ])

    const res = await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0][0] as Record<string, unknown>
    expect(call.recipientType).toBe('admin')
    expect(call.title).toContain('2 job')
    expect(call.message).toContain('2 upcoming booking')
  })

  it('does not notify when the deleted member had no upcoming bookings', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'completed', start_time: '2020-01-01T10:00:00Z' },
    ])

    const res = await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('clears suggested_team_member_id regardless of status and unassigns the member from recurring_schedules', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, suggested_team_member_id: MEMBER_ID, status: 'completed', start_time: '2020-01-01T10:00:00Z' },
    ])
    fake._seed('recurring_schedules', [
      { id: 'rs-1', tenant_id: TENANT_ID, team_member_id: MEMBER_ID, status: 'active' },
    ])

    const res = await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)

    expect(fake._all('bookings')[0].suggested_team_member_id).toBeNull()
    expect(fake._all('recurring_schedules')[0].team_member_id).toBeNull()
  })

  it('actually deletes the team_members row', async () => {
    const res = await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)
    expect(fake._all('team_members').find((r) => r.id === MEMBER_ID)).toBeUndefined()
  })

  it('does not touch another tenant\'s team member', async () => {
    fake._seed('team_members', [{ id: 'tech-2', tenant_id: 'tenant-B', name: 'Other Tenant Tech' }])

    await DELETE(new Request('http://x') as unknown as Request, paramsFor(MEMBER_ID))

    expect(fake._all('team_members').find((r) => r.id === 'tech-2')).toBeTruthy()
  })
})
