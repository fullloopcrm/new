import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/schedule-issues/fix — permission gate.
 *
 * BUG (fixed here): the handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, despite
 * `apply: true` writing directly to `bookings.price` (price_mismatch fix)
 * and `bookings.team_member_id`/`status` (day_off fix) — a real money/
 * assignment mutation, same class as P81/P82's payment/finance gaps.
 *
 * NOT override-only: by default rbac.ts grants 'schedules.edit' to
 * owner/admin/manager only — 'staff' gets neither — so any staff-tier
 * member could already rewrite a booking's price or unassign/reassign its
 * team member via this endpoint, with zero role check, no override needed.
 *
 * FIX: requirePermission('schedules.edit'), matching the sibling
 * schedule-issues/route.ts PUT gate.
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

import { POST } from './route'

function seed() {
  return {
    schedule_issues: [
      {
        id: 'iss-a1', tenant_id: A, type: 'price_mismatch', message: 'x',
        booking_id: 'bk-a1', team_member_id: null, status: 'open',
      },
    ],
    bookings: [
      {
        id: 'bk-a1', tenant_id: A,
        start_time: '2026-07-20T09:00', end_time: '2026-07-20T11:00',
        price: 5000, hourly_rate: 30, team_member_id: 'tm-1', status: 'confirmed',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function postReq(body: Record<string, unknown>) {
  return new Request('http://t/api/admin/schedule-issues/fix', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/schedule-issues/fix — permission probe', () => {
  it('owner (has schedules.edit) can apply a fix (price correction)', async () => {
    const res = await POST(postReq({ id: 'iss-a1', apply: true }))
    expect(res.status).toBe(200)
    expect(h.seed.bookings[0].price).toBe(6000) // 2hrs * $30/hr
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from applying a fix, and the booking price is not mutated", async () => {
    tenantHolder.role = 'staff'
    const beforePrice = h.seed.bookings[0].price
    const res = await POST(postReq({ id: 'iss-a1', apply: true }))
    expect(res.status).toBe(403)
    expect(h.seed.bookings[0].price).toBe(beforePrice)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.edit' from admin via override blocks the fix for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'schedules.edit': false } } },
    }
    const res = await POST(postReq({ id: 'iss-a1', apply: true }))
    expect(res.status).toBe(403)
  })
})
