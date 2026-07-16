/**
 * Record a manual payment against an invoice (Zelle/Venmo/cash/check).
 * For Stripe-initiated payments, the Stripe webhook inserts into `payments`
 * with invoice_id — the DB trigger bumps amount_paid_cents + status automatically.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { logInvoiceEvent } from '@/lib/invoice'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_METHODS = new Set(['zelle', 'venmo', 'cash', 'check', 'stripe', 'card', 'bank_transfer', 'other'])

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
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

    const { data: invoice } = await db
      .from('invoices')
      .select('id, tenant_id, client_id, booking_id, total_cents, amount_paid_cents, status')
      .eq('id', id)
      .single()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['void', 'refunded'].includes(invoice.status)) {
      return NextResponse.json({ error: `Cannot record payment on ${invoice.status} invoice` }, { status: 400 })
    }

    // Duplicate-submission guard. Unlike payment-processor.ts's processPayment()
    // and the finance/mark-paid fix, this route inserts a payments row with NO
    // idempotency check at all — a double-tapped "Record" button firing in two
    // tabs, or the same received Zelle/Venmo notification recorded independently
    // by two staff members, lands two rows. The trigger in 027_invoices.sql sums
    // ALL succeeded payments for the invoice, so a duplicate doesn't just inflate
    // finance/summary like mark-paid's race — it can flip the invoice to 'paid'
    // while only half the money actually arrived. Can't reuse mark-paid's static
    // per-booking reference_id key here: invoices legitimately take multiple
    // distinct payments over time (staged/partial payment plans), so a fixed key
    // would silently no-op a genuine second payment.
    //
    // Two layers, same as mark-paid:
    //   1. App-level check-then-insert below (this SELECT) — closes the common
    //      case (sequential double-click, retry seconds later) but is itself
    //      racy under true concurrency (two requests can both pass the SELECT
    //      before either INSERT commits — proven by this file's own race test).
    //   2. DB-backed backstop: when the caller didn't supply a reference_id
    //      (true for most manual entries), synthesize a deterministic one keyed
    //      on booking_id + amount + method + a 20s time bucket, reusing the
    //      ALREADY-FILED migration 065_unique_payments_reference.sql partial
    //      unique index on payments(tenant_id, booking_id, reference_id) — no
    //      new migration needed. Catch 23505 below as an idempotent no-op, same
    //      pattern as mark-paid/payment-processor.ts. This closes the true race
    //      that layer 1 alone cannot. CAVEAT: invoices with a NULL booking_id
    //      (no linked booking, e.g. project-only invoices) get layer-1
    //      protection only — a plain UNIQUE index never matches two NULLs, so
    //      the DB backstop can't cover them without an invoice_id-scoped index.
    const DEDUP_WINDOW_MS = 20_000
    const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    const { data: recentDuplicate } = await db
      .from('payments')
      .select('id')
      .eq('invoice_id', id)
      .eq('amount_cents', amountCents)
      .eq('method', method)
      .in('status', ['succeeded', 'paid', 'completed'])
      .gte('created_at', dedupWindowStart)
      .limit(1)
      .maybeSingle()
    if (recentDuplicate) {
      const { data: dupInvoice } = await db
        .from('invoices')
        .select('status, amount_paid_cents, total_cents')
        .eq('id', id)
        .single()
      return NextResponse.json({
        ok: true,
        payment_id: recentDuplicate.id,
        invoice_status: dupInvoice?.status,
        amount_paid_cents: dupInvoice?.amount_paid_cents,
        balance_cents: (dupInvoice?.total_cents || 0) - (dupInvoice?.amount_paid_cents || 0),
        deduped: true,
      })
    }

    // See layer-2 comment above: synthesize a deterministic, time-bucketed
    // reference_id only when the caller didn't supply a real one and the
    // invoice has a booking_id to key off (migration 065's index is
    // booking_id-scoped). Bucketing (not a static key) keeps genuinely
    // distinct payments minutes+ apart from colliding.
    const referenceId = body.reference_id
      || (invoice.booking_id
        ? `manual-record-payment-${invoice.booking_id}-${amountCents}-${method}-${Math.floor(Date.now() / DEDUP_WINDOW_MS)}`
        : null)

    // Insert payment — DB trigger recomputes invoice.amount_paid_cents and status.
    const { data: payment, error: pErr } = await db
      .from('payments')
      .insert({
        invoice_id: id,
        booking_id: invoice.booking_id,
        client_id: invoice.client_id,
        amount_cents: amountCents,
        tip_cents: Number(body.tip_cents) || 0,
        method,
        status: 'succeeded',
        reference_id: referenceId,
        sender_name: body.sender_name || null,
        payment_sender_name: body.sender_name || null,
        received_at: body.received_at || new Date().toISOString(),
        // Server-stamped (not caller-overridable, unlike received_at above) so the
        // dedup window above compares against when this request actually landed,
        // not a caller-claimed/backdated received_at.
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    // Layer-2 backstop firing: a truly concurrent resubmission slipped past the
    // layer-1 SELECT above and hit the DB-level unique index instead. Treat
    // exactly like layer 1's dedup response — idempotent no-op, not an error.
    if (pErr?.code === '23505') {
      const { data: dupInvoice } = await db
        .from('invoices')
        .select('status, amount_paid_cents, total_cents')
        .eq('id', id)
        .single()
      return NextResponse.json({
        ok: true,
        invoice_status: dupInvoice?.status,
        amount_paid_cents: dupInvoice?.amount_paid_cents,
        balance_cents: (dupInvoice?.total_cents || 0) - (dupInvoice?.amount_paid_cents || 0),
        deduped: true,
      })
    }
    if (pErr) throw pErr

    // Re-fetch invoice for updated status after trigger
    const { data: updated } = await db
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
        reference_id: referenceId,
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
