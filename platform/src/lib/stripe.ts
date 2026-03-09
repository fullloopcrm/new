import Stripe from 'stripe'

// Platform Stripe instance (for managing connected accounts)
export function getStripe(apiKey?: string): Stripe {
  const key = apiKey || process.env.STRIPE_SECRET_KEY
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

// Create a payment link for a booking
export async function createPaymentLink({
  amount,
  serviceName,
  bookingId,
  tenantId,
  stripeApiKey,
}: {
  amount: number
  serviceName: string
  bookingId: string
  tenantId: string
  stripeApiKey?: string
}) {
  const stripe = getStripe(stripeApiKey)

  const product = await stripe.products.create({
    name: serviceName,
    metadata: { booking_id: bookingId, tenant_id: tenantId },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'usd',
  })

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { booking_id: bookingId, tenant_id: tenantId },
    after_completion: { type: 'redirect', redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.fullloopcrm.com'}/portal` } },
  })

  return link
}
