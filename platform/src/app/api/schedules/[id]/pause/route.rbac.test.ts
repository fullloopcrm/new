import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST+DELETE /api/schedules/[id]/pause — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'schedules.edit' for this resource and the sibling
 * schedules/[id]/route.ts PUT/DELETE already gate behind it (P77). This
 * route was missed in that pass — same shape, same resource family.
 *
 * NOT override-only: by default rbac.ts grants 'schedules.edit' to
 * owner/admin/manager only — 'staff' gets neither — so this was live against
 * the hard-coded defaults (same class as P72/P76/P77): any staff-tier member
 * could already pause a recurring schedule (cancelling its upcoming bookings
 * and texting the client) or resume one with zero role check, no override
 * needed.
 *
 * FIX: requirePermission('schedules.edit') on both POST and DELETE,
 * matching schedules/[id]/route.ts's sibling gates.
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

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST, DELETE } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a1', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: undefined },
    ],
    bookings: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function pauseReq(paused_until = '2026-09-01') {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ paused_until }) })
}

describe('POST /api/schedules/[id]/pause — permission probe', () => {
  it('owner (has schedules.edit) can pause a schedule', async () => {
    const res = await POST(pauseReq(), params('sch-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from pausing a schedule", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(pauseReq(), params('sch-a1'))
    expect(res.status).toBe(403)
    const schedule = h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!
    expect(schedule.status).toBe('active')
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.edit' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'schedules.edit': false } } },
    }
    const res = await POST(pauseReq(), params('sch-a1'))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/schedules/[id]/pause — permission probe', () => {
  it('owner (has schedules.edit) can resume a schedule', async () => {
    h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!.status = 'paused'
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from resuming a schedule", async () => {
    h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!.status = 'paused'
    tenantHolder.role = 'staff'
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(403)
    const schedule = h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!
    expect(schedule.status).toBe('paused')
  })
})
