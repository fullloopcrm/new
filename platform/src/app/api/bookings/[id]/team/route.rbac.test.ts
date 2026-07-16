import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/bookings/[id]/team — permission gate.
 *
 * BUG (fixed here): the handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling PUT /api/bookings/[id] (general booking edit) already requires
 * requirePermission('bookings.edit') and this route performs an equivalent
 * mutation (reassigning a booking's lead/extra team members). By default
 * rbac.ts grants 'staff' 'bookings.view'/'bookings.create' but NOT
 * 'bookings.edit' — so any staff-tier member could already reassign a
 * booking's crew with zero role check, no override needed.
 *
 * FIX: requirePermission('bookings.edit') on PUT, matching the sibling
 * PUT /api/bookings/[id] convention. GET (read-only) is left unguarded,
 * matching every other booking GET in this codebase (bookings.view is not
 * currently enforced on any booking read endpoint).
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async () => ({ teamMemberName: 'x' })),
  formatDeliveryReport: vi.fn(() => 'delivered'),
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: vi.fn(() => 'sms') }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-1', tenant_id: A, start_time: '2026-07-20T10:00:00Z', team_member_id: null, team_size: 1 },
    ],
    booking_team_members: [],
    team_members: [],
    tenants: [{ id: A, name: 'Test Co' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function req() {
  return new Request('http://t/api/bookings/bk-1/team', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: null, extra_team_member_ids: [], team_size: 1 }),
  })
}

describe('PUT /api/bookings/[id]/team — permission probe', () => {
  it('owner (has bookings.edit) can reassign the booking team', async () => {
    const res = await PUT(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("'manager' (has bookings.edit per default rbac.ts) can reassign the booking team", async () => {
    tenantHolder.role = 'manager'
    const res = await PUT(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (has bookings.view/create but NOT bookings.edit per default rbac.ts) is forbidden from reassigning the booking team", async () => {
    tenantHolder.role = 'staff'
    const res = await PUT(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'bookings.edit' from manager via a role_permissions override blocks PUT for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'bookings.edit': false } } },
    }
    const res = await PUT(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })
})
