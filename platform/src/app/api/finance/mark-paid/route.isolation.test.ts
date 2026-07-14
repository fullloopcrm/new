import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/mark-paid POST — tenant isolation.
 *
 * BUG (fixed here): booking_id is a caller-supplied FK. The tenant-scoped
 * update silently no-op'd (no error) on a foreign booking_id -- Supabase
 * returns no error when zero rows match a filter -- yet the route still
 * returned `{success:true}` without checking a row was actually updated.
 * Same response-honesty class as the attribution/manual fix (6e5c78d4).
 *
 * FIX: chain .select().single() on the update so a foreign booking_id
 * 404s instead of a false success.
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

vi.mock('@/lib/finance/post-revenue', () => ({
  postPaymentRevenue: vi.fn(async () => ({ posted: true })),
}))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, payment_status: 'pending', team_member_paid: false, price: 10000, client_id: 'c-a' },
      { id: 'bk-b', tenant_id: OTHER_TENANT, payment_status: 'pending', team_member_paid: false, price: 10000, client_id: 'c-b' },
    ],
    payments: [],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/mark-paid POST — tenant isolation', () => {
  it('positive control: same-tenant booking_id flips team_member_paid and returns success', async () => {
    const res = await POST(postReq({ booking_id: 'bk-a', type: 'cleaner' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    const own = h.seed.bookings.find((b) => b.id === 'bk-a')
    expect(own!.team_member_paid).toBe(true)
  })

  it("wrong-tenant probe: a foreign booking_id 404s instead of a false success, and is never mutated", async () => {
    const res = await POST(postReq({ booking_id: 'bk-b', type: 'cleaner' }))
    expect(res.status).toBe(404)
    const foreign = h.seed.bookings.find((b) => b.id === 'bk-b')
    expect(foreign!.team_member_paid).toBe(false)
  })

  it("wrong-tenant probe (client type): a foreign booking_id 404s and no payment row is planted", async () => {
    const res = await POST(postReq({ booking_id: 'bk-b', type: 'client' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'payments')).toBeUndefined()
  })
})
