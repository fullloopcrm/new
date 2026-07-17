/**
 * Manually record a refund against an invoice — for money returned outside
 * Stripe (Zelle/cash/check reversal) or to close out an invoice the Stripe
 * webhook path won't reach. Reverses the payment rows that funded
 * amount_paid_cents, flips the invoice to 'refunded', and posts the GL
 * reversal via the same postRefundToLedger() the Stripe webhook already uses.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { logInvoiceEvent } from '@/lib/invoice'
import { postRefundToLedger } from '@/lib/finance/post-adjustments'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : ''

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, status, amount_paid_cents')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['void', 'refunded'].includes(invoice.status)) {
      return NextResponse.json({ error: `Already ${invoice.status}` }, { status: 400 })
    }
    if ((invoice.amount_paid_cents || 0) <= 0) {
      return NextResponse.json({ error: 'Nothing paid on this invoice to refund' }, { status: 400 })
    }
    const refundCents = invoice.amount_paid_cents

    // Reverse the payment rows that fed amount_paid_cents first — the recompute
    // trigger only ever drives status to 'paid'/'partial', never 'refunded', so
    // the explicit invoice update below is still required regardless.
    const { data: refundedPayments } = await supabaseAdmin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('invoice_id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['succeeded', 'paid', 'completed'])
      .select('id')

    const { error: updErr } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'refunded', amount_paid_cents: 0 })
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (updErr) throw updErr

    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: 'refunded',
      detail: { amount_cents: refundCents, reason, payment_ids: (refundedPayments || []).map(p => p.id) },
    })

    await postRefundToLedger({ tenantId, sourceId: id, amountCents: refundCents, memo: reason || 'Manual refund' })
      .catch(err => console.error('[invoices/refund] ledger post failed:', err))

    return NextResponse.json({ ok: true, refunded_cents: refundCents })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/invoices/[id]/refund', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
