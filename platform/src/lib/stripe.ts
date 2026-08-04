import Stripe from 'stripe'
import { decryptSecret } from './secret-crypto'

// Platform Stripe instance (for managing connected accounts).
// Per-tenant keys are stored encrypted; decryptSecret() passes plaintext through.
export function getStripe(apiKey?: string): Stripe {
  const key = apiKey ? decryptSecret(apiKey) : process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe API key not configured')
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

// Create a checkout session for a booking payment
export async function createCheckoutSession({
  tenantId,
  bookingId,
  amount, // in cents
  customerEmail,
  serviceName,
  stripeApiKey,
  successUrl,
  cancelUrl,
}: {
  tenantId: string
  bookingId: string
  amount: number
  customerEmail?: string
  serviceName: string
  stripeApiKey?: string
  successUrl: string
  cancelUrl: string
}) {
  const stripe = getStripe(stripeApiKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: serviceName,
          description: `Booking #${bookingId.slice(0, 8)}`,
        },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    ...(customerEmail && { customer_email: customerEmail }),
    metadata: {
      tenant_id: tenantId,
      booking_id: bookingId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session
}

// Create a payment link for a booking. amount is always the real amount
// owed — when adjustableAmount is true it's used as the pre-filled starting
// value (Stripe's custom_unit_amount.preset), not a hard cap; the client can
// still type a different number, same as the platform's existing shared
// adjustable-amount link. This is what makes an overpayment a real, intended
// tip rather than a data-entry accident: the client sees the actual amount
// owed already filled in and is choosing to change it.
export async function createPaymentLink({
  amount,
  serviceName,
  bookingId,
  tenantId,
  stripeApiKey,
  adjustableAmount,
}: {
  amount: number
  serviceName: string
  bookingId: string
  tenantId: string
  stripeApiKey?: string
  adjustableAmount?: boolean
}) {
  const stripe = getStripe(stripeApiKey)

  const product = await stripe.products.create({
    name: serviceName,
    metadata: { booking_id: bookingId, tenant_id: tenantId },
  })

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    ...(adjustableAmount
      ? { custom_unit_amount: { enabled: true, preset: amount } }
      : { unit_amount: amount }),
  })

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { booking_id: bookingId, tenant_id: tenantId, adjustable_amount: adjustableAmount ? 'true' : 'false' },
    after_completion: { type: 'redirect', redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com'}/portal` } },
  })

  return link
}
