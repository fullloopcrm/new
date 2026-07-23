/**
 * POST /api/bookings/:id/resend-payment-link
 *
 * Admin-triggered "resend price/payment link" action for the booking edit
 * panel. Reuses the booking's existing Stripe payment link if one was
 * already created (via /api/payments/link or the checkout flow); mints a
 * fresh one via the same createPaymentLink() call as /api/payments/link
 * only if the booking doesn't have one yet — resending repeatedly shouldn't
 * mint a new Stripe Product/Price/PaymentLink object every click.
 *
 * Client SMS here mirrors the already-authorized 30-min payment-request
 * flow (team-portal/15min-alert) — same payment-link content, admin-clicked
 * instead of clock-triggered. Admin gets a confirmation SMS either way so
 * an off-hours resend is visible, not silent.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { createPaymentLink } from '@/lib/stripe'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { smsAdmins } from '@/lib/admin-contacts'

type BookingRow = {
  id: string
  price: number | null
  service_type: string | null
  payment_link: string | null
  client_id: string | null
  clients: { name: string | null; phone: string | null } | null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: permError } = await requirePermission('bookings.edit')
  if (permError) return permError
  const tenantId = tenant.tenantId

  const { id: bookingId } = await params
  const db = tenantDb(tenantId)

  const { data: booking } = await db
    .from('bookings')
    .select('id, price, service_type, payment_link, client_id, clients(name, phone)')
    .eq('id', bookingId)
    .single<BookingRow>()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const amount = booking.price || 0
  if (amount <= 0) return NextResponse.json({ error: 'No price set on booking' }, { status: 400 })

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('name, stripe_api_key, telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()
  if (!tenantRow?.telnyx_api_key || !tenantRow?.telnyx_phone) {
    return NextResponse.json({ error: 'Tenant has no Telnyx SMS number configured' }, { status: 400 })
  }
  const stripeApiKey = tenantRow.stripe_api_key || process.env.STRIPE_SECRET_KEY
  if (!stripeApiKey) {
    return NextResponse.json({ error: 'Payments not configured. Add Stripe API key in Settings.' }, { status: 400 })
  }

  let url = booking.payment_link
  if (!url) {
    try {
      const link = await createPaymentLink({
        amount,
        serviceName: booking.service_type || 'Service',
        bookingId: booking.id,
        tenantId,
        stripeApiKey: tenantRow.stripe_api_key || undefined,
      })
      url = link.url
      await db.from('bookings').update({ payment_link: url }).eq('id', booking.id)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 500 })
    }
  }

  const client = booking.clients
  const clientName = client?.name || 'Client'
  const firstName = clientName.split(' ')[0]
  const owed = (amount / 100).toFixed(2)

  if (!booking.client_id) {
    return NextResponse.json({ url, sent: false, reason: 'No client on this booking — copy the link and send it manually.' })
  }

  const smsText = [
    `Hi ${firstName}! Here's your payment link for your ${booking.service_type || 'service'} — total $${owed}.`,
    `Pay here: ${url}`,
    `Please pay through this link only — credit/debit card, Cash App, or Apple Pay.`,
  ].join('\n')

  const smsResult = await sendClientSMS(booking.client_id, smsText, {
    smsType: 'payment_link_resend',
    bookingId: booking.id,
  }).catch(() => ({ sent: 0, skipped: 0 }))
  const sent = !!smsResult?.sent && smsResult.sent > 0

  await smsAdmins(
    tenantId,
    sent
      ? `Payment link resent to ${clientName} ($${owed}).`
      : `Tried to resend payment link to ${clientName} ($${owed}) but SMS failed — call ${client?.phone || 'client'} manually.`,
  ).catch(() => {})

  return NextResponse.json({ url, sent })
}
