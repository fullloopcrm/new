import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/bookings/[id]/cleaner-payout POST — tenant isolation.
 *
 * BUG (fixed here): same class as the sibling closeout-summary GET. This
 * route lives behind the GLOBAL /dashboard bookings closeout widget, reached
 * by every tenant's own admin — but was gated on requireAdmin() (platform
 * super_admin only, 401s every ordinary tenant), and its booking lookup
 * carried no tenant_id filter. Once reachable, a caller could pass ANOTHER
 * tenant's booking id to insert a payout row into that tenant's books and
 * flip THEIR booking's team_member_paid flag using the caller's own
 * (unrelated) session. The team_member_id was also accepted with no
 * ownership check, a caller-supplied-FK gap matching the rest of this pass's
 * bug class.
 *
 * FIX: requirePermission('bookings.edit'), tenant-scoped booking lookup,
 * tenant-scoped team_member ownership check before the payout insert.
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
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, team_member_id: 'tm-a1' },
      { id: 'bk-b', tenant_id: OTHER_TENANT, team_member_id: 'tm-b1' },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT },
      { id: 'tm-b1', tenant_id: OTHER_TENANT },
    ],
    team_member_payouts: [],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/bookings/[id]/cleaner-payout POST — tenant isolation', () => {
  it('positive control: same-tenant booking + same-tenant cleaner_id records a payout and flips the booking paid', async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 5000, method: 'zelle' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'team_member_payouts')
    expect(insert?.rows[0].tenant_id).toBe(CTX_TENANT)
    const bookingUpdate = h.capture.updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate?.values.team_member_paid).toBe(true)
    expect(bookingUpdate?.matched.every((r) => r.tenant_id === CTX_TENANT)).toBe(true)
  })

  it("wrong-tenant probe: another tenant's booking id 404s, no payout inserted, no foreign booking touched", async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 5000, method: 'zelle' }), ctx('bk-b'))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'team_member_payouts')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
  })

  it("cross-tenant team_member_id probe: a foreign cleaner_id 404s even against the caller's own booking", async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-b1', amount_cents: 5000, method: 'zelle' }), ctx('bk-a'))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'team_member_payouts')).toBeUndefined()
  })

  it('rejects a missing/invalid amount before touching the database', async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 0 }), ctx('bk-a'))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'team_member_payouts')).toBeUndefined()
  })
})
