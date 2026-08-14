import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantClient } from '@/lib/tenant-supabase'
import { requirePermission } from '@/lib/require-permission'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'
import { computeBookingBill } from '@/lib/finance/booking-bill'

// POST /api/admin/bookings/:id/record-payment
// Backs the shared /dashboard bookings closeout widget. Records a real
// manual client payment (Zelle / Apple Pay / cash / other) against a
// booking, same shape as the Stripe webhook's booking-payment insert
// (src/app/api/webhooks/stripe/route.ts) and the invoices record-payment
// route. Replaces the old close-out "Paid"/"Zelle"/"Apple" buttons, which
// used to PATCH bookings.payment_status directly with zero payment ever
// inserted into `payments` -- a booking could show "paid" and "completed"
// with $0 actually received. payment_status is now only ever set here,
// after a real payments row exists to back it.
//
// body: { amount_cents: number, method: 'zelle'|'apple_pay'|'venmo'|'cashapp'|'cash'|'other', reference_id?: string }
const ALLOWED_METHODS = new Set(['zelle', 'apple_pay', 'venmo', 'cashapp', 'cash', 'other'])

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const { id } = await params
  const body = await req.json()

  const amountCents = Math.round(Number(body.amount_cents) || 0)
  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'Positive amount_cents required' }, { status: 400 })
  }
  const method = String(body.method || '').toLowerCase()
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `Invalid method: ${method}` }, { status: 400 })
  }

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, client_id, price')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: paymentRow, error: payErr } = await (await tenantClient(tenantId))
    .from('payments')
    .insert({
      tenant_id: tenantId,
      booking_id: id,
      client_id: booking.client_id,
      amount_cents: amountCents,
      tip_cents: 0,
      method,
      status: 'completed',
      reference_id: body.reference_id || null,
    })
    .select('id')
    .single()
  if (payErr || !paymentRow?.id) {
    return NextResponse.json({ error: payErr?.message || 'Payment insert failed' }, { status: 500 })
  }

  postPaymentRevenue({ tenantId, paymentId: paymentRow.id })
    .catch(err => console.error('[bookings/record-payment] revenue post failed:', err))

  // Sum every real payment on the booking (not just this one) to decide
  // paid vs partial -- a booking can be paid across more than one manual
  // payment (e.g. a deposit + balance). Root-caused 2026-08-14: this used to
  // compare against raw `bookings.price` (the quote from booking time) --
  // a different, larger number than what the close-out screen actually
  // showed as owed and charged via this same button, whenever real billed
  // hours or a self-booking/promo discount made the two diverge. Grace Wolf
  // and Simon Dolsten both paid exactly what the UI said was owed and still
  // showed "partial" forever. Now uses the same computeBookingBill the
  // close-out screen itself reads from — same number, can't diverge.
  const { data: allPayments } = await (await tenantClient(tenantId))
    .from('payments')
    .select('amount_cents')
    .eq('booking_id', id)
    .eq('tenant_id', tenantId)
  const totalPaidCents = (allPayments || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const bill = await computeBookingBill(tenantId, id)
  const expectedCents = bill?.finalCents ?? (booking.price || 0)
  const isFullyPaid = totalPaidCents >= expectedCents

  await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: isFullyPaid ? 'paid' : 'partial',
      payment_method: method,
      payment_date: new Date().toISOString(),
      partial_payment_cents: isFullyPaid ? null : totalPaidCents,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ ok: true, payment_id: paymentRow.id, total_paid_cents: totalPaidCents, payment_status: isFullyPaid ? 'paid' : 'partial' })
}
