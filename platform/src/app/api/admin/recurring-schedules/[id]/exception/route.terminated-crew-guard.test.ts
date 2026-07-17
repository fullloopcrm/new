import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules/[id]/exception POST (type='reassign') —
 * terminated-crew guard (P1/W2 fresh-ground, gap #12 closed). Same bug class
 * as ../route.ts PUT: new_team_member_id was only checked for tenant
 * ownership. Worse here — the exception is also recorded and re-applied on
 * every future regeneration of this date, so a fired employee, once
 * assigned, would keep coming back.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [{ id: 'rs-a', tenant_id: CTX_TENANT, duration_hours: 3 }],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    recurring_exceptions: [],
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, schedule_id: 'rs-a', status: 'scheduled', start_time: '2026-08-10T09:00:00', team_member_id: 'tm-active' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://t/api/admin/recurring-schedules/rs-a/exception', json: async () => body } as unknown as Request
}
function ctx() {
  return { params: Promise.resolve({ id: 'rs-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/recurring-schedules/[id]/exception POST — terminated-crew guard', () => {
  it('BLOCKED: reassigning an occurrence to a terminated member 400s, no exception recorded, no booking touched', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: 'tm-terminated' }), ctx())
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'recurring_exceptions')).toBeUndefined()
  })

  it('CONTROL: reassigning to an active member still succeeds', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: 'tm-active' }), ctx())
    expect(res.status).toBe(200)
    const bookingUpdate = h.capture.updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate?.values.team_member_id).toBe('tm-active')
  })
})
