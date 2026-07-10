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

// Stripe Price objects are immutable: their unit_amount can't be edited after
// creation. When the seat price changes we must mint NEW prices, so the lookup
// keys are versioned by amount. Bumping the amount => bump the suffix here so
// ensurePlatformPrices() creates a fresh price at the new amount instead of
// reusing the old (cheaper) one. Existing subscriptions keep their old price
// until explicitly migrated (see syncSubscriptionSeats / a repricing job).
const ADMIN_LOOKUP = 'fl_admin_seat_monthly_2500'
const MEMBER_LOOKUP = 'fl_team_seat_monthly_250'
const SETUP_LOOKUP = 'fl_setup_fee_onetime' // unchanged — still $25,000

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

/**
 * Sync a live subscription's per-seat quantities to the tenant's current seat
 * counts. Stripe prorates the difference automatically. Admin seats are clamped
 * to a minimum of 1; team seats of 0 remove the team line item. No-op-safe:
 * callers should only invoke this when the tenant actually has a subscription.
 */
export async function syncSubscriptionSeats(
  subscriptionId: string,
  admins: number,
  teamMembers: number,
): Promise<void> {
  const stripe = getStripe()
  const { adminPriceId, memberPriceId } = await ensurePlatformPrices()
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
  const items = sub.items.data
  const adminItem = items.find(i => i.price.id === adminPriceId)
  const memberItem = items.find(i => i.price.id === memberPriceId)

  const updateItems: Stripe.SubscriptionUpdateParams.Item[] = []

  const adminQty = Math.max(1, Math.floor(admins || 0))
  updateItems.push(adminItem ? { id: adminItem.id, quantity: adminQty } : { price: adminPriceId, quantity: adminQty })

  const teamQty = Math.max(0, Math.floor(teamMembers || 0))
  if (teamQty > 0) {
    updateItems.push(memberItem ? { id: memberItem.id, quantity: teamQty } : { price: memberPriceId, quantity: teamQty })
  } else if (memberItem) {
    updateItems.push({ id: memberItem.id, deleted: true })
  }

  await stripe.subscriptions.update(subscriptionId, {
    items: updateItems,
    proration_behavior: 'create_prorations',
  })
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
