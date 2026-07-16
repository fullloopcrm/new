/**
 * Invoice by id — read, update (pre-sent only), void.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logInvoiceEvent } from '@/lib/invoice'

type Params = { params: Promise<{ id: string }> }

const EDITABLE_STATUSES = ['draft', 'sent', 'viewed', 'overdue']

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ data: activity }, { data: paymentsRows }] = await Promise.all([
      supabaseAdmin
        .from('invoice_activity')
        .select('id, event_type, detail, created_at')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('payments')
        .select('id, amount_cents, tip_cents, method, status, reference_id, sender_name, received_at, created_at')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      invoice: data,
      activity: activity || [],
      payments: paymentsRows || [],
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/invoices/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json({ error: `Cannot edit ${existing.status} invoice` }, { status: 400 })
    }

    // client_id is a cross-table FK — confirm it belongs to this tenant before
    // writing it, or a caller could reassign the invoice to another tenant's
    // client and exfiltrate that client's name/email/phone/address via the
    // clients() join on this same route's GET (and this PATCH's own response).
    if ('client_id' in body && body.client_id) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', body.client_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!client) return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    const assignables = [
      'title', 'description',
      'contact_name', 'contact_email', 'contact_phone', 'service_address',
      'terms', 'notes', 'due_date', 'client_id',
    ] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    if ('line_items' in body || 'tax_rate_bps' in body || 'discount_cents' in body) {
      const { data: current } = await supabaseAdmin
        .from('invoices')
        .select('line_items, tax_rate_bps, discount_cents')
        .eq('id', id)
        .single()
      const lineItems = normalizeLineItems(
        'line_items' in body ? body.line_items : (current?.line_items as unknown[] || []),
      )
      const tax_rate_bps = 'tax_rate_bps' in body ? Number(body.tax_rate_bps) : Number(current?.tax_rate_bps) || 0
      const discount_cents = 'discount_cents' in body ? Number(body.discount_cents) : Number(current?.discount_cents) || 0
      const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)
      updates.line_items = lineItems
      updates.tax_rate_bps = tax_rate_bps
      updates.subtotal_cents = totals.subtotal_cents
      updates.tax_cents = totals.tax_cents
      updates.discount_cents = totals.discount_cents
      updates.total_cents = totals.total_cents
    }

    // Check-then-act, not atomic: the guard above reads `existing.status`
    // once, but a payment (record-payment, or the Stripe webhook) can land
    // between that read and this write -- the trigger in 027_invoices.sql
    // bumps status to 'partial'/'paid' immediately on insert. Without
    // re-asserting the editable-status set in THIS update's own WHERE, a
    // concurrent payment's status flip gets silently overwritten by whatever
    // stale totals/line_items this request was computing against a
    // now-outdated snapshot -- the invoice would show a different total than
    // what was actually paid. Re-check against the current DB row instead of
    // trusting the `existing` snapshot.
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .in('status', EDITABLE_STATUSES)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'This invoice changed status concurrently (e.g. a payment landed) — refresh instead of editing' },
        { status: 409 },
      )
    }

    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: 'edited',
      detail: { fields: Object.keys(updates) },
    })
    return NextResponse.json({ invoice: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/invoices/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Void (soft delete) — hard delete is disallowed on anything past draft.
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const url = new URL(request.url)
    const reason = url.searchParams.get('reason') || ''
    const hard = url.searchParams.get('hard') === '1'

    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('status, amount_paid_cents')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (hard && existing.status === 'draft' && (existing.amount_paid_cents || 0) === 0) {
      // Same TOCTOU class as the void guard below: record-payment only blocks
      // void/refunded invoices, so a payment can land on this draft invoice
      // between the SELECT above and this DELETE (record-payment's own insert
      // trigger bumps amount_paid_cents/status before this DELETE runs). Without
      // re-asserting amount_paid_cents = 0 in the DELETE's own WHERE, a
      // concurrent payment gets hard-deleted along with its invoice record --
      // the payment row survives (invoice_id ON DELETE SET NULL) but orphaned,
      // with the invoice that explains what it was for gone.
      const { data: deleted, error } = await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .eq('amount_paid_cents', 0)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!deleted) {
        return NextResponse.json(
          { error: 'A payment was recorded on this invoice concurrently — refresh instead of deleting' },
          { status: 409 },
        )
      }
      return NextResponse.json({ ok: true, hard: true })
    }

    if (['void', 'refunded'].includes(existing.status)) {
      return NextResponse.json({ error: `Already ${existing.status}` }, { status: 400 })
    }
    if ((existing.amount_paid_cents || 0) > 0) {
      return NextResponse.json({ error: 'Cannot void invoice with payments — refund first' }, { status: 400 })
    }

    // The amount_paid_cents check above is check-then-act, not atomic: if a
    // payment lands (POST .../record-payment, or the Stripe webhook) between
    // the SELECT above and this UPDATE, the trigger in 027_invoices.sql has
    // already bumped amount_paid_cents/status to 'partial' or 'paid' by the
    // time this UPDATE runs — but this UPDATE had no re-check, so it blindly
    // overwrote that status back to 'void', leaving a real payment recorded
    // against a "voided" invoice (money received, invoice reported as not
    // owed and not paid — invisible to ar-aging either way). Re-assert
    // amount_paid_cents = 0 IN THE UPDATE'S OWN WHERE clause (the current DB
    // value, not the stale `existing` snapshot) so a concurrent payment wins
    // the race instead of being silently erased.
    const { data: voided, error } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'void', voided_at: new Date().toISOString(), void_reason: reason || null })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('amount_paid_cents', 0)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!voided) {
      return NextResponse.json(
        { error: 'A payment was recorded on this invoice concurrently — refresh and refund instead of voiding' },
        { status: 409 },
      )
    }

    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: 'voided',
      detail: { reason },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/invoices/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
