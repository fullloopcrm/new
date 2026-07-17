import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * referral-commissions — referrers.total_earned / total_paid lost-update race.
 *
 * BUG (fixed here): both POST (create commission -> credit total_earned) and
 * PUT (mark paid -> credit total_paid) did a read-then-write: SELECT the
 * referrer's current total, compute `current + delta` in JS, then UPDATE
 * with that literal. Two commission events for the SAME referrer landing
 * around the same time could both read the same stale total and one
 * increment would be silently lost (migrations/2026_07_13_referrer_ledger_atomic.sql).
 *
 * FIX: both paths now call one atomic supabaseAdmin.rpc(...) per ledger
 * field. This test's fake `rpc` models the DB function's contract — a single
 * synchronous read-increment-write against shared seed state, no `await` in
 * between — and proves concurrent commissions for the same referrer both land.
 */

const TENANT = 'tid-a'
const REF = 'ref-1'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  seed: null as null | Harness['seed'],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const referrers = (holder.seed!.referrers ||= [])
      const ref = referrers.find((r) => r.id === args.p_referrer_id && r.tenant_id === args.p_tenant_id)
      if (!ref) return { data: null, error: { message: 'not found' } }
      if (fn === 'increment_referrer_earned') {
        ref.total_earned = (ref.total_earned || 0) + (args.p_amount_cents as number)
        return { data: { total_earned: ref.total_earned }, error: null }
      }
      if (fn === 'increment_referrer_paid') {
        ref.total_paid = (ref.total_paid || 0) + (args.p_amount_cents as number)
        return { data: { total_paid: ref.total_paid }, error: null }
      }
      throw new Error(`unexpected rpc: ${fn}`)
    },
  },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return {
    ...actual,
    // POST/PUT are now behind requirePermission('referrals.create'/'referrals.payout')
    // (see route.isolation.test.ts) — role:'owner' keeps this race-condition test
    // exercising the atomic-increment fix, not the unrelated permission gate.
    getTenantForRequest: async () => ({ tenantId: TENANT, tenant: { id: TENANT }, role: 'owner' }),
  }
})
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(async () => ({ posted: false })),
  postCommissionPayment: vi.fn(async () => ({ posted: false })),
}))

import { POST, PUT } from './route'

function seed() {
  return {
    referrers: [{ id: REF, tenant_id: TENANT, name: 'Ref One', email: null, commission_rate: 0.1, total_earned: 1000, total_paid: 0 }],
    bookings: [
      { id: 'bk-1', tenant_id: TENANT, price: 10000, referrer_id: REF, clients: { name: 'Client One' } },
      { id: 'bk-2', tenant_id: TENANT, price: 20000, referrer_id: REF, clients: { name: 'Client Two' } },
    ],
    referral_commissions: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.seed = h.seed
})

function post(bookingId: string) {
  return POST(new Request('http://t/api/referral-commissions', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) }))
}

function put(id: string, status: string) {
  return PUT(new Request('http://t/api/referral-commissions', { method: 'PUT', body: JSON.stringify({ id, status }) }))
}

describe('referral-commissions POST — referrer total_earned race closed', () => {
  it('two concurrent commission creations for the same referrer both land (no lost update)', async () => {
    const [r1, r2] = await Promise.all([post('bk-1'), post('bk-2')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    // bk-1 -> $100 @ 10% = 1000 cents, bk-2 -> $200 @ 10% = 2000 cents
    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_earned).toBe(1000 + 1000 + 2000)
  })
})

describe('referral-commissions PUT — referrer total_paid race closed', () => {
  it('two concurrent mark-paid calls for different commissions of the same referrer both land', async () => {
    h.seed.referral_commissions.push(
      { id: 'comm-1', tenant_id: TENANT, referrer_id: REF, commission_cents: 500, status: 'pending' },
      { id: 'comm-2', tenant_id: TENANT, referrer_id: REF, commission_cents: 700, status: 'pending' },
    )

    const [r1, r2] = await Promise.all([put('comm-1', 'paid'), put('comm-2', 'paid')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_paid).toBe(500 + 700)
  })
})

describe('referral-commissions PUT — SAME-commission double mark-paid no longer double-counts', () => {
  /**
   * BUG (fixed here): marking a commission 'paid' unconditionally called
   * increment_referrer_paid whenever the request body said status:'paid' --
   * with no check on the commission's CURRENT status first. The atomic RPC
   * above only closes the lost-update race between DIFFERENT commissions; it
   * does nothing to stop the SAME commission being marked paid twice (a
   * double-click, or a client retry after a slow/dropped response) from
   * incrementing total_paid twice for money that was only ever disbursed
   * once. postCommissionPayment's own idempotency protects the real ledger
   * entry, but the referrer's total_paid stat -- which operators reconcile
   * against actual disbursements -- would silently drift high.
   */
  it('double-clicking mark-paid on the SAME commission increments total_paid exactly once', async () => {
    h.seed.referral_commissions.push(
      { id: 'comm-3', tenant_id: TENANT, referrer_id: REF, commission_cents: 900, status: 'pending' },
    )

    const [r1, r2] = await Promise.all([put('comm-3', 'paid'), put('comm-3', 'paid')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_paid).toBe(900)

    const commission = h.seed.referral_commissions.find((c) => c.id === 'comm-3')!
    expect(commission.status).toBe('paid')
  })

  it('a sequential retry after the first call already succeeded is a no-op on total_paid', async () => {
    h.seed.referral_commissions.push(
      { id: 'comm-4', tenant_id: TENANT, referrer_id: REF, commission_cents: 300, status: 'pending' },
    )

    const first = await put('comm-4', 'paid')
    expect(first.status).toBe(200)
    const second = await put('comm-4', 'paid')
    expect(second.status).toBe(200)

    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_paid).toBe(300)
  })
})
