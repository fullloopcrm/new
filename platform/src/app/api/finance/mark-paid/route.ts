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

  // Tenant-scoped update — chained .select().single() so a foreign booking_id
  // (0 rows matched) surfaces as a 404 instead of a false "success" no-op.
  const { data: updated, error } = await supabaseAdmin
    .from('bookings')
    .update(updates)
    .eq('id', booking_id)
    .eq('tenant_id', tenantId)
    .select('id')
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // A manual "client paid" is money received — record it so it reaches the
  // ledger like every other payment. Idempotent: only create a payment row if
  // the booking has none yet (avoids double-recording a Stripe/Zelle payment
  // that already posted). Then post revenue. Best-effort — never fail the flip.
  if (type === 'client') {
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
