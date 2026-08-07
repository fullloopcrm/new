/**
 * Stripe webhook — ported from nycmaid (2026-04-19), tenant-aware.
 * Handles: checkout completion, payments table insert, tip detection,
 * cleaner auto-payout via Stripe Connect (when team_member has stripe_account_id),
 * client/cleaner/admin notifications.
 *
 * tenantDb triage (P1/W2 c): N/A for this whole file. tenant_id is derived
 * per-event from Stripe metadata / an existence lookup (booking id, quote id,
 * invoice id, prospect id) that differs by event type and branch — several
 * branches (self-serve tenant signup: entities/prospects/tenant_invites) run
 * BEFORE any tenant exists at all. Every downstream read/write already
 * carries an explicit `.eq('tenant_id', …)` filter or stamp; idempotency on
 * the money-moving paths is handled separately (see the payments UNIQUE
 * constraint + the payout idempotencyKey added in this same branch).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { isCommEnabled } from '@/lib/comms-prefs'
import { cleanerPaidHours, applyTeamMinimum } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { applyDiscount, applyCredit } from '@/lib/discount'
import { isNycMaid, NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { postPaymentRevenue, postShopOrderRevenue } from '@/lib/finance/post-revenue'
import { postPayoutToLedger } from '@/lib/finance/post-labor'
import { postDepositToLedger, postRefundToLedger, postChargebackToLedger, tenantFromPaymentIntent } from '@/lib/finance/post-adjustments'
import { cleanerAlreadyPaid, claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout } from '@/lib/finance/cleaner-payout'
import { notify as nycmaidNotify } from '@/lib/nycmaid/notify'
import { notify } from '@/lib/notify'
import { decryptSecret } from '@/lib/secret-crypto'
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { trackError } from '@/lib/error-tracking'
import { sendEmail, tenantSender } from '@/lib/email'
import { tenantSiteUrl } from '@/lib/tenant-site'
import Stripe from 'stripe'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

type ShopReceiptItem = { name: string; priceCents: number; qty: number; isDigital: boolean; digitalDeliveryUrl: string | null }

function shopMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Creates the shop_orders/shop_order_items record for a completed cart
 * checkout and sends the tenant's OWN receipt — never Stripe's default
 * (which is branded to whichever Stripe account processed the charge; for a
 * tenant with no Connect account of their own, that's the platform account,
 * so relying on it would put "Full Loop CRM" on a customer-facing receipt).
 * Idempotent on the shop_orders.stripe_checkout_session_id unique index —
 * safe against Stripe's at-least-once webhook redelivery.
 */
async function handleShopOrder(session: Stripe.Checkout.Session): Promise<void> {
  const tenantId = session.metadata?.tenant_id
  if (!tenantId) return

  const { data: existing } = await supabaseAdmin
    .from('shop_orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()
  if (existing) return

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, domain, primary_color, logo_url, phone, email, email_from, resend_api_key, telnyx_api_key, telnyx_phone, setup_progress')
    .eq('id', tenantId)
    .single()
  if (!tenant) return

  const stripe = getStripe()
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] })

  const serviceTypeIds = lineItems.data
    .map((li) => {
      const product = li.price?.product
      return typeof product === 'object' && product && !('deleted' in product && product.deleted)
        ? (product as Stripe.Product).metadata?.service_type_id
        : undefined
    })
    .filter((id): id is string => !!id)

  const { data: catalogRows } = serviceTypeIds.length
    ? await supabaseAdmin.from('service_types').select('id, is_digital, digital_delivery_url').in('id', serviceTypeIds)
    : { data: [] as { id: string; is_digital: boolean; digital_delivery_url: string | null }[] }
  const catalogById = new Map((catalogRows || []).map((r) => [r.id, r]))

  const items: (ShopReceiptItem & { serviceTypeId: string | null })[] = lineItems.data.map((li) => {
    const product = li.price?.product
    const serviceTypeId =
      typeof product === 'object' && product && !('deleted' in product && product.deleted)
        ? (product as Stripe.Product).metadata?.service_type_id || null
        : null
    const catalog = serviceTypeId ? catalogById.get(serviceTypeId) : undefined
    return {
      serviceTypeId,
      name: li.description || 'Item',
      priceCents: li.price?.unit_amount || 0,
      qty: li.quantity || 1,
      isDigital: catalog?.is_digital || false,
      digitalDeliveryUrl: catalog?.digital_delivery_url || null,
    }
  })

  const anyPhysical = items.some((i) => !i.isDigital)
  const anyDigital = items.some((i) => i.isDigital)
  const fulfillmentType = anyPhysical && anyDigital ? 'mixed' : anyDigital ? 'digital' : 'physical'

  const shippingDetails = (session as unknown as { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null }).shipping_details
  const shipping = shippingDetails ? { name: shippingDetails.name || null, address: shippingDetails.address || null } : null

  const { data: order, error: orderError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      tenant_id: tenantId,
      stripe_checkout_session_id: session.id,
      customer_email: session.customer_details?.email || null,
      customer_name: session.customer_details?.name || null,
      shipping_address: shipping,
      subtotal_cents: session.amount_total || 0,
      status: 'paid',
      fulfillment_type: fulfillmentType,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    // Unique-violation on a redelivered webhook race is expected and fine —
    // the maybeSingle() check above just lost a race, not a real failure.
    if (orderError?.code !== '23505') console.error('shop_orders insert failed:', orderError)
    return
  }

  if (items.length > 0) {
    await supabaseAdmin.from('shop_order_items').insert(
      items.map((i) => ({
        order_id: order.id,
        service_type_id: i.serviceTypeId,
        name: i.name,
        price_cents: i.priceCents,
        qty: i.qty,
        is_digital: i.isDigital,
        digital_delivery_url: i.digitalDeliveryUrl,
      }))
    )
  }

  try {
    await postShopOrderRevenue({ tenantId, orderId: order.id, subtotalCents: session.amount_total || 0 })
  } catch (err) {
    console.error('postShopOrderRevenue failed:', err)
  }

  await sendShopReceipt({
    tenant,
    sessionId: session.id,
    items,
    subtotalCents: session.amount_total || 0,
    customerEmail: session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    customerPhone: session.customer_details?.phone || null,
  })

  await notifyTenantOfShopOrder({
    tenant,
    orderId: order.id,
    items,
    subtotalCents: session.amount_total || 0,
    customerName: session.customer_details?.name || null,
  })
}

/**
 * Alerts the tenant themselves (not the customer) that a new shop order came
 * in, per the Notify on new order setting in /dashboard/ecommerce Settings
 * (order_notify: 'email' | 'sms' | 'both' | 'none', default 'email' — matches
 * the <select> default in ecommerce-settings.tsx). Sends to the tenant's own
 * contact info, same fields already shown to customers as "Questions? Call or
 * text us at {tenant.phone}" — there's no separate owner-alert contact field.
 */
async function notifyTenantOfShopOrder({
  tenant,
  orderId,
  items,
  subtotalCents,
  customerName,
}: {
  tenant: { id: string; name: string; email?: string | null; phone?: string | null; email_from?: string | null; resend_api_key?: string | null; telnyx_api_key?: string | null; telnyx_phone?: string | null; setup_progress?: Record<string, unknown> | null }
  orderId: string
  items: ShopReceiptItem[]
  subtotalCents: number
  customerName: string | null
}): Promise<void> {
  const ecommerceConfig = (tenant.setup_progress?.['__page_config_ecommerce'] as Record<string, unknown> | undefined) || {}
  const orderNotify = (ecommerceConfig['order_notify'] as string) || 'email'
  if (orderNotify === 'none') return

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'}/dashboard/ecommerce`
  const itemSummary = items.map((i) => `${i.name} × ${i.qty}`).join(', ')
  const buyer = customerName || 'A customer'

  if ((orderNotify === 'email' || orderNotify === 'both') && tenant.email) {
    try {
      await sendEmail({
        to: tenant.email,
        subject: `New order — ${shopMoney(subtotalCents)}`,
        html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h1 style="font-size:18px;margin:0 0 12px;">New order on your store</h1>
          <p style="color:#555;font-size:14px;">${buyer} just ordered: ${itemSummary}</p>
          <p style="font-size:14px;font-weight:bold;">Total: ${shopMoney(subtotalCents)}</p>
          <p style="font-size:13px;"><a href="${dashboardUrl}">View this order in your dashboard</a></p>
        </div>`,
        from: tenantSender(tenant),
        resendApiKey: tenant.resend_api_key,
      })
    } catch (err) {
      console.error('shop order owner-notify email failed:', err)
    }
  }

  if ((orderNotify === 'sms' || orderNotify === 'both') && tenant.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
    try {
      await sendSMS({
        to: tenant.phone,
        body: `${tenant.name}: New order (${shopMoney(subtotalCents)}) from ${buyer}. Order #${orderId.slice(0, 8)} — view in your dashboard.`,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
    } catch (err) {
      console.error('shop order owner-notify SMS failed:', err)
    }
  }
}

async function sendShopReceipt({
  tenant,
  sessionId,
  items,
  subtotalCents,
  customerEmail,
  customerName,
  customerPhone,
}: {
  tenant: { id: string; name: string; slug: string | null; domain: string | null; primary_color?: string | null; phone?: string | null; email?: string | null; email_from?: string | null; resend_api_key?: string | null; telnyx_api_key?: string | null; telnyx_phone?: string | null }
  sessionId: string
  items: ShopReceiptItem[]
  subtotalCents: number
  customerEmail: string | null
  customerName: string | null
  customerPhone: string | null
}): Promise<void> {
  const receiptUrl = `${tenantSiteUrl(tenant)}/orders/session/${sessionId}`
  const brand = tenant.primary_color || '#1a2744'
  const firstName = (customerName || '').split(' ')[0] || 'there'

  if (customerEmail) {
    const rows = items
      .map(
        (i) =>
          `<tr><td style="padding:8px 0;color:#333;">${i.name} × ${i.qty}${i.isDigital ? ' <span style="color:#888;font-size:12px;">(digital)</span>' : ''}</td><td style="padding:8px 0;text-align:right;color:#333;">${shopMoney(i.priceCents * i.qty)}</td></tr>`
      )
      .join('')
    const digitalLinks = items
      .filter((i) => i.isDigital && i.digitalDeliveryUrl)
      .map((i) => `<p style="margin:4px 0;"><a href="${i.digitalDeliveryUrl}" style="color:${brand};">Download: ${i.name}</a></p>`)
      .join('')
    const html = `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h1 style="color:${brand};font-size:22px;margin:0 0 4px;">Thank you, ${firstName}!</h1>
        <p style="color:#555;font-size:14px;margin:0 0 24px;">Your order from ${tenant.name} is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">
          ${rows}
          <tr><td style="padding:12px 0 0;font-weight:bold;color:${brand};">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold;color:${brand};">${shopMoney(subtotalCents)}</td></tr>
        </table>
        ${digitalLinks ? `<div style="margin-top:20px;">${digitalLinks}</div>` : ''}
        <p style="color:#555;font-size:14px;margin-top:24px;">
          <a href="${receiptUrl}" style="color:${brand};">View your order</a> any time, or reply to this email if anything needs to change — we're glad to help.
        </p>
        ${tenant.phone ? `<p style="color:#888;font-size:12px;margin-top:24px;">Questions? Call or text us at ${tenant.phone}.</p>` : ''}
      </div>`
    try {
      await sendEmail({
        to: customerEmail,
        subject: `Your ${tenant.name} order is confirmed`,
        html,
        from: tenantSender(tenant),
        resendApiKey: tenant.resend_api_key,
      })
    } catch (err) {
      console.error('shop receipt email failed:', err)
    }
  }

  if (customerPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
    try {
      await sendSMS({
        to: customerPhone,
        body: `${tenant.name}: Thanks for your order! View your receipt: ${receiptUrl}`,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
    } catch (err) {
      console.error('shop receipt SMS failed:', err)
    }
  }
}

// Each tenant runs its own independent Stripe account, so each one generates
// its own webhook signing secret when its own Stripe dashboard is pointed at
// this same shared platform endpoint (Stripe never routes by destination
// domain — every tenant's deliveries land here regardless of source). A
// single global STRIPE_WEBHOOK_SECRET can only ever verify ONE tenant's
// account (or platform-level events with no tenant, like a prospect
// signup) — every other tenant's real deliveries fail constructEvent()
// against it and get rejected outright.
//
// The tenant_id read here (from the UNVERIFIED body, before any signature
// check succeeds) is only ever used to pick which secret to ATTEMPT
// verification with — it grants no trust by itself. The event is discarded
// unless constructEvent() below cryptographically verifies against that
// specific tenant's own real secret; an attacker can shove any tenant_id
// into an unsigned body, but can't forge a signature they don't hold the
// secret for.
//
// Two distinct per-tenant secrets, for two distinct delivery sources:
//   - tenants.stripe_webhook_secret — the tenant's own Stripe account's
//     regular webhook (checkout.session.completed, charge.refunded, etc.)
//   - tenants.stripe_connect_webhook_secret — Connect account.updated
//     deliveries, since each tenant also acts as its own Connect platform
//     for its team members/sales partners/referrers (see below).
async function peekEventTenantId(rawBody: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: { object?: { metadata?: Record<string, string> | null; client_reference_id?: string | null } }
    }
    const metaTenantId = parsed.data?.object?.metadata?.tenant_id
    if (metaTenantId) return metaTenantId

    // A tenant's static Payment Link (the NYC Maid-parity flow — one
    // reusable "customer enters amount" link, no per-booking Checkout
    // Session) carries no metadata at all: Stripe does NOT copy a Payment
    // Link's own metadata onto the Checkout Session it produces — only
    // client_reference_id survives onto session.client_reference_id
    // (confirmed against Stripe's payment-link tracking docs). That's
    // exactly the field the booking-payment path further down already uses
    // to resolve booking + tenant post-verification. Reuse it here too, so
    // a tenant running its own standalone Stripe account (not the one
    // behind the shared platform secret) can even be considered for the
    // fallback below. This grants no trust by itself — see the module
    // comment above; the event is still discarded unless it verifies.
    const clientRefId = parsed.data?.object?.client_reference_id
    if (clientRefId) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('tenant_id')
        .eq('id', clientRefId)
        .maybeSingle()
      if (booking?.tenant_id) return booking.tenant_id as string
    }

    return null
  } catch {
    return null
  }
}

function isAccountUpdatedEvent(rawBody: string): boolean {
  try {
    const parsed = JSON.parse(rawBody) as { type?: string }
    return parsed.type === 'account.updated'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  let stripe: Stripe
  try {
    stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    // Not verifiable against the shared platform secret — try the tenant's
    // own per-tenant secret before giving up. Any failure along this path
    // (no tenant hint, no tenant found, no secret configured, signature
    // still doesn't verify) falls through to the same 400 as before — never
    // silently accepted.
    const tenantId = await peekEventTenantId(body)
    if (!tenantId) {
      console.error('Stripe webhook signature failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // account.updated deliveries are signed with the tenant's own Connect
    // webhook secret; every other event type (checkout, refund, etc.) is
    // signed with the tenant's own regular account webhook secret. Different
    // columns, different Stripe-side webhook endpoints.
    const isConnect = isAccountUpdatedEvent(body)
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('stripe_webhook_secret, stripe_connect_webhook_secret')
      .eq('id', tenantId)
      .maybeSingle()
    const tenantSecret = isConnect
      ? (tenantRow as { stripe_connect_webhook_secret?: string | null } | null)?.stripe_connect_webhook_secret
      : (tenantRow as { stripe_webhook_secret?: string | null } | null)?.stripe_webhook_secret

    if (!tenantSecret) {
      console.error('Stripe webhook signature failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    try {
      stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, sig!, decryptSecret(tenantSecret))
    } catch (tenantErr) {
      console.error('Stripe per-tenant webhook signature failed:', tenantErr)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      let bookingId = session.metadata?.booking_id
      let tenantId = session.metadata?.tenant_id
      const invoiceId = session.metadata?.invoice_id

      // Shop (cart) checkout — /api/shop/checkout stamps source:'shop' and no
      // booking_id/invoice_id/quote metadata. Exit before any of the
      // booking/invoice/quote-deposit branches below, all of which assume a
      // booking-shaped session: in particular the no-bookingId fallback further
      // down matches the payer's email against NYC MAID clients and treats a
      // match as an unpaid job payment — a shop order for any tenant with no
      // real booking behind it must never fall into that recovery path.
      if (session.metadata?.source === 'shop') {
        try {
          await handleShopOrder(session)
        } catch (err) {
          console.error('handleShopOrder failed:', err)
        }
        return NextResponse.json({ received: true, shop_order: true })
      }

      // True when the client could type their own amount on this checkout —
      // the ONE condition under which an overage is a real, intended tip
      // rather than a bug. See the tip-math comment further down. Two ways
      // in: the legacy shared static link (resolved below via
      // client_reference_id, since that reused link can't carry per-booking
      // metadata) or this booking's own per-booking adjustable-amount
      // Payment Link (createPaymentLink({ adjustableAmount: true }) —
      // stamps its own metadata, so it's known immediately here).
      let viaAdjustableAmountPayLink = session.metadata?.adjustable_amount === 'true'

      // Static pay-link path (NYC Maid parity): the link appends
      // ?client_reference_id=<bookingId> with no metadata. If it matches a real
      // booking, resolve booking + tenant here so it routes to the booking-payment
      // path below, not the Full Loop signup path. Strictly additive — a prospect's
      // client_reference_id won't match a booking id, so signups are unaffected.
      //
      // `client_reference_id` is a caller-editable URL query param on a Stripe
      // Payment Link — Stripe never validates or restricts its value. Trusting
      // the referenced booking's tenant_id outright would let anyone holding ANY
      // tenant's static payment_link URL pay through it with a foreign tenant's
      // booking id appended, crediting that payment — and triggering a real
      // Stripe Connect payout — to a booking the payer never actually paid for.
      // Close the gap by confirming the Payment Link Stripe says was actually
      // used for this checkout is the one configured for the referenced
      // booking's own tenant, before trusting the resolution.
      if (!bookingId && session.client_reference_id) {
        const { data: refBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, tenant_id')
          .eq('id', session.client_reference_id)
          .maybeSingle()
        if (refBooking) {
          const { data: refTenant } = await supabaseAdmin
            .from('tenants')
            .select('payment_link')
            .eq('id', refBooking.tenant_id)
            .maybeSingle()
          let linkMatchesTenant = false
          if (refTenant?.payment_link && typeof session.payment_link === 'string') {
            try {
              const usedLink = await stripe.paymentLinks.retrieve(session.payment_link)
              linkMatchesTenant = usedLink.url === refTenant.payment_link
            } catch (e) {
              console.error('[stripe] payment link ownership check failed:', e)
            }
          }
          if (linkMatchesTenant) {
            bookingId = refBooking.id
            tenantId = tenantId || refBooking.tenant_id
            viaAdjustableAmountPayLink = true
          }
        }
      }

      // Prospect identifier comes from:
      //   (a) metadata.prospect_id — when session was created via our admin
      //       approve flow (checkout session includes metadata we set).
      //   (b) client_reference_id — when session originated from a Stripe
      //       Payment Link with ?client_reference_id=<prospect_id> appended.
      //       Payment Links don't support metadata per-customer, so this is
      //       the only per-prospect signal available.
      const prospectId = session.metadata?.prospect_id || session.client_reference_id || undefined
      const isFullLoopSignup =
        session.metadata?.full_loop_signup === 'true' ||
        (!!session.client_reference_id && !bookingId && !invoiceId)

      // ── Full Loop signup: prospect paid → create tenant ──
      if (prospectId && isFullLoopSignup) {
        // Compare-and-swap claim. Stripe retries webhooks; two deliveries can
        // race and both see this as unclaimed before either writes. Flip
        // status approved|reviewing|new → paid in a single UPDATE so only one
        // delivery wins.
        //
        // 2026-08-02: this used to also create + immediately ACTIVATE a live
        // tenant right here, on Stripe payment alone — completely bypassing
        // the $25k wire requirement (the wire was "out of band," meaning
        // nothing actually checked for it). That's now fixed to match the
        // sales-assisted lead flow: paying here only records the subscription;
        // an admin must confirm the wire landed before a tenant is created at
        // all (see admin/prospects/[id]/wire-received).
        const { error } = await supabaseAdmin
          .from('prospects')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
            stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', prospectId)
          .in('status', ['approved', 'reviewing', 'new'])

        if (error) {
          console.error('[stripe webhook] failed to record prospect subscription:', error)
          // Return 500 so Stripe retries — better than silently losing the sub id.
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ received: true, signup_paid: true })
      }

      // ── Invoice path — paid directly via invoice public link ──
      if (invoiceId && tenantId && !bookingId) {
        // Idempotency claim: same UNIQUE constraint on payments.stripe_session_id
        // (011_parity_with_nycmaid.sql) as the booking-payment path above. The
        // insert itself is the atomic decision point instead of a
        // select-then-insert with a gap between them — two concurrent/retried
        // deliveries for the same session race the insert; the loser gets a
        // 23505 unique-violation and MUST return here, before the revenue post,
        // so the invoice is never double-credited.
        const { data: invPayment, error: invPayInsertErr } = await supabaseAdmin.from('payments').insert({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          amount_cents: session.amount_total || 0,
          method: 'stripe',
          status: 'succeeded',
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        }).select('id').single()

        if (invPayInsertErr) {
          if (invPayInsertErr.code === '23505') {
            return NextResponse.json({ received: true, idempotent: true })
          }
          console.error('[stripe] invoice payment insert failed:', invPayInsertErr)
          return NextResponse.json({ received: true, error: 'insert_failed' })
        }
        // DB trigger recomputes invoice.amount_paid_cents and status.
        if (invPayment?.id) {
          postPaymentRevenue({ tenantId, paymentId: invPayment.id })
            .catch(err => console.error('[stripe] invoice revenue post failed:', err))
        }
        return NextResponse.json({ received: true, invoice_paid: true })
      }

      // ── Proposal deposit path — customer paid the deposit on a public quote ──
      if (session.metadata?.quote_deposit === 'true' && session.metadata?.quote_id && tenantId) {
        const quoteId = session.metadata.quote_id
        // Read-only lookup — used only for the deposit_cents fallback + the
        // not-found response. It does NOT decide whether to proceed; that
        // decision is made atomically by the claim UPDATE below, closing the
        // TOCTOU where two concurrent/retried deliveries could both read
        // deposit_paid_at: null and both post the deposit.
        const { data: qLookup } = await supabaseAdmin
          .from('quotes')
          .select('deposit_cents')
          .eq('id', quoteId).eq('tenant_id', tenantId).maybeSingle()
        if (!qLookup) return NextResponse.json({ received: true, quote_not_found: true })

        const amt = session.amount_total || qLookup.deposit_cents || 0
        const nowIso = new Date().toISOString()

        // Atomic claim: flip deposit_paid_at null -> now in one UPDATE so only
        // one concurrent/retried delivery wins. The loser's UPDATE matches
        // zero rows and gets null back — no select-then-branch-then-write gap.
        const { data: q } = await supabaseAdmin
          .from('quotes')
          .update({ deposit_paid_cents: amt, deposit_paid_at: nowIso, deposit_session_id: session.id })
          .eq('id', quoteId).eq('tenant_id', tenantId)
          .is('deposit_paid_at', null)
          .select('id, deal_id, quote_number')
          .maybeSingle()

        if (!q) {
          return NextResponse.json({ received: true, idempotent: true })
        }

        // Deposit is unearned until the job runs → post as a liability, not revenue.
        postDepositToLedger({ tenantId, sourceId: quoteId, amountCents: amt, memo: `Deposit ${q.quote_number}` })
          .catch(err => console.error('[stripe] deposit ledger post failed:', err))

        // Deposit closes the sale: advance the deal to sold + create the Job.
        if (q.deal_id) {
          const { data: deal } = await supabaseAdmin
            .from('deals').select('stage').eq('id', q.deal_id).eq('tenant_id', tenantId).maybeSingle()
          if (deal && ['new', 'qualifying', 'quoted', 'pending'].includes(deal.stage)) {
            await supabaseAdmin.from('deals')
              .update({ stage: 'sold', probability: 100, closed_at: nowIso, last_activity_at: nowIso })
              .eq('id', q.deal_id).eq('tenant_id', tenantId)
            await supabaseAdmin.from('deal_activities').insert([
              { tenant_id: tenantId, deal_id: q.deal_id, type: 'stage_change', description: `Moved from ${deal.stage} to sold`, metadata: { from: deal.stage, to: 'sold', quote_id: quoteId } },
              { tenant_id: tenantId, deal_id: q.deal_id, type: 'note', description: `Deposit $${(amt / 100).toFixed(2)} paid — closed to Sold`, metadata: { quote_id: quoteId } },
            ])
          }
        }
        // closeSoldQuote picks booking/recurring/job by the quote's actual
        // type — a plain deposit-paid cleaning must not always become an
        // unscheduled Job. See its docstring in lib/jobs.ts.
        // lss-06 live-audit gap (2026-07-31): this catch had no trackError
        // call even though this file already imports and uses trackError
        // elsewhere — a silent-failure gap of the same shape the original
        // bug came from. In practice this specific call site's quote should
        // already be status='accepted' by the time a deposit webhook fires
        // (the public accept route sets that synchronously before any
        // deposit charge is possible), so this is defense-in-depth rather
        // than a confirmed-frequent failure mode — but a real
        // closeSoldQuote failure here (any reason) previously vanished into
        // a console.warn line nobody tails.
        try {
          const { closeSoldQuote } = await import('@/lib/jobs')
          await closeSoldQuote(tenantId, quoteId)
        } catch (e) {
          console.warn('[stripe] deposit sale conversion failed', e)
          await trackError(e, { source: 'webhooks/stripe:close-sold-quote', severity: 'high', tenantId }).catch(() => {})
        }
        try {
          const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
          await ownerAlert({
            tenantId, subject: `Deposit paid — ${q.quote_number}`, kicker: 'Deposit paid',
            heading: `${q.quote_number} — deposit in, it's sold`,
            bodyHtml: `<p style="margin:0">Deposit <strong>$${(amt / 100).toFixed(2)}</strong> received. Closed to Sold — job created, ready to schedule.</p>`,
            sms: `Deposit $${(amt / 100).toFixed(0)} paid on ${q.quote_number}. SOLD — schedule the job.`,
          })
        } catch (e) { console.warn('[stripe] deposit owner alert failed', e) }
        return NextResponse.json({ received: true, quote_deposit_paid: true })
      }

      // NYC Maid parity: a Stripe pay-link payment that arrived with NO booking
      // reference — recover by matching the payer email to the NYC Maid client's
      // most recent unpaid job; if we can't, alert admin so money never sits
      // invisible (FL previously dropped these silently).
      if (!bookingId) {
        const payerEmail = session.customer_details?.email?.toLowerCase()
        const amountC = session.amount_total || 0
        if (payerEmail) {
          const { data: mc } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('tenant_id', NYCMAID_TENANT_ID)
            .ilike('email', payerEmail)
            .limit(1)
            .maybeSingle()
          if (mc) {
            const { data: cands } = await supabaseAdmin
              .from('bookings')
              .select('id, status')
              .eq('tenant_id', NYCMAID_TENANT_ID)
              .eq('client_id', mc.id)
              .neq('payment_status', 'paid')
              .in('status', ['completed', 'in_progress', 'scheduled'])
              .order('start_time', { ascending: false })
              .limit(5)
            const pick = (cands || []).find((b) => b.status === 'completed') || (cands || [])[0]
            if (pick) {
              bookingId = pick.id
              tenantId = NYCMAID_TENANT_ID
            }
          }
        }
        if (!bookingId) {
          await nmSmsAdmins(`Stripe $${(amountC / 100).toFixed(2)} from ${payerEmail || 'unknown'} — no booking ref, couldn't auto-match. Apply manually.`).catch(() => {})
          break
        }
      }
      if (!tenantId) break

      // Look up booking + cleaner + tenant for tip math
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, hourly_rate, pay_rate, team_member_pay, actual_hours, price, discount_percent, one_time_credit_cents, team_size, service_type, team_members!bookings_team_member_id_fkey(name, phone, pay_rate, stripe_account_id, preferred_language), clients(name, phone, address), client_properties(address, latitude, longitude), tenants(name, telnyx_api_key, telnyx_phone, stripe_api_key)')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single()
      if (booking) applyPropertyToBookingClient(booking as never)

      if (!booking) {
        console.error(`[stripe] booking ${bookingId} not found for tenant ${tenantId}`)
        break
      }

      const tm = booking.team_members as unknown as { name?: string; phone?: string; stripe_account_id?: string; preferred_language?: string } | null
      const client = booking.clients as unknown as { name?: string; phone?: string; address?: string | null } | null
      const tenant = booking.tenants as unknown as { name?: string; telnyx_api_key?: string; telnyx_phone?: string } | null

      const amountCents = session.amount_total || 0
      const hours = booking.actual_hours || (booking.price && booking.hourly_rate ? booking.price / 100 / booking.hourly_rate : null)
      // booking.price already reflects whatever discount was baked in at
      // creation (including the automatic recurring-type discount) and wins
      // first below -- the raw hours×rate fallback only fires when price is
      // unset, so the admin discount_percent + one_time_credit_cents (nycmaid
      // 6ec48424 parity) apply there, not on top of an already-discounted price.
      const expectedCents = booking.price || (hours && booking.hourly_rate ? applyCredit(applyDiscount(Math.round(hours * booking.hourly_rate * 100), booking.discount_percent as number | null), booking.one_time_credit_cents as number | null) : 0)

      // Tip is only possible on the static/adjustable-amount Payment Link
      // (buy.stripe.com/... -- the 30-min-alert text and the daily payment
      // follow-up send this one). That page literally reads "enter the total
      // amount... including any tip if desired" and hands the client a blank
      // box, so amountCents there is a real, client-chosen number and a
      // positive gap over expectedCents can be a genuine tip.
      //
      // The OTHER checkout surface (/api/payments/checkout's fixed-price
      // Stripe Checkout Session, one locked line item, no amount input) can
      // NEVER carry a real tip -- there is no way for the client to pay
      // anything other than the exact amount the session was created with.
      // A previous version of this fix zeroed tipCents unconditionally for
      // BOTH paths, which also silently discarded genuine client-entered tips
      // on the adjustable-link path (and shorted cleaners the real tip
      // amount on their payout) -- corrected here to only zero it for the
      // fixed-price path.
      //
      // Note this still inherits the pre-existing weakness of the adjustable
      // -link path: expectedCents is recalculated from booking.price at
      // webhook time, so a price/hours edit between the alert and the client
      // paying still reads as tip here too. Closed for the 30-min-alert
      // sender specifically -- it now writes clientOwesCents onto
      // booking.price at the moment it quotes the client (30min-alert/
      // route.ts), so expectedCents here matches what was actually quoted.
      // The daily payment follow-up cron (payment-followup-daily/route.ts)
      // only re-sends whatever price already holds rather than computing a
      // fresh live estimate, so it doesn't independently reintroduce this;
      // not audited further here.
      let tipCents = 0
      let isPartial = false
      if (expectedCents > 0) {
        if (viaAdjustableAmountPayLink && amountCents >= expectedCents) {
          tipCents = amountCents - expectedCents
        } else if (amountCents < expectedCents * 0.95) {
          isPartial = true
        }
      }

      // 1. Insert payment row (capture id → post revenue to ledger immediately).
      // Idempotency claim: `stripe_session_id` has a UNIQUE constraint
      // (011_parity_with_nycmaid.sql). The insert itself is the atomic
      // decision point — same shape as the prospects claim — instead of a
      // select-then-insert with a gap between them. Two concurrent/retried
      // deliveries for the same session race the insert; the loser gets a
      // 23505 unique-violation and MUST return here, before the payout
      // section below, so the cleaner is never paid twice for one session.
      const { data: bookingPayment, error: payInsertErr } = await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        client_id: booking.client_id,
        amount_cents: amountCents,
        tip_cents: tipCents,
        method: 'stripe',
        status: isPartial ? 'partial' : 'completed',
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }).select('id').single()

      if (payInsertErr || !bookingPayment?.id) {
        if ((payInsertErr as { code?: string } | null)?.code === '23505') {
          // Duplicate delivery raced us on the UNIQUE stripe_session_id — the
          // first delivery already recorded the payment (and paid the cleaner).
          return NextResponse.json({ received: true, idempotent: true })
        }
        // Genuine insert failure: do NOT proceed to pay the cleaner against a
        // payment we failed to record. 500 so Stripe redelivers and we retry.
        console.error(`[stripe] booking payment insert failed for ${bookingId}:`, payInsertErr)
        return NextResponse.json({ error: 'payment insert failed' }, { status: 500 })
      }
      postPaymentRevenue({ tenantId, paymentId: bookingPayment.id })
        .catch(err => console.error('[stripe] booking revenue post failed:', err))

      // 2. Update booking
      await supabaseAdmin
        .from('bookings')
        .update({
          payment_status: isPartial ? 'partial' : 'paid',
          payment_method: 'stripe',
          payment_date: new Date().toISOString(),
          tip_amount: tipCents,
          partial_payment_cents: isPartial ? amountCents : null,
        })
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)

      // 3. If partial, open admin task instead of payout
      if (isPartial) {
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'partial_payment',
          priority: 'high',
          title: `Partial payment — ${client?.name || 'Client'}`,
          description: `Received $${(amountCents / 100).toFixed(2)} of expected $${(expectedCents / 100).toFixed(2)}. Reconcile manually.`,
          related_type: 'booking',
          related_id: bookingId,
        })
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_partial',
          title: 'Partial Payment Received',
          message: `$${(amountCents / 100).toFixed(2)} (expected $${(expectedCents / 100).toFixed(2)}) for booking #${bookingId.slice(0, 8)}`,
          channel: 'in_app',
        })
        return NextResponse.json({ received: true, partial: true })
      }

      // 4. Auto-pay cleaner if connected to Stripe Connect. Shared booking-keyed
      // idempotency guard: never pay twice if the cleaner-checkout path (or a
      // webhook retry) already paid this booking's cleaner.
      let payoutSent = false
      let payoutClaimId: string | null = null
      if (tm?.stripe_account_id && booking.team_member_id && !(await cleanerAlreadyPaid(tenantId, bookingId))) {
        try {
          // Cleaner is paid THEIR rate × hours (NYC Maid parity) — NOT the
          // client's total. Prefer the breakdown stored at closeout/recap
          // (booking.team_member_pay, cents); else compute cleaner-grace hours ×
          // pay_rate. A real tip (only possible via the adjustable-amount pay
          // link — see tipCents above) passes through 100% on top.
          const storedPay = (booking as { team_member_pay?: number | null }).team_member_pay
          // Booking-level pay_rate is an admin override and must win over the
          // team member's own default rate (nycmaid 2428c8c4 precedence parity).
          const baseCleanerRate = (booking as { pay_rate?: number | null }).pay_rate || (tm as { pay_rate?: number | null })?.pay_rate || 25
          // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY.
          const cleanerRate = isNycMaid(tenantId)
            ? effectiveCleanerRate(baseCleanerRate, client?.address ?? null)
            : baseCleanerRate
          const teamSize = Math.max(1, (booking as { team_size?: number | null }).team_size || 1)
          const cleanerHours = applyTeamMinimum(Math.max(0.5, cleanerPaidHours((hours || 0) * 60)), teamSize)
          const cleanerBaseCents = storedPay && storedPay > 0 ? storedPay : Math.round(cleanerHours * cleanerRate * 100)
          const cleanerCents = cleanerBaseCents + tipCents

          // CLAIM the single payout slot BEFORE moving money. A conflict on the
          // UNIQUE(tenant_id, booking_id) index means the cleaner-checkout path
          // (or a webhook retry) already claimed this booking → do not transfer.
          const claim = await claimCleanerPayout({
            tenantId,
            bookingId,
            teamMemberId: booking.team_member_id as string,
            amountCents: cleanerBaseCents,
            tipCents,
          })
          if (claim.claimed && claim.payoutId) {
            payoutClaimId = claim.payoutId
            // Defense in depth on top of the DB-level claim above: an explicit
            // Stripe-side idempotency key means even a delivery that somehow
            // reaches this call twice (e.g. a process crash between the claim
            // committing and the transfer completing, followed by a manual
            // replay) can't double-transfer to the cleaner.
            const transfer = await stripe.transfers.create({
              amount: cleanerCents,
              currency: 'usd',
              destination: tm.stripe_account_id,
              transfer_group: bookingId,
              metadata: { booking_id: bookingId, tenant_id: tenantId },
            }, {
              idempotencyKey: `cleaner-payout:${bookingId}:${session.id}`,
            })
            // NYC Maid parity: push an INSTANT payout to the cleaner's bank so
            // funds land immediately, not on the standard Connect schedule. The
            // transfer already landed; a failed instant payout is non-fatal.
            let stripePayoutId: string | null = null
            let isInstant = false
            if (isNycMaid(tenantId)) {
              try {
                const po = await stripe.payouts.create(
                  { amount: cleanerCents, currency: 'usd', method: 'instant' },
                  { stripeAccount: tm.stripe_account_id, idempotencyKey: `cleaner-instant-payout:${bookingId}:${session.id}` },
                )
                stripePayoutId = po.id
                isInstant = true
              } catch (err) {
                console.error('[stripe] NYC Maid instant payout failed (transfer landed):', err)
              }
            }
            await finalizeCleanerPayout({
              tenantId,
              payoutId: claim.payoutId,
              amountCents: cleanerBaseCents,
              tipCents,
              stripeTransferId: transfer.id,
              stripePayoutId,
              instant: isInstant,
            })
            postPayoutToLedger({ tenantId, payoutId: claim.payoutId })
              .catch(err => console.error('[stripe] payout ledger post failed:', err))
            await supabaseAdmin
              .from('bookings')
              .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString(), team_member_pay: cleanerCents })
              .eq('id', bookingId)
              .eq('tenant_id', tenantId)
            payoutSent = true
          }
        } catch (payoutErr) {
          console.error('[stripe] cleaner payout failed:', payoutErr)
          // Transfer failed after claiming — release the pending claim so a retry can re-pay.
          if (payoutClaimId) await releaseCleanerPayout(tenantId, payoutClaimId).catch(() => {})
          await supabaseAdmin.from('admin_tasks').insert({
            tenant_id: tenantId,
            type: 'payout_failed',
            priority: 'high',
            title: `Payout failed — ${tm.name}`,
            description: `Stripe Connect transfer failed: ${payoutErr instanceof Error ? payoutErr.message : 'unknown'}`,
            related_type: 'booking',
            related_id: bookingId,
          })
        }
      }

      // 5. SMS the cleaner with payment confirmation (bilingual). No tip
      // mention — there is no tip mechanism in this checkout, so any "tip"
      // language here was always a false positive (see tipCents above).
      if (tm?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const isEs = tm.preferred_language === 'es'
        // NYC Maid rule: the cleaner is NOT shown the client's total/details —
        // only that payment landed. No client charge amount.
        // NYC Maid parity restore (2026-07-25): the old independent build told
        // the cleaner to finish up and check out once payment was confirmed —
        // that's the actual signal the cleaner is waiting on 30 min before the
        // job ends. Only nycmaid ran the 30-min-warning → checkout flow this
        // line refers back to, so keep the instruction nycmaid-only.
        const checkoutLine = isNycMaid(tenantId)
          ? (isEs
              ? ' Puede terminar y hacer el check-out cuando esté listo.'
              : ' You can finish up and check out when ready.')
          : ''
        const body = isEs
          ? `Pago recibido del trabajo de ${client?.name || 'cliente'}.${checkoutLine}${payoutSent ? ' Enviado a tu cuenta.' : ''}`
          : `Payment received for ${client?.name || 'client'}'s job.${checkoutLine}${payoutSent ? ' Sent to your account.' : ''}`
        sendSMS({
          to: tm.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] cleaner SMS failed:', err))
      }

      // 6. SMS client a thank-you. No tip mention — there is no tip
      // mechanism in this checkout to have generated one.
      if (client?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const body = `Thanks for the payment of $${(amountCents / 100).toFixed(0)}! 😊 — ${tenant.name || ''}`
        sendSMS({
          to: client.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] client SMS failed:', err))
      }

      // 6a. Email the client a detailed payment receipt — itemized rate ×
      // hours, discount, tip, total. Gated by the tenant's `payment_receipt`
      // comm pref (comms-registry.ts, default on) via notify()'s NOTIFY_COMM_MAP.
      if (booking.client_id) {
        const discountPercent = booking.discount_percent as number | null
        notify({
          tenantId,
          type: 'payment_received',
          recipientType: 'client',
          recipientId: booking.client_id,
          channel: 'email',
          title: `Payment Receipt — $${(amountCents / 100).toFixed(2)}`,
          message: `Thanks for your payment of $${(amountCents / 100).toFixed(2)}.`,
          bookingId,
          metadata: {
            clientName: client?.name || 'Client',
            serviceName: booking.service_type || 'Service',
            amount: `$${(amountCents / 100).toFixed(2)}`,
            date: new Date().toLocaleDateString(),
            paymentMethod: 'Card',
            hours: hours || undefined,
            hourlyRate: booking.hourly_rate ? `$${Number(booking.hourly_rate).toFixed(2)}/hr` : undefined,
            subtotal: expectedCents ? `$${(expectedCents / 100).toFixed(2)}` : undefined,
            discountLabel: discountPercent ? `${discountPercent}% off` : undefined,
            tipAmount: tipCents > 0 ? `$${(tipCents / 100).toFixed(2)}` : undefined,
            bookingRef: bookingId.slice(0, 8),
          },
        }).catch(err => console.error('[stripe] client payment receipt email failed:', err))
      }

      // 6b. Admin "payment CONFIRMED" SMS (NYC Maid parity — was missing; only
      // the in-app notification fired, so the owner never got a text). Admin DOES
      // see the total (unlike the cleaner).
      const payoutNote = payoutSent ? ' Cleaner paid out.' : ''
      const adminMsg = `Stripe payment CONFIRMED — ${client?.name || 'Client'} paid $${(amountCents / 100).toFixed(2)}.${payoutNote} Client + cleaner notified.`
      // Gated on the same "Payment received" toggle as the email leg —
      // previously ungated, so turning the setting off didn't stop this text.
      // adminMsg itself stays unconditional: the Telegram parity block below
      // (6c) reuses it regardless of the SMS setting.
      if (await isCommEnabled(tenantId, 'owner_payment_received', 'sms')) {
        await smsAdmins(tenantId, adminMsg).catch(err => console.error('[stripe] admin payment SMS failed:', err))
      }

      // 6c. NYC Maid Telegram parity restore (2026-07-25). The old independent
      // build posted this exact "payment CONFIRMED ... Client + cleaner
      // notified" line to Jeff's Telegram owner channel via notify() on every
      // Stripe payment (src/lib/notify.ts, TELEGRAM_NOTIFY_TYPES has
      // 'payment_received'). That never got ported when this webhook was
      // rewritten for Full Loop — only the in-app row (step 7) and the admin
      // SMS above survived, so the Telegram confirmation silently stopped
      // after cutover. Gated to NYC Maid: other tenants without their own
      // telegram_bot_token/telegram_chat_id would otherwise fall back to
      // posting into Jeff's personal platform bot.
      if (isNycMaid(tenantId)) {
        await nycmaidNotify({
          type: 'payment_received',
          title: `Payment received — ${client?.name || 'Client'}`,
          message: adminMsg,
          booking_id: bookingId,
          tenantId,
        }).catch(err => console.error('[stripe] nycmaid telegram notify failed:', err))
      }

      // 7. In-app notification
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'payment_received',
        title: `Payment Received — $${(amountCents / 100).toFixed(2)}`,
        message: `${client?.name || 'Client'} paid for booking #${bookingId.slice(0, 8)}${payoutSent ? ' — cleaner paid out' : ''}`,
        channel: 'in_app',
      })

      break
    }

    case 'charge.refunded': {
      // Refund issued in Stripe → reverse the sale in the ledger.
      const charge = event.data.object as Stripe.Charge
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      const resolved = piId ? await tenantFromPaymentIntent(piId) : null
      if (resolved) {
        const memo = resolved.bookingId ? `Refund · booking ${resolved.bookingId.slice(0, 8)}` : 'Refund'
        const refunds = charge.refunds?.data || []
        if (refunds.length > 0) {
          for (const r of refunds) {
            await postRefundToLedger({ tenantId: resolved.tenantId, sourceId: r.id, amountCents: r.amount, memo })
              .catch(err => console.error('[stripe] refund post failed:', err))
          }
        } else if (charge.amount_refunded > 0) {
          // Fallback when the refunds list isn't expanded on the event.
          await postRefundToLedger({ tenantId: resolved.tenantId, sourceId: charge.id, amountCents: charge.amount_refunded, memo })
            .catch(err => console.error('[stripe] refund post failed:', err))
        }
      }
      break
    }

    case 'charge.dispute.created': {
      // Chargeback opened → record the loss + flag the owner to respond in Stripe.
      const dispute = event.data.object as Stripe.Dispute
      const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
      const resolved = piId ? await tenantFromPaymentIntent(piId) : null
      if (resolved) {
        await postChargebackToLedger({ tenantId: resolved.tenantId, sourceId: dispute.id, amountCents: dispute.amount, memo: 'Chargeback / dispute' })
          .catch(err => console.error('[stripe] chargeback post failed:', err))
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: resolved.tenantId,
          type: 'chargeback',
          priority: 'high',
          title: `Chargeback $${(dispute.amount / 100).toFixed(2)}`,
          description: `Dispute ${dispute.id} opened — respond in Stripe before the deadline.`,
          related_type: 'booking',
          related_id: resolved.bookingId,
        }).then(() => {}, () => {})
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const bookingId = intent.metadata?.booking_id
      const tenantId = intent.metadata?.tenant_id

      if (bookingId && tenantId) {
        await trackError(new Error(intent.last_payment_error?.message || 'Unknown error'), {
          source: 'webhooks/stripe:payment_intent.payment_failed',
          tenantId,
          severity: 'high',
          extra: `booking ${bookingId}`,
        })
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment failed for booking #${bookingId.slice(0, 8)}: ${intent.last_payment_error?.message || 'Unknown error'}`,
          channel: 'in_app',
        })
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          priority: 'high',
          title: 'Stripe payment failed',
          description: intent.last_payment_error?.message || 'Unknown error',
          related_type: 'booking',
          related_id: bookingId,
        })
      }
      break
    }

    case 'account.updated': {
      // Stripe Connect account updates — track team_member onboarding state
      const account = event.data.object as Stripe.Account
      const teamMemberId = (account.metadata as Record<string, string> | null)?.team_member_id
      const tenantId = (account.metadata as Record<string, string> | null)?.tenant_id
      if (teamMemberId && tenantId && account.charges_enabled) {
        await supabaseAdmin
          .from('team_members')
          .update({ stripe_account_id: account.id })
          .eq('id', teamMemberId)
          .eq('tenant_id', tenantId)
      }
      break
    }

    case 'invoice.paid': {
      // Monthly subscription renewal succeeded for a Full Loop tenant.
      // Look up the tenant by the Stripe customer email (subscription was
      // created from the prospect's checkout session).
      const invoice = event.data.object as Stripe.Invoice
      const customerEmail = invoice.customer_email
      if (!customerEmail) break
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('owner_email', customerEmail)
        .maybeSingle()
      if (!tenant) break
      await supabaseAdmin
        .from('tenants')
        .update({ billing_status: 'active', last_payment_at: new Date().toISOString() })
        .eq('id', tenant.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerEmail = invoice.customer_email
      if (!customerEmail) break
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id, name, owner_email')
        .eq('owner_email', customerEmail)
        .maybeSingle()
      if (!tenant) break
      await supabaseAdmin
        .from('tenants')
        .update({ billing_status: 'past_due' })
        .eq('id', tenant.id)
      // This is a FullLoop tenant failing to pay FullLoop (not a tenant's own
      // client payment) — always critical, always worth a Telegram ping.
      await trackError(new Error(`${tenant.name} subscription payment failed, billing_status -> past_due`), {
        source: 'webhooks/stripe:invoice.payment_failed',
        tenantId: tenant.id,
        severity: 'critical',
      })
      // Alert platform admin + the tenant owner. Don't auto-suspend yet —
      // let Stripe's dunning retry logic run first.
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
      if (adminEmail) {
        try {
          const { sendEmail } = await import('@/lib/email')
          await sendEmail({
            to: adminEmail,
            subject: `Full Loop: ${tenant.name} subscription payment failed`,
            html: `<p>Invoice for <strong>${tenant.name}</strong> (${tenant.owner_email}) failed. Billing status flipped to past_due. Stripe will retry per dunning schedule.</p>`,
          })
        } catch { /* non-fatal */ }
      }
      break
    }

    case 'customer.subscription.deleted': {
      // Tenant cancelled subscription (or Stripe cancelled after all retries
      // failed). Flip billing_status so dashboard can gate features, but do
      // not delete the tenant — data retention window is separate.
      const sub = event.data.object as Stripe.Subscription
      // Fetch customer to get email for tenant lookup
      try {
        const stripeClient = stripe ?? getStripe()
        const customer = await stripeClient.customers.retrieve(sub.customer as string)
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email
          if (email) {
            await supabaseAdmin
              .from('tenants')
              .update({ billing_status: 'cancelled', subscription_cancelled_at: new Date().toISOString() })
              .eq('owner_email', email)
          }
        }
      } catch (e) {
        console.error('[stripe] subscription.deleted lookup failed:', e)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
