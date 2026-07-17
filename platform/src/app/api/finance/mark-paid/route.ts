import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError
  const tenantId = tenant.tenantId

  const body = await request.json()
  const { booking_id, type } = body
  if (!booking_id || !type) {
    return NextResponse.json({ error: 'Missing booking_id or type' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (type === 'client') {
    updates.payment_status = 'paid'
    updates.payment_date = new Date().toISOString()
  } else if (type === 'cleaner') {
    updates.team_member_paid = true
    updates.team_member_paid_at = new Date().toISOString()
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // For the client branch, claim the paid transition atomically: the payments
  // table has no unique constraint on (tenant_id, booking_id), so without a
  // CAS here two concurrent "mark paid" clicks would both pass the old
  // payment_status check below, and each insert its own payments row + post
  // its own revenue — double-recording money received. `.neq` guards the
  // transition itself; only the caller who actually flips unpaid->paid runs
  // the payment/revenue side effect. The cleaner branch has no ledger side
  // effect (boolean flag only), so a plain update stays idempotent and safe.
  let claimedClientPaid = false
  if (type === 'client') {
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle()
    if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })
    claimedClientPaid = !!claim
    if (!claim) {
      // Already paid (this request lost the race, or it's a re-click) —
      // idempotent no-op, matches the pre-existing behavior's intent.
      return NextResponse.json({ success: true })
    }
  } else {
    // Tenant-scoped update — RLS belt-and-suspenders
    const { error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // A manual "client paid" is money received — record it so it reaches the
  // ledger like every other payment. Idempotent: only create a payment row if
  // the booking has none yet (avoids double-recording a Stripe/Zelle payment
  // that already posted). Then post revenue. Best-effort — never fail the flip.
  if (type === 'client' && claimedClientPaid) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('booking_id', booking_id)
        .in('status', ['completed', 'succeeded', 'partial'])
        .limit(1)
        .maybeSingle()

      if (!existing) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('price, client_id')
          .eq('id', booking_id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        const amountCents = Number(booking?.price) || 0
        if (amountCents > 0) {
          const { data: paymentRow } = await supabaseAdmin
            .from('payments')
            .insert({
              tenant_id: tenantId,
              booking_id,
              client_id: booking?.client_id ?? null,
              amount_cents: amountCents,
              tip_cents: 0,
              method: 'manual',
              status: 'completed',
            })
            .select('id')
            .single()
          if (paymentRow?.id) await postPaymentRevenue({ tenantId, paymentId: paymentRow.id })
        }
      }
    } catch (e) {
      console.error('[mark-paid] revenue capture failed:', e)
    }
  }

  return NextResponse.json({ success: true })
}
