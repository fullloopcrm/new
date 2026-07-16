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

  // Tenant-scoped update — RLS belt-and-suspenders
  const { error } = await supabaseAdmin
    .from('bookings')
    .update(updates)
    .eq('id', booking_id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A manual "client paid" is money received — record it so it reaches the
  // ledger like every other payment. Idempotent: only create a payment row if
  // the booking has none yet (avoids double-recording a Stripe/Zelle payment
  // that already posted). Then post revenue. Best-effort — never fail the flip.
  //
  // The "existing" SELECT above is check-then-insert with no DB backstop: two
  // concurrent mark-paid calls for the same booking (a double-tapped "Mark
  // Paid" button) both pass it before either INSERT commits, landing two
  // 'manual'/'completed' payments rows. postPaymentRevenue() is idempotent by
  // booking id so the ledger itself doesn't double-post, but finance/summary
  // sums payments.amount_cents directly — the duplicate row inflates the
  // tenant's reported "collected this month" total. Fixed the same way as
  // payment-processor.ts's duplicate-reference_id race (migration
  // 065_unique_payments_reference.sql already backs payments(tenant_id,
  // booking_id, reference_id) with a partial unique index): give this insert
  // a deterministic reference_id and catch 23505 as an idempotent no-op.
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
          const { data: paymentRow, error: paymentInsertErr } = await supabaseAdmin
            .from('payments')
            .insert({
              tenant_id: tenantId,
              booking_id,
              client_id: booking?.client_id ?? null,
              amount_cents: amountCents,
              tip_cents: 0,
              method: 'manual',
              status: 'completed',
              reference_id: `manual-mark-paid-${booking_id}`,
            })
            .select('id')
            .single()
          if (paymentInsertErr && paymentInsertErr.code !== '23505') {
            console.error('[mark-paid] payment insert failed:', paymentInsertErr)
          } else if (paymentRow?.id) {
            await postPaymentRevenue({ tenantId, paymentId: paymentRow.id })
          }
        }
      }
    } catch (e) {
      console.error('[mark-paid] revenue capture failed:', e)
    }
  }

  return NextResponse.json({ success: true })
}
