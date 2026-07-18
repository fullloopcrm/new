/**
 * Invoice by id — read, update (pre-sent only), void.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logInvoiceEvent } from '@/lib/invoice'
import { capString } from '@/lib/validate'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-scopes every query; invoice_activity + payments reads (by
    // invoice_id) and the PATCH line-item re-read (by id) GAIN a tenant filter.
    const db = tenantDb(tenantId)
    const { id } = await params
    const { data, error } = await db
      .from('invoices')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ data: activity }, { data: paymentsRows }] = await Promise.all([
      db
        .from('invoice_activity')
        .select('id, event_type, detail, created_at')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
      db
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
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await db
      .from('invoices')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['paid', 'partial', 'void', 'refunded'].includes(existing.status)) {
      return NextResponse.json({ error: `Cannot edit ${existing.status} invoice` }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    const assignables = [
      'title', 'description',
      'contact_name', 'contact_email', 'contact_phone', 'service_address',
      'terms', 'notes', 'due_date', 'client_id',
    ] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    // client_id is a caller-supplied FK — GET embeds clients(name/email/phone/
    // address) off this row, so a foreign id would leak another tenant's client
    // PII on the next read. Verify ownership before the update runs.
    if ('client_id' in updates && updates.client_id) {
      const { data: ownedClient } = await db
        .from('clients')
        .select('id')
        .eq('id', updates.client_id as string)
        .maybeSingle()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    // Pricing fields require a stale read to fall back on whichever of the
    // three wasn't sent (e.g. an edit that only touches discount_cents still
    // needs the CURRENT line_items to recompute totals). Two edits landing
    // close together on the SAME invoice (a line-item change and a discount
    // change from two tabs, or two autosave debounces overlapping) would
    // otherwise both read the same stale snapshot -- whichever write lands
    // second silently reverts the other field to what it read, with no error
    // to either side. Guard the final write with the row's updated_at (bumped
    // by invoices_set_updated_at on every UPDATE) so a write based on a
    // stale read fails loudly instead of clobbering silently.
    let pricingCasUpdatedAt: string | undefined
    if ('line_items' in body || 'tax_rate_bps' in body || 'discount_cents' in body) {
      const { data: current } = await db
        .from('invoices')
        .select('line_items, tax_rate_bps, discount_cents, updated_at')
        .eq('id', id)
        .single()
      pricingCasUpdatedAt = current?.updated_at as string | undefined
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

    let query = db
      .from('invoices')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (pricingCasUpdatedAt) query = query.eq('updated_at', pricingCasUpdatedAt)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw error
    if (!data) {
      // Either not found, or (when a pricing CAS guard was active) the row
      // changed under us between the read above and this write.
      return NextResponse.json(
        { error: pricingCasUpdatedAt ? 'Invoice was changed by someone else — refresh and retry' : 'Not found' },
        { status: pricingCasUpdatedAt ? 409 : 404 },
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
    const db = tenantDb(tenantId)
    const { id } = await params
    const url = new URL(request.url)
    const reason = capString(url.searchParams.get('reason'), 2000)
    const hard = url.searchParams.get('hard') === '1'

    const { data: existing } = await db
      .from('invoices')
      .select('status, amount_paid_cents')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (hard && existing.status === 'draft' && (existing.amount_paid_cents || 0) === 0) {
      const { error } = await db.from('invoices').delete().eq('tenant_id', tenantId).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true, hard: true })
    }

    if (['void', 'refunded'].includes(existing.status)) {
      return NextResponse.json({ error: `Already ${existing.status}` }, { status: 400 })
    }
    if ((existing.amount_paid_cents || 0) > 0) {
      return NextResponse.json({ error: 'Cannot void invoice with payments — refund first' }, { status: 400 })
    }

    const { error } = await db
      .from('invoices')
      .update({ status: 'void', voided_at: new Date().toISOString(), void_reason: reason })
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error

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
