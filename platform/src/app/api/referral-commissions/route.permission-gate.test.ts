/**
 * GET (admin-session)/POST/PUT /api/referral-commissions --
 * referrals.view / referrals.create / referrals.payout gate.
 *
 * All three called getTenantForRequest() directly with zero permission
 * check. Per rbac.ts: 'staff' has none of the referrals permissions, and
 * neither 'staff' nor 'manager' has referrals.create/referrals.payout (only
 * admin/owner do). So any authenticated tenant member with a valid PIN
 * session -- including staff -- could list every commission for the tenant
 * (GET), mint a commission for any booking (POST), or mark a commission
 * 'paid' and bump referrer.total_paid + post a real payment to the finance
 * ledger (PUT), regardless of the tenant's own RBAC customization.
 *
 * Same bug class already closed on the sibling GET/POST /api/referrals and
 * GET /api/referrers/analytics this session -- this file was the missed
 * sibling. The GET ?referrer_id= branch (external referrer's own session
 * token, a separate auth mechanism) is untouched and not covered here --
 * see route.get-auth-gate.test.ts for that path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'u1',
    tenantId: roleHolder.tenantId,
    tenant: { id: roleHolder.tenantId },
    role: roleHolder.role,
  })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(() => Promise.resolve({ posted: true })),
  postCommissionPayment: vi.fn(() => Promise.resolve({ posted: true })),
}))

import { GET, POST, PUT } from './route'

const getReq = () => new Request('http://x/api/referral-commissions')
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    bookings: [
      { id: 'booking-1', tenant_id: 'tenant-A', price: 10000, referrer_id: 'referrer-1', clients: { name: 'Jane' } },
    ],
    referrers: [
      { id: 'referrer-1', tenant_id: 'tenant-A', name: 'Ref Co', email: null, commission_rate: 0.10, total_earned: 0, total_paid: 0 },
    ],
    referral_commissions: [
      { id: 'comm-1', tenant_id: 'tenant-A', referrer_id: 'referrer-1', commission_cents: 1000, status: 'pending' },
    ],
  }
})

describe('GET /api/referral-commissions (admin session) -- referrals.view gate', () => {
  it('owner (has referrals.view) can list commissions', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' role (no referrals permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })
})

describe('POST /api/referral-commissions -- referrals.create gate', () => {
  it('owner (has referrals.create) can create a commission', async () => {
    const res = await POST(postReq({ booking_id: 'booking-1' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' role is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await POST(postReq({ booking_id: 'booking-1' }))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'manager' role (referrals.view only, no referrals.create) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST(postReq({ booking_id: 'booking-1' }))
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/referral-commissions (mark paid) -- referrals.payout gate', () => {
  it('owner (has referrals.payout) can mark a commission paid', async () => {
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' role is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'manager' role (referrals.view only, no referrals.payout) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    expect(res.status).toBe(403)
  })
})
