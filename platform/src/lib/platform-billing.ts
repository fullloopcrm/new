/**
 * Full Loop PLATFORM billing — FullLoop charging its tenants (its own Stripe
 * account), distinct from per-tenant Connect payments in lib/stripe.ts.
 *
 * Flat, unlimited-usage pricing (decided 2026-08-02):
 *   - $25,000 setup fee — 100% upfront, paid by bank WIRE, never touches
 *     Stripe. Tracked on partner_requests/tenants.setup_fee_paid_at only.
 *   - $2,500/month recurring — Stripe subscription, started the moment the
 *     proposal is signed. First invoice is $1 (a real, refundable charge
 *     that verifies the card/bank actually works) via a one-time coupon;
 *     every invoice after is the full $2,500.
 *
 * Prices/coupon are find-or-created by lookup_key/id so there's no manual
 * Stripe dashboard step.
 */
import { getStripe } from './stripe'
import { PRICING } from './billing-pricing'
import { signWireToken } from './wire-instructions'

// Stripe Price objects are immutable. If the flat fee ever changes, bump this
// suffix so ensurePlatformMonthlyPrice() mints a fresh price instead of
// reusing the old (wrong) amount. Existing subscriptions keep their old price
// until explicitly migrated.
const MONTHLY_LOOKUP = 'fl_flat_monthly_2500'
const FIRST_MONTH_COUPON_ID = 'fl_first_month_1_dollar_2500'

export async function ensurePlatformMonthlyPrice(): Promise<string> {
  const stripe = getStripe()
  const found = await stripe.prices.list({ lookup_keys: [MONTHLY_LOOKUP], active: true, limit: 1 })
  if (found.data[0]) return found.data[0].id

  const prod = await stripe.products.create({ name: 'Full Loop CRM — monthly (flat, unlimited)' })
  const price = await stripe.prices.create({
    product: prod.id, currency: 'usd', unit_amount: PRICING.monthlyFee * 100,
    recurring: { interval: 'month' }, lookup_key: MONTHLY_LOOKUP,
  })
  return price.id
}

/**
 * $1 first-invoice coupon: amount_off brings the first $2,500 invoice down to
 * $1, `duration: 'once'` so every invoice after is the full price. A real,
 * non-zero first charge (vs. a $0 trial) so a dead card/account fails fast.
 */
export async function ensureFirstMonthCoupon(): Promise<string> {
  const stripe = getStripe()
  try {
    const existing = await stripe.coupons.retrieve(FIRST_MONTH_COUPON_ID)
    if (existing && !existing.deleted) return existing.id
  } catch {
    // Not found — fall through and create it.
  }
  const coupon = await stripe.coupons.create({
    id: FIRST_MONTH_COUPON_ID,
    amount_off: PRICING.monthlyFee * 100 - 100, // brings $2,500 -> $1
    currency: 'usd',
    duration: 'once',
    name: 'First month — $1 verification charge',
  })
  return coupon.id
}

/**
 * Checkout for the RECURRING $2,500/mo only — the $25k setup fee never goes
 * through Stripe (it's a bank wire, tracked separately). Subscription starts
 * immediately on signing: $1 today, $2,500/mo from month two.
 */
export async function createProposalCheckout(opts: {
  leadId: string
  email?: string | null
  origin: string
}): Promise<{ url: string | null; id: string }> {
  const stripe = getStripe()
  const [priceId, couponId] = await Promise.all([ensurePlatformMonthlyPrice(), ensureFirstMonthCoupon()])

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'us_bank_account'],
    line_items: [{ price: priceId, quantity: 1 }],
    discounts: [{ coupon: couponId }],
    ...(opts.email && { customer_email: opts.email }),
    metadata: { lead_id: opts.leadId, kind: 'platform_proposal' },
    subscription_data: { metadata: { lead_id: opts.leadId } },
    success_url: `${opts.origin}/proposal/thank-you?lead=${opts.leadId}&t=${signWireToken(opts.leadId)}`,
    cancel_url: `${opts.origin}/proposal/cancelled`,
  })

  return { url: session.url, id: session.id }
}

/**
 * Pricing is flat now — no per-seat Stripe items to keep in sync. Kept as a
 * no-op (params accepted-and-ignored) so the existing best-effort caller
 * (businesses/[id] seat editor) doesn't need to change.
 */
export async function syncSubscriptionSeats(
  _subscriptionId?: string,
  _admins?: number,
  _teamMembers?: number,
): Promise<void> {
  return
}
