/**
 * Remove one visit from a draft monthly consolidated invoice
 * (recurring_schedules.invoice_consolidation='monthly' →
 * cron/generate-monthly-invoices). Each line item on a consolidated invoice
 * is `li_<booking_id>` (src/lib/invoice-consolidation.ts) — this drops that
 * line item, recomputes totals, and frees the booking (invoice_id -> null)
 * so it's picked up correctly next cycle instead of being stuck "billed"
 * against an invoice that no longer lists it.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logInvoiceEvent } from '@/lib/invoice'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()
    const bookingId = body.booking_id
    if (!bookingId) return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })

    const { data: invoice } = await db
      .from('invoices')
      .select('id, status, recurring_schedule_id, line_items, tax_rate_bps, discount_cents')
      .eq('id', id)
      .single()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!invoice.recurring_schedule_id) {
      return NextResponse.json({ error: 'Not a consolidated monthly invoice' }, { status: 400 })
    }
    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: `Cannot edit a ${invoice.status} invoice` }, { status: 400 })
    }

    const targetLineId = `li_${bookingId}`
    const existingItems = (invoice.line_items as Array<{ id: string }>) || []
    if (!existingItems.some((li) => li.id === targetLineId)) {
      return NextResponse.json({ error: 'That visit is not on this invoice' }, { status: 400 })
    }

    const remainingItems = normalizeLineItems(existingItems.filter((li) => li.id !== targetLineId))
    const totals = computeTotals(remainingItems, Number(invoice.tax_rate_bps) || 0, Number(invoice.discount_cents) || 0)

    // The `invoice.status !== 'draft'` guard above is check-then-act, not
    // atomic: this invoice can be sent (POST .../send) or paid between that
    // read and this write. Without re-asserting status='draft' in THIS
    // update's own WHERE, a concurrent send/payment gets silently
    // overwritten -- a sent invoice's line_items/totals would be rewritten
    // out from under a client who's already looking at (or paying) the
    // version that was just sent.
    const { data: updated, error: uErr } = await db
      .from('invoices')
      .update({
        line_items: remainingItems,
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        discount_cents: totals.discount_cents,
        total_cents: totals.total_cents,
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select('*')
      .maybeSingle()
    if (uErr) throw uErr
    if (!updated) {
      return NextResponse.json(
        { error: 'This invoice changed status concurrently (e.g. it was sent) — refresh instead of editing' },
        { status: 409 },
      )
    }

    // Re-check invoice_id = this invoice IN the WHERE clause rather than
    // trusting the line-item check above: only free the booking if it still
    // actually belongs to this invoice, so this can never null out a claim
    // some other invoice/process holds.
    await db
      .from('bookings')
      .update({ invoice_id: null })
      .eq('id', bookingId)
      .eq('invoice_id', id)

    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: 'booking_removed',
      detail: { booking_id: bookingId },
    })

    return NextResponse.json({ invoice: updated })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/invoices/[id]/remove-booking', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
