import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules POST — terminated-crew guard (P1/W2 fresh-ground,
 * gap #12 closed).
 *
 * BUG (fixed here): a caller-supplied team_member_id/cleaner_id was only
 * checked for tenant ownership, never for HR termination. HR termination
 * never touches team_members.status/active (deliberate — see hr.ts), so a
 * fired employee could be assigned a brand-new recurring series here — which
 * the generate-recurring cron would then keep re-materializing onto future
 * bookings every week, forever. Same bug class already fixed on the primary/
 * project booking flows and the job-session routes (53e83ee4).
 *
 * FIX: team_member_id now also runs through getTerminatedTeamMemberIds,
 * right after the existing tenant-ownership check.
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
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

import { POST } from './route'

function seed() {
  return {
    clients: [{ id: 'c-a', tenant_id: CTX_TENANT }],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    recurring_schedules: [],
    bookings: [],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://t/api/admin/recurring-schedules', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/recurring-schedules POST — terminated-crew guard', () => {
  it('BLOCKED: assigning a terminated team member 400s, no schedule or bookings created', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', team_member_id: 'tm-terminated', recurring_type: 'weekly', start_date: '2026-08-10', dates: ['2026-08-10'],
    }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: an active team member still succeeds', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', team_member_id: 'tm-active', recurring_type: 'weekly', start_date: '2026-08-10', dates: ['2026-08-10'],
    }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(insert?.rows[0]?.team_member_id).toBe('tm-active')
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not blocked here', async () => {
    h.seed.hr_employee_profiles.push({ id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated' })
    const res = await POST(postReq({
      client_id: 'c-a', team_member_id: 'tm-active', recurring_type: 'weekly', start_date: '2026-08-10', dates: ['2026-08-10'],
    }))
    expect(res.status).toBe(200)
  })
})
