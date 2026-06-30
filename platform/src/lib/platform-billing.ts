/**
 * Full Loop PLATFORM billing — FullLoop charging its tenants (its own Stripe
 * account), distinct from per-tenant Connect payments in lib/stripe.ts.
 *
 * Prices are find-or-created by lookup_key so there's no manual dashboard step.
 * Checkout runs in subscription mode: recurring seats + the one-time $25k setup
 * on the first invoice, with ACH enabled (pick ACH to avoid the card fee on 25k).
 */
import type Stripe from 'stripe'
import { getStripe } from './stripe'
import { PRICING } from './billing-pricing'

const ADMIN_LOOKUP = 'fl_admin_seat_monthly'
const MEMBER_LOOKUP = 'fl_team_seat_monthly'
const SETUP_LOOKUP = 'fl_setup_fee_onetime'

interface SeatPrices {
  adminPriceId: string
  memberPriceId: string
  setupPriceId: string
}

export async function ensurePlatformPrices(): Promise<SeatPrices> {
  const stripe = getStripe()
  const found = await stripe.prices.list({
    lookup_keys: [ADMIN_LOOKUP, MEMBER_LOOKUP, SETUP_LOOKUP],
    active: true,
    limit: 10,
  })
  const byKey = (k: string) => found.data.find(p => p.lookup_key === k)

  let admin = byKey(ADMIN_LOOKUP)
  let member = byKey(MEMBER_LOOKUP)
  let setup = byKey(SETUP_LOOKUP)

  if (!admin) {
    const prod = await stripe.products.create({ name: 'Full Loop — Admin seat' })
    admin = await stripe.prices.create({
      product: prod.id, currency: 'usd', unit_amount: PRICING.adminMonthly * 100,
      recurring: { interval: 'month' }, lookup_key: ADMIN_LOOKUP,
    })
  }
  if (!member) {
    const prod = await stripe.products.create({ name: 'Full Loop — Portal team seat' })
    member = await stripe.prices.create({
      product: prod.id, currency: 'usd', unit_amount: PRICING.teamMemberMonthly * 100,
      recurring: { interval: 'month' }, lookup_key: MEMBER_LOOKUP,
    })
  }
  if (!setup) {
    const prod = await stripe.products.create({ name: 'Full Loop — Setup fee (one-time)' })
    setup = await stripe.prices.create({
      product: prod.id, currency: 'usd', unit_amount: PRICING.setupFee * 100,
      lookup_key: SETUP_LOOKUP,
    })
  }

  return { adminPriceId: admin.id, memberPriceId: member.id, setupPriceId: setup.id }
}

export async function createProposalCheckout(opts: {
  leadId: string
  email?: string | null
  admins: number
  teamMembers: number
  origin: string
}): Promise<{ url: string | null; id: string }> {
  const stripe = getStripe()
  const { adminPriceId, memberPriceId, setupPriceId } = await ensurePlatformPrices()

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: adminPriceId, quantity: Math.max(1, opts.admins) },
    // One-time $25k setup on the first invoice.
    { price: setupPriceId, quantity: 1 },
  ]
  if (opts.teamMembers > 0) line_items.push({ price: memberPriceId, quantity: opts.teamMembers })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['us_bank_account', 'card'],
    line_items,
    ...(opts.email && { customer_email: opts.email }),
    metadata: { lead_id: opts.leadId, kind: 'platform_proposal' },
    subscription_data: { metadata: { lead_id: opts.leadId } },
    success_url: `${opts.origin}/proposal/thank-you`,
    cancel_url: `${opts.origin}/proposal/cancelled`,
  })

  return { url: session.url, id: session.id }
}
