import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules/[id] PUT — terminated-crew guard (P1/W2
 * fresh-ground, gap #12 closed). Same bug class as ../route.ts POST: a
 * caller-supplied team_member_id was only checked for tenant ownership, never
 * HR termination, so reassigning an existing series to a fired employee
 * silently succeeded and generate-recurring would keep re-materializing them
 * onto future bookings every week.
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

import { PUT } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, client_id: 'c-a', team_member_id: null, recurring_type: 'weekly' },
    ],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://t/api/admin/recurring-schedules/rs-a', json: async () => body } as unknown as Request
}
function ctx() {
  return { params: Promise.resolve({ id: 'rs-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/recurring-schedules/[id] PUT — terminated-crew guard', () => {
  it('BLOCKED: reassigning to a terminated team member 400s, no update applied', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-terminated' }), ctx())
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'recurring_schedules')).toBeUndefined()
  })

  it('CONTROL: an active team member still succeeds', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-active' }), ctx())
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(update?.values.team_member_id).toBe('tm-active')
  })
})
