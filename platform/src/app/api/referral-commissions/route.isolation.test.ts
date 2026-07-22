import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * referral-commissions POST/PUT — permission isolation.
 *
 * BUG (fixed here): both routes move real money (POST accrues a commission +
 * bumps referrer.total_earned; PUT status='paid' posts a ledger payment +
 * bumps referrer.total_paid) but only checked getTenantForRequest() (any
 * authenticated role) instead of a real permission, unlike the sibling
 * referrals/[id]/route.ts PUT (requires 'referrals.payout' for the identical
 * mark-paid action). A 'staff' role (rbac.ts grants none of referrals.*) or
 * 'manager' role (referrals.view only) could create/accrue commissions and
 * mark them paid directly via the API.
 *
 * FIX: requirePermission('referrals.create') on POST,
 *      requirePermission('referrals.payout') on PUT.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t), rpc: vi.fn(async () => ({ data: null, error: null })) },
}))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(async () => {}),
  postCommissionPayment: vi.fn(async () => {}),
}))

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff'/'manager' role is denied by the ACTUAL permission table, not a stub.
import { POST, PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 10000, referrer_id: 'rf-a' },
      { id: 'bk-b', tenant_id: A, price: 20000, referrer_id: 'rf-a' },
    ],
    // stripe_ineligible_at set: this suite is about permission/tenant
    // isolation, not payout-method policy -- an un-ineligible, un-connected
    // referrer can no longer be marked paid at all since 2026-07-22
    // (CHANNEL.md 16:35/16:55).
    referrers: [{ id: 'rf-a', tenant_id: A, name: 'Ref A', email: 'r@x.com', commission_rate: 0.1, total_earned: 0, stripe_ineligible_at: '2026-01-01T00:00:00.000Z' }],
    referral_commissions: [{ id: 'rc-a', tenant_id: A, booking_id: 'bk-a', referrer_id: 'rf-a', commission_cents: 1000, status: 'pending' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('referral-commissions POST — permission isolation', () => {
  it('owner can create a commission', async () => {
    const res = await POST(req({ booking_id: 'bk-b' }))
    expect(res.status).toBe(200)
    expect(h.capture.inserts.find((i) => i.table === 'referral_commissions')).toBeDefined()
  })

  it("PERMISSION PROBE: 'staff' role (no referrals.create) is forbidden and nothing is inserted", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ booking_id: 'bk-b' }))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'referral_commissions')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (referrals.view only) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req({ booking_id: 'bk-b' }))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'referral_commissions')).toBeUndefined()
  })
})

describe('referral-commissions PUT — permission isolation', () => {
  it('owner can mark a commission paid', async () => {
    const res = await PUT(req({ id: 'rc-a', status: 'paid' }))
    expect(res.status).toBe(200)
    expect(h.capture.updates.find((u) => u.table === 'referral_commissions')).toBeDefined()
  })

  it("PERMISSION PROBE: 'staff' role (no referrals.payout) is forbidden and nothing is updated", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(req({ id: 'rc-a', status: 'paid' }))
    expect(res.status).toBe(403)
    expect(h.capture.updates.find((u) => u.table === 'referral_commissions')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (referrals.view only) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await PUT(req({ id: 'rc-a', status: 'paid' }))
    expect(res.status).toBe(403)
    expect(h.capture.updates.find((u) => u.table === 'referral_commissions')).toBeUndefined()
  })
})
