import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/checkout — referrers.total_earned lost-update race.
 *
 * BUG (fixed here): crediting a referrer's commission did a read-then-write —
 * SELECT the referrer's current total_earned, compute `current + commission`
 * in JS, then UPDATE with that literal. Two team members checking out two
 * DIFFERENT bookings that both credit the SAME referrer, around the same
 * time, could both read the same pre-update total and both write back
 * `stale + commission` — one commission's worth of credit silently vanishes
 * (migrations/2026_07_13_referrer_ledger_atomic.sql).
 *
 * FIX: the increment now happens inside one atomic
 * supabaseAdmin.rpc('increment_referrer_earned', ...) call. This test's fake
 * `rpc` models exactly that DB function's contract: it recomputes the live
 * total against shared mutable seed state in one synchronous pass (no
 * `await` in between), mirroring real single-statement UPDATE atomicity.
 * Firing two checkouts concurrently via Promise.all proves both commissions
 * land — the old select-then-branch code could not guarantee that.
 */

const TENANT = 'tid-a'
const TM = 'tm-1'
const REF = 'ref-1'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  seed: null as null | Harness['seed'],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    // Models migrations/2026_07_13_referrer_ledger_atomic.sql's
    // increment_referrer_earned: one indivisible read-increment-write against
    // the live row, so concurrent calls for the same referrer cannot race on
    // a stale JS-side total.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'increment_referrer_earned') throw new Error(`unexpected rpc: ${fn}`)
      const referrers = (holder.seed!.referrers ||= [])
      const ref = referrers.find((r) => r.id === args.p_referrer_id && r.tenant_id === args.p_tenant_id)
      if (!ref) return { data: null, error: { message: 'not found' } }
      ref.total_earned = (ref.total_earned || 0) + (args.p_amount_cents as number)
      return { data: { total_earned: ref.total_earned }, error: null }
    },
  },
}))

vi.mock('../auth/token', () => ({ verifyToken: () => ({ tid: TENANT, id: TM }) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    referrers: [{ id: REF, tenant_id: TENANT, total_earned: 1000, commission_rate: 0.1, email: null, name: 'Ref One' }],
    bookings: [
      { id: 'bk-1', tenant_id: TENANT, team_member_id: TM, check_in_time: null, price: 10000, referrer_id: REF, status: 'in_progress', client_id: 'c-1' },
      { id: 'bk-2', tenant_id: TENANT, team_member_id: TM, check_in_time: null, price: 20000, referrer_id: REF, status: 'in_progress', client_id: 'c-2' },
    ],
    referral_commissions: [],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.seed = h.seed
})

function post(bookingId: string) {
  return POST(
    new Request('http://t/api/team-portal/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer tok' },
      body: JSON.stringify({ booking_id: bookingId }),
    }),
  )
}

describe('team-portal/checkout — referrer total_earned race closed', () => {
  it('two concurrent checkouts crediting the same referrer both land (no lost update)', async () => {
    const [r1, r2] = await Promise.all([post('bk-1'), post('bk-2')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    // bk-1 -> $100 @ 10% = $10 (1000 cents), bk-2 -> $200 @ 10% = $20 (2000 cents)
    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_earned).toBe(1000 + 1000 + 2000)
  })

  it('positive control: a single checkout credits exactly its own commission', async () => {
    const res = await post('bk-1')
    expect(res.status).toBe(200)
    const ref = h.seed.referrers.find((r) => r.id === REF)!
    expect(ref.total_earned).toBe(1000 + 1000)
  })
})
