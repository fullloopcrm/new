/**
 * Record a manual payment against an invoice (Zelle/Venmo/cash/check).
 * For Stripe-initiated payments, the Stripe webhook inserts into `payments`
 * with invoice_id — the DB trigger bumps amount_paid_cents + status automatically.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { logInvoiceEvent } from '@/lib/invoice'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_METHODS = new Set(['zelle', 'venmo', 'cash', 'check', 'stripe', 'card', 'bank_transfer', 'other'])

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const amountCents = Math.round(Number(body.amount_cents) || Number(body.amount) * 100 || 0)
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Amount required' }, { status: 400 })
    }
    const method = String(body.method || 'other').toLowerCase()
    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ error: `Invalid method: ${method}` }, { status: 400 })
    }

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, tenant_id, client_id, booking_id, total_cents, amount_paid_cents, status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['void', 'refunded'].includes(invoice.status)) {
      return NextResponse.json({ error: `Cannot record payment on ${invoice.status} invoice` }, { status: 400 })
    }

    // Insert payment — DB trigger recomputes invoice.amount_paid_cents and status.
    const { data: payment, error: pErr } = await supabaseAdmin
      .from('payments')
      .insert({
        tenant_id: tenantId,
        invoice_id: id,
        booking_id: invoice.booking_id,
        client_id: invoice.client_id,
        amount_cents: amountCents,
        tip_cents: Number(body.tip_cents) || 0,
        method,
        status: 'succeeded',
        reference_id: body.reference_id || null,
        sender_name: body.sender_name || null,
        payment_sender_name: body.sender_name || null,
        received_at: body.received_at || new Date().toISOString(),
      })
      .select('id')
      .single()
    if (pErr) throw pErr

    // Post revenue to the GL now, like every other money-in path (mark-paid,
    // Stripe webhook, payment-processor.ts, the bank-txn match route) —
    // there is no other route there. An invoice with no linked booking has
    // no fallback at all: the daily finance-post cron only backfills from
    // bookings.payment_status, never from a bare payments row, so without
    // this call a manually-recorded Zelle/Venmo/cash/check payment would
    // mark the invoice paid while the revenue never reached the books.
    // Best-effort — never fail the payment record on a ledger hiccup.
    if (payment?.id) {
      await postPaymentRevenue({ tenantId, paymentId: payment.id }).catch((e) =>
        console.error('[record-payment] postPaymentRevenue failed for payment', payment.id, e),
      )
    }

    // Re-fetch invoice for updated status after trigger
    const { data: updated } = await supabaseAdmin
      .from('invoices')
      .select('status, amount_paid_cents, total_cents, paid_at')
      .eq('id', id)
      .single()

    const isFullyPaid = updated?.status === 'paid'
    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: isFullyPaid ? 'paid' : 'partial_payment',
      detail: {
        payment_id: payment.id,
        amount_cents: amountCents,
        method,
        reference_id: body.reference_id || null,
        new_balance_cents: (updated?.total_cents || 0) - (updated?.amount_paid_cents || 0),
      },
    })

    return NextResponse.json({
      ok: true,
      payment_id: payment.id,
      invoice_status: updated?.status,
      amount_paid_cents: updated?.amount_paid_cents,
      balance_cents: (updated?.total_cents || 0) - (updated?.amount_paid_cents || 0),
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/invoices/[id]/record-payment', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
