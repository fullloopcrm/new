import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { computeOutstandingCents, ensureBookingPaymentLink } from '@/lib/booking-payment'

// POST /api/admin/bookings/:id/payment-link
// Returns this booking's current unique Stripe payment link for whatever's
// really still outstanding (creating a fresh one if needed) without sending
// anything to the client -- backs the dashboard's "Copy" action so an admin
// can hand the link over manually instead of through the automated
// SMS/email reminder.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant: authTenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = authTenant

  const { id } = await params

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, price, service_type')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const outstandingCents = await computeOutstandingCents(tenantId, id, booking.price || 0)
  if (outstandingCents <= 0) {
    return NextResponse.json({ error: 'Nothing outstanding on this booking' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, payment_link, stripe_api_key')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  let payLink: string | null = null
  try {
    payLink = await ensureBookingPaymentLink(tenant, id, booking.service_type || 'Service', outstandingCents)
  } catch (err) {
    console.error('Payment link creation failed:', err)
  }
  if (!payLink) {
    payLink = tenant.payment_link ? `${tenant.payment_link}?client_reference_id=${id}` : null
  }
  if (!payLink) return NextResponse.json({ error: 'No payment link available for this tenant' }, { status: 400 })

  return NextResponse.json({ url: payLink })
}
