/**
 * Public Shop cart checkout (tenant resolved from host, like /api/contact).
 *
 * Builds a multi-line-item Stripe Checkout Session from the tenant's own
 * Product-type catalog rows (service_types, item_type='product' — same table
 * /dashboard/ecommerce manages). Prices are re-read from the DB by id, never
 * trusted from the client, so a tampered cart payload can't under-charge.
 *
 * Session metadata is stamped source:'shop' so the Stripe webhook's
 * checkout.session.completed handler short-circuits before any of its
 * booking/invoice/quote-deposit branches — see the guard at the top of that
 * switch case in /api/webhooks/stripe/route.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { getStripe } from '@/lib/stripe'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { supabaseAdmin } from '@/lib/supabase'

interface CartLine {
  id?: string
  qty?: number
  color?: string
  size?: string
}

const MAX_LINE_QTY = 20
const MAX_LINES = 25

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const setupProgress = (tenant as { setup_progress?: Record<string, unknown> }).setup_progress || {}
    const ecommerceConfig = (setupProgress['__page_config_ecommerce'] as Record<string, unknown> | undefined) || {}
    if (ecommerceConfig['storefront_enabled'] === false) {
      return NextResponse.json({ error: 'Shop is not available' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = await rateLimitDb(`shop-checkout:${tenant.id}:${ip}`, 10, 10 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests, try again shortly.' }, { status: 429 })

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const cart: CartLine[] = Array.isArray(body.cart) ? body.cart : []
    if (cart.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    if (cart.length > MAX_LINES) return NextResponse.json({ error: 'Too many items in cart' }, { status: 400 })

    const ids = cart
      .map((line) => (typeof line.id === 'string' ? line.id : null))
      .filter((id): id is string => !!id)
    if (ids.length === 0) return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })

    const { data: products, error } = await supabaseAdmin
      .from('service_types')
      .select('id, name, description, image_url, price_cents, active, item_type, is_digital, color_options, size_options')
      .eq('tenant_id', tenant.id)
      .eq('item_type', 'product')
      .in('id', ids)
    if (error) throw error

    const byId = new Map((products || []).map((p) => [p.id, p]))
    const lineItems = cart
      .map((line) => {
        if (!line.id) return null
        const product = byId.get(line.id)
        if (!product || !product.active) return null
        const qty = Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(Number(line.qty) || 1)))
        // Only trust color/size values that are actually one of the
        // product's real options — never pass arbitrary client text through
        // to the Stripe-visible line item name.
        const colorOptions: string[] = product.color_options || []
        const sizeOptions: string[] = product.size_options || []
        const color = typeof line.color === 'string' && colorOptions.includes(line.color) ? line.color : null
        const size = typeof line.size === 'string' && sizeOptions.includes(line.size) ? line.size : null
        const variantSuffix = [color, size].filter(Boolean).join(' / ')
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: variantSuffix ? `${product.name} — ${variantSuffix}` : product.name,
              description: product.description || undefined,
              images: product.image_url ? [product.image_url] : undefined,
              // Read back in the webhook (Checkout Sessions don't carry our
              // own line items) to snapshot is_digital/digital_delivery_url
              // onto the order without re-trusting client input.
              metadata: { service_type_id: product.id, ...(color ? { color } : {}), ...(size ? { size } : {}) },
            },
            unit_amount: product.price_cents || 0,
          },
          quantity: qty,
          // Lets the customer bump quantity up/down on Stripe's own hosted
          // page without bouncing back to the cart. Removing a line entirely
          // isn't something Stripe Checkout supports on that page — that
          // still has to happen in our cart before checkout.
          adjustable_quantity: { enabled: true, minimum: 1, maximum: MAX_LINE_QTY },
        }
      })
      .filter((li): li is NonNullable<typeof li> => li !== null && li.price_data.unit_amount > 0)

    if (lineItems.length === 0) return NextResponse.json({ error: 'No valid, priced items in cart' }, { status: 400 })

    // Physical goods need an address; an all-digital cart doesn't. A mixed
    // cart still needs one for the physical item(s).
    const anyPhysical = cart.some((line) => {
      const product = line.id ? byId.get(line.id) : undefined
      return product && !product.is_digital
    })

    // Flat shipping rate from /dashboard/ecommerce Settings — shown as its own
    // line on the Stripe page rather than folded silently into the item
    // price, so the customer sees exactly what they're paying for before
    // paying it (0/unset = free, no shipping_options at all).
    const shippingFlatCents = typeof ecommerceConfig['shipping_flat_cents'] === 'number' ? ecommerceConfig['shipping_flat_cents'] : 0

    const siteUrl = tenantSiteUrl(tenant)
    const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key || undefined)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      phone_number_collection: { enabled: true },
      ...(anyPhysical ? { shipping_address_collection: { allowed_countries: ['US', 'CA'] } } : {}),
      ...(anyPhysical && shippingFlatCents > 0
        ? {
            shipping_options: [
              {
                shipping_rate_data: {
                  type: 'fixed_amount',
                  fixed_amount: { amount: shippingFlatCents, currency: 'usd' },
                  display_name: 'Standard Shipping',
                },
              },
            ],
          }
        : {}),
      metadata: { tenant_id: tenant.id, source: 'shop' },
      success_url: `${siteUrl}/orders/session/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/shop?checkout=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/shop/checkout error:', err)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
