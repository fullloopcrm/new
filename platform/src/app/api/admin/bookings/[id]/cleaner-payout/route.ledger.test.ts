import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/bookings/[id]/cleaner-payout POST — ledger wiring.
 *
 * BUG (fixed here): this route wrote the payment method ('zelle'/'venmo'/
 * 'cashapp'/'cash'/'other') into team_member_payouts.status instead of the
 * dedicated `method` column (migration 010), and never called
 * postPayoutToLedger at all. Two knock-on effects: (1) post-labor.ts's
 * PAID_PAYOUT_STATUSES check never matched any of those strings, so a manual
 * payout could never post to the ledger even if something DID call
 * postPayoutToLedger later; (2) backfillUnpostedLabor's safety-net scan
 * filters on the same status column, so these rows were permanently invisible
 * to the cron safety net too -- every manual cleaner payout, forever, silently
 * never reached the books. Fix: `method` goes in `method`, `status` becomes
 * a real completion state ('paid'), and the route now posts to the ledger
 * itself immediately (matching the Stripe auto-payout path in webhooks/stripe
 * and payment-processor.ts).
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

const postPayoutToLedger = vi.fn(async (_opts: { tenantId: string; payoutId: string }) => ({ posted: true, entryId: 'je-1' }))
vi.mock('@/lib/finance/post-labor', () => ({
  postPayoutToLedger: (opts: { tenantId: string; payoutId: string }) => postPayoutToLedger(opts),
}))

import { POST } from './route'

function seed() {
  return {
    bookings: [{ id: 'bk-a', tenant_id: CTX_TENANT, team_member_id: 'tm-a1' }],
    team_members: [{ id: 'tm-a1', tenant_id: CTX_TENANT }],
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
  postPayoutToLedger.mockClear()
})

describe('admin/bookings/[id]/cleaner-payout POST — ledger wiring', () => {
  it('records the payment method in `method`, not `status`, and marks status paid', async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 5000, method: 'zelle' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'team_member_payouts')
    expect(insert?.rows[0].method).toBe('zelle')
    expect(insert?.rows[0].status).toBe('paid')
  })

  it('posts the newly inserted payout to the ledger', async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 5000, method: 'cash' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'team_member_payouts')
    const payoutId = insert?.rows[0].id
    expect(payoutId).toBeTruthy()
    expect(postPayoutToLedger).toHaveBeenCalledWith({ tenantId: CTX_TENANT, payoutId })
  })

  it('a ledger-posting failure does not fail the payout request (best-effort)', async () => {
    postPayoutToLedger.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(postReq({ cleaner_id: 'tm-a1', amount_cents: 5000, method: 'venmo' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
  })
})
