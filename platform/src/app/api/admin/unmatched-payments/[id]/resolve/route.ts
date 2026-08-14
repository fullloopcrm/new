import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantClient } from '@/lib/tenant-supabase'
import { requirePermission } from '@/lib/require-permission'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'
import { computeBookingBill } from '@/lib/finance/booking-bill'

// POST /api/admin/unmatched-payments/:id/resolve
// Manually links a real Stripe payment (one the webhook's auto-match
// couldn't attach to a booking — see webhooks/stripe/route.ts) to the
// booking an admin identifies. Inserts the SAME shape of payments row the
// webhook itself would have written (method: 'stripe', the real session/
// payment-intent ids from the task's metadata) — this is not the generic
// manual override (record-payment route, method: 'other'); the money
// already came through Stripe, so it's recorded as such. Then closes the
// admin_task so it drops off the unmatched-payments banner.
//
// body: { booking_id: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const { id: taskId } = await params
  const body = await req.json()
  const bookingId = String(body.booking_id || '')
  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const { data: task, error: taskErr } = await supabaseAdmin
    .from('admin_tasks')
    .select('id, tenant_id, status, metadata')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .eq('type', 'unmatched_stripe_payment')
    .single()
  if (taskErr || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.status !== 'open') return NextResponse.json({ error: 'Task already resolved' }, { status: 409 })

  const meta = (task.metadata || {}) as {
    stripe_session_id?: string
    stripe_payment_intent_id?: string | null
    amount_cents?: number
  }
  const amountCents = Math.round(Number(meta.amount_cents) || 0)
  if (!amountCents || !meta.stripe_session_id) {
    return NextResponse.json({ error: 'Task is missing payment data' }, { status: 500 })
  }

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, client_id, price')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()
  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: paymentRow, error: payErr } = await (await tenantClient(tenantId))
    .from('payments')
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      client_id: booking.client_id,
      amount_cents: amountCents,
      tip_cents: 0,
      method: 'stripe',
      status: 'completed',
      stripe_session_id: meta.stripe_session_id,
      stripe_payment_intent_id: meta.stripe_payment_intent_id || null,
    })
    .select('id')
    .single()
  if (payErr || !paymentRow?.id) {
    // Most likely the UNIQUE constraint on stripe_session_id — this exact
    // Stripe payment was already linked (possibly by this same request
    // retried). Surface plainly rather than silently no-op.
    return NextResponse.json({ error: payErr?.message || 'Payment insert failed' }, { status: 500 })
  }

  postPaymentRevenue({ tenantId, paymentId: paymentRow.id })
    .catch(err => console.error('[unmatched-payments/resolve] revenue post failed:', err))

  const { data: allPayments } = await (await tenantClient(tenantId))
    .from('payments')
    .select('amount_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
  const totalPaidCents = (allPayments || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  // Same computeBookingBill the close-out screen and record-payment route
  // use — not raw bookings.price. See booking-bill.ts's header comment.
  const bill = await computeBookingBill(tenantId, bookingId)
  const expectedCents = bill?.finalCents ?? (booking.price || 0)
  const isFullyPaid = totalPaidCents >= expectedCents

  await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: isFullyPaid ? 'paid' : 'partial',
      payment_method: 'stripe',
      payment_date: new Date().toISOString(),
      partial_payment_cents: isFullyPaid ? null : totalPaidCents,
    })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)

  await supabaseAdmin
    .from('admin_tasks')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: `Linked to booking ${bookingId}` })
    .eq('id', taskId)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ ok: true, payment_id: paymentRow.id, payment_status: isFullyPaid ? 'paid' : 'partial' })
}
