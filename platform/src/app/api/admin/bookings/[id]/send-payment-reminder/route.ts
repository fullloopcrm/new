import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { sendClientSMS, sendClientEmail } from '@/lib/client-contacts'
import { computeOutstandingCents, ensureBookingPaymentLink } from '@/lib/booking-payment'

// POST /api/admin/bookings/:id/send-payment-reminder
// Manual, admin-clicked payment reminder for a single booking's REAL
// outstanding balance (computed the same way as closeout-summary/
// record-payment: price minus everything actually in `payments`). Routes
// through sendClientSMS/sendClientEmail (src/lib/client-contacts.ts) so
// opt-outs, do_not_service, and multi-contact fan-out are respected exactly
// like every other client-facing send in the platform -- never hits
// clients.phone/email directly. Text mirrors the already-authorized
// payment-followup-daily cron copy (src/app/api/cron/payment-followup-daily).
// This route only fires when an admin clicks it -- no cron, no batching, no
// auto-trigger -- per the standing rule that new client-facing comms need
// Jeff's explicit sign-off before they're wired in.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant: authTenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = authTenant

  const { id } = await params

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, client_id, price, service_type')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (!booking.client_id) return NextResponse.json({ error: 'Booking has no client' }, { status: 400 })

  const outstandingCents = await computeOutstandingCents(tenantId, id, booking.price || 0)
  if (outstandingCents <= 0) {
    return NextResponse.json({ error: 'Nothing outstanding on this booking' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, email_from, telnyx_api_key, telnyx_phone, resend_api_key, payment_link, stripe_api_key')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const amount = (outstandingCents / 100).toFixed(2)

  // A real per-booking Stripe link (correct amount baked in, tied to this
  // booking via metadata) beats the tenant-wide static link + a
  // caller-editable client_reference_id query param -- see
  // route.payment-link-hijack.witness.test.ts on the webhook side for why
  // that param alone can't be trusted to identify the booking.
  let payLink: string | null = null
  try {
    payLink = await ensureBookingPaymentLink(tenant, id, booking.service_type || 'Service', outstandingCents)
  } catch (err) {
    console.error('Payment reminder link creation failed:', err)
  }
  if (!payLink) {
    payLink = tenant.payment_link ? `${tenant.payment_link}?client_reference_id=${id}` : null
  }

  const smsText = payLink
    ? `Hi — just a reminder your balance of $${amount} for your recent service is still open 😊\n\nPay here: ${payLink}\n\nThank you! — ${tenant.name}`
    : `Hi — just a reminder your balance of $${amount} for your recent service is still open. Reply here or give us a call to settle up. Thank you! — ${tenant.name}`

  const emailHtml = `
    <p>Hi,</p>
    <p>Just a reminder your balance of <strong>$${amount}</strong> for your recent service is still open.</p>
    ${payLink ? `<p><a href="${payLink}">Pay here</a></p>` : '<p>Reply to this email or give us a call to settle up.</p>'}
    <p>Thank you!<br/>${tenant.name}</p>
  `.trim()

  const [smsResult, emailResult] = await Promise.all([
    sendClientSMS(tenant, booking.client_id, smsText),
    sendClientEmail(tenant, booking.client_id, `Payment reminder — $${amount} due`, emailHtml),
  ])

  return NextResponse.json({ ok: true, outstanding_cents: outstandingCents, sms: smsResult, email: emailResult, payment_link: payLink })
}
