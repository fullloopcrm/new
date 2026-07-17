import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/schedules — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same gap class as the already-fixed bookings/team/job-session routes
 * (86b797ad, 53e83ee4, ca14a7fe): this route never checked hr_status before
 * assigning team_member_id. Distinct from the already-known /api/admin/
 * recurring-schedules gap (deliberately deferred, admin-configured, lower
 * frequency) -- this is the live dashboard "Schedules" page
 * (src/app/dashboard/schedules/page.tsx) and it immediately generates 4 real
 * weeks of `bookings` on create, so a terminated worker picked here gets
 * silently booked onto real future jobs today, not just a stale config row.
 *
 * FIX: team_member_id now runs through getTerminatedTeamMemberIds right
 * after the existing tenant-ownership check, before the schedule/bookings
 * inserts.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    clients: [{ id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client' }],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry' },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
})

describe('schedules POST — terminated-crew guard', () => {
  it('BLOCKED: assigning a terminated team member 400s, no schedule or booking inserted', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-terminated', recurring_type: 'weekly' }),
    )
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: assigning an active team member still creates the schedule + bookings', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-active', recurring_type: 'weekly' }),
    )
    expect(res.status).toBe(201)
    const schedule = h.capture.inserts.find((i) => i.table === 'recurring_schedules')!.rows[0]
    expect(schedule.team_member_id).toBe('tm-active')
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')!
    expect(bookingInsert.rows[0].team_member_id).toBe('tm-active')
  })

  it('CONTROL: no team_member_id at all still creates the schedule (unassigned is allowed)', async () => {
    const res = await POST(postReq({ client_id: 'client-a', recurring_type: 'weekly' }))
    expect(res.status).toBe(201)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeDefined()
  })
})
