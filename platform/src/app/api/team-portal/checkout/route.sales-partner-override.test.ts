import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Verifies the stacked referrer + sales-partner-override commission payout:
 * a sales partner shares their "recruit a referrer" link (?ref=<partner code>
 * on /referral/signup), the referrer signs up with
 * referrers.recruited_by_sales_partner_id set to that partner, and when a
 * client books through THAT REFERRER's own link and the job checks out, both
 * sides should get paid independently on the same booking:
 *   - the referrer earns their own commission_rate (referral_commissions)
 *   - the recruiting sales partner earns an 'override' commission at THEIR
 *     OWN commission_rate (sales_partner_commissions) -- not a fixed rate,
 *     whatever tier the partner is on.
 * See src/app/api/team-portal/checkout/route.ts's "Sales partner commission"
 * block, which explicitly documents these as two independent, stackable
 * payouts on the same booking.
 */

const TENANT = 'tid-a'
const TM = 'tm-1'
const REF = 'ref-1'
const PARTNER = 'sp-1'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  seed: null as null | Harness['seed'],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
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
vi.mock('@/lib/sales-partner-ledger', () => ({ bumpSalesPartnerTotalOrFlag: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    referrers: [
      {
        id: REF,
        tenant_id: TENANT,
        total_earned: 0,
        commission_rate: 0.10,
        recruited_by_sales_partner_id: PARTNER,
        email: null,
        name: 'Recruited Referrer',
      },
    ],
    sales_partners: [
      {
        id: PARTNER,
        tenant_id: TENANT,
        active: true,
        commission_rate: 0.10, // standard tier
        email: null,
        name: 'Recruiting Partner',
      },
    ],
    bookings: [
      {
        id: 'bk-1',
        tenant_id: TENANT,
        team_member_id: TM,
        check_in_time: null,
        price: 10000, // $100.00 gross
        referrer_id: REF,
        sales_partner_id: null, // NOT a direct partner booking -- override path only
        status: 'in_progress',
        client_id: 'c-1',
        clients: { name: 'Client One', sales_partner_id: null },
      },
    ],
    referral_commissions: [],
    sales_partner_commissions: [],
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

describe('team-portal/checkout — referrer + recruiting sales-partner stacked payout', () => {
  it('pays the referrer their own rate AND the recruiting partner their override rate, on the same booking', async () => {
    const res = await post('bk-1')
    expect(res.status).toBe(200)

    // Referrer: $100 gross @ 10% = $10 (1000 cents)
    const referralComms = h.seed.referral_commissions
    expect(referralComms).toHaveLength(1)
    expect(referralComms[0]).toMatchObject({
      referrer_id: REF,
      gross_amount_cents: 10000,
      commission_rate: 0.10,
      commission_cents: 1000,
    })

    // Recruiting sales partner: SAME $100 gross @ their own 10% tier = $10
    // (1000 cents) -- an independent 'override' row, not a split of the
    // referrer's cut.
    const partnerComms = h.seed.sales_partner_commissions
    expect(partnerComms).toHaveLength(1)
    expect(partnerComms[0]).toMatchObject({
      sales_partner_id: PARTNER,
      source: 'override',
      referrer_id: REF,
      gross_amount_cents: 10000,
      commission_rate: 0.10,
      commission_cents: 1000,
    })
  })

  it('a higher-tier recruiting partner earns their own (higher) rate, not a flat 10%', async () => {
    h.seed.sales_partners[0].commission_rate = 0.15 // tier3
    const res = await post('bk-1')
    expect(res.status).toBe(200)

    expect(h.seed.referral_commissions[0].commission_cents).toBe(1000) // referrer unaffected: still 10%
    expect(h.seed.sales_partner_commissions[0]).toMatchObject({
      commission_rate: 0.15,
      commission_cents: 1500, // $100 @ 15%
    })
  })

  it('no recruiting partner attached -- only the referrer gets paid, no override row', async () => {
    h.seed.referrers[0].recruited_by_sales_partner_id = null
    const res = await post('bk-1')
    expect(res.status).toBe(200)

    expect(h.seed.referral_commissions).toHaveLength(1)
    expect(h.seed.sales_partner_commissions).toHaveLength(0)
  })
})
