import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules/[id] PUT — cross-tenant team_member_id regression test.
 *
 * BUG (fixed here): a caller-supplied `team_member_id` (or its `cleaner_id` alias)
 * was written straight into `recurring_schedules.team_member_id` — and propagated
 * into future `bookings.team_member_id` — with no check that it belonged to the
 * acting tenant. `team_members` has no tenant-scoped composite key, so any
 * tenant's team member id was accepted. A tenant admin could reassign a recurring
 * schedule (and its upcoming bookings) to ANOTHER tenant's employee.
 *
 * FIX: a supplied team_member_id is now validated against team_members scoped to
 * the tenant before the update runs; a foreign id 400s.
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

import { PUT } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, client_id: 'c-a', team_member_id: null, recurring_type: 'weekly' },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT },
      { id: 'tm-b1', tenant_id: OTHER_TENANT },
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

describe('admin/recurring-schedules/[id] PUT — cross-tenant team_member_id guard', () => {
  it('cross-tenant team_member_id probe: rejects a foreign team member id with 400', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-b1' }), ctx())
    expect(res.status).toBe(400)
    const update = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(update).toBeUndefined()
  })

  it('cross-tenant cleaner_id alias probe: also rejects a foreign id with 400', async () => {
    const res = await PUT(putReq({ cleaner_id: 'tm-b1' }), ctx())
    expect(res.status).toBe(400)
    const update = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(update).toBeUndefined()
  })

  it('same-tenant team_member_id succeeds', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-a1' }), ctx())
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(update?.values.team_member_id).toBe('tm-a1')
  })

  it('omitting team_member_id still updates other fields successfully', async () => {
    const res = await PUT(putReq({ notes: 'updated' }), ctx())
    expect(res.status).toBe(200)
  })
})
