import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules/[id]/exception POST — cross-tenant new_team_member_id
 * regression test.
 *
 * BUG (fixed here): a caller-supplied `new_team_member_id` on a 'reassign'
 * exception was written straight into `recurring_exceptions.new_team_member_id`
 * and the matching occurrence's `bookings.team_member_id` — with no check that
 * it belonged to the acting tenant. `team_members` has no tenant-scoped
 * composite key, so any tenant's team member id was accepted. A tenant admin
 * could reassign a single occurrence's booking to ANOTHER tenant's employee.
 * Same bug class already fixed in ../route.ts PUT.
 *
 * FIX: a supplied new_team_member_id is now validated against team_members
 * scoped to the tenant before the upsert/update runs; a foreign id 400s.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, duration_hours: 3 },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT },
      { id: 'tm-b1', tenant_id: OTHER_TENANT },
    ],
    recurring_exceptions: [],
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, schedule_id: 'rs-a', status: 'scheduled', start_time: '2026-08-10T09:00:00', team_member_id: 'tm-a1' },
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

describe('admin/recurring-schedules/[id]/exception POST — cross-tenant new_team_member_id guard', () => {
  it('cross-tenant new_team_member_id probe: rejects a foreign team member id with 400', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: 'tm-b1' }), ctx())
    expect(res.status).toBe(400)
    const bookingUpdate = h.capture.updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate).toBeUndefined()
    const exceptionUpsert = h.capture.updates.find((u) => u.table === 'recurring_exceptions')
    expect(exceptionUpsert).toBeUndefined()
  })

  it('same-tenant new_team_member_id succeeds and reassigns the materialized booking', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: 'tm-a1' }), ctx())
    expect(res.status).toBe(200)
    const bookingUpdate = h.capture.updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate?.values.team_member_id).toBe('tm-a1')
  })
})
