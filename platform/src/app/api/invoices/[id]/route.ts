/**
 * Invoice by id — read, update (pre-sent only), void.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { normalizeLineItems, computeTotals, logInvoiceEvent } from '@/lib/invoice'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

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
    const { tenantId } = await getTenantForRequest()
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
      const { error } = await supabaseAdmin.from('invoices').delete().eq('tenant_id', tenantId).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true, hard: true })
    }

    if (['void', 'refunded'].includes(existing.status)) {
      return NextResponse.json({ error: `Already ${existing.status}` }, { status: 400 })
    }
    if ((existing.amount_paid_cents || 0) > 0) {
      return NextResponse.json({ error: 'Cannot void invoice with payments — refund first' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'void', voided_at: new Date().toISOString(), void_reason: reason || null })
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
