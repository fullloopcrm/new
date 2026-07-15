/**
 * Quote by id — read, update (draft-only), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('quotes')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: activity } = await supabaseAdmin
      .from('quote_activity')
      .select('id, event_type, detail, created_at, ip_address, user_agent')
      .eq('quote_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ quote: data, activity: activity || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
      .from('quotes')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'accepted' || existing.status === 'converted') {
      return NextResponse.json({ error: 'Cannot edit accepted or converted quotes' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    const assignables = [
      'title', 'description',
      'contact_name', 'contact_email', 'contact_phone', 'service_address',
      'terms', 'notes', 'valid_until', 'client_id', 'tiers',
    ] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    // A foreign client_id here would be joined back as clients(name, email,
    // phone, address) on every subsequent GET -- a cross-tenant PII leak if
    // not scoped to this tenant (same class already guarded on quote create).
    if ('client_id' in updates && updates.client_id) {
      const { data: c } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', updates.client_id as string)
        .eq('tenant_id', tenantId)
        .single()
      if (!c) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if ('line_items' in body || 'tax_rate_bps' in body || 'discount_cents' in body) {
      const { data: current } = await supabaseAdmin
        .from('quotes')
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

    // Deposit — resolve against the (possibly just-recomputed) total.
    if ('deposit_type' in body || 'deposit_value' in body) {
      const dtype = ['flat', 'percent'].includes(body.deposit_type) ? body.deposit_type : 'none'
      const dval = Math.max(0, Math.round(Number(body.deposit_value) || 0))
      let total = updates.total_cents as number | undefined
      if (total == null) {
        const { data: c2 } = await supabaseAdmin.from('quotes').select('total_cents').eq('id', id).single()
        total = Number(c2?.total_cents) || 0
      }
      updates.deposit_type = dtype
      updates.deposit_value = dval
      updates.deposit_cents =
        dtype === 'flat' ? Math.min(dval, total)
        : dtype === 'percent' ? Math.round((total * dval) / 10000)
        : 0
    }

    // Recurring intent. Only touch recurring columns when actually going
    // recurring, so normal (one-off) autosaves don't reference the new columns
    // on a pre-migration DB. Setting a cadence makes the sale spin up a
    // recurring_schedules series on close (see sale-to-recurring.ts).
    const RECURRING_TYPES = ['weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday']
    if (RECURRING_TYPES.includes(body.recurring_type)) {
      updates.recurring_type = body.recurring_type
      updates.recurring_start_date = body.recurring_start_date || null
      updates.recurring_preferred_time = body.recurring_preferred_time || null
      updates.recurring_duration_hours = body.recurring_duration_hours ? Number(body.recurring_duration_hours) : null
    }
    // Fulfillment routing — only touch the column when a valid value is sent
    // (keeps pre-migration one-off saves from referencing it).
    if (['booking', 'project'].includes(body.fulfillment_type)) {
      updates.fulfillment_type = body.fulfillment_type
    }

    const { data, error } = await supabaseAdmin
      .from('quotes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    // Autosave passes silent:true so a draft being typed doesn't spam the
    // activity log with an 'edited' row on every keystroke-debounce.
    if (!body.silent) {
      await logQuoteEvent({
        quote_id: id,
        tenant_id: tenantId,
        event_type: 'edited',
        detail: { fields: Object.keys(updates) },
      })
    }
    return NextResponse.json({ quote: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { data: existing } = await supabaseAdmin
      .from('quotes')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'accepted' || existing.status === 'converted') {
      return NextResponse.json({ error: 'Cannot delete accepted or converted quotes' }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('quotes').delete().eq('tenant_id', tenantId).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
