/**
 * Quote by id — read, update (draft-only), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

// Full enum: 026_quotes.sql — everything except accepted/converted stays
// editable (including declined/expired, e.g. to reopen and resend).
const EDITABLE_STATUSES = ['draft', 'sent', 'viewed', 'declined', 'expired']

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.view')
    if (authError) return authError
    const { tenantId } = tenant
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
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
      .from('quotes')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot edit accepted or converted quotes' }, { status: 400 })
    }

    // client_id is a cross-table FK — confirm it belongs to this tenant before
    // writing it, or a caller could reassign the quote to another tenant's
    // client and exfiltrate that client's name/email/phone/address via the
    // clients() join on this same route's GET.
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
      'terms', 'notes', 'valid_until', 'client_id', 'tiers',
    ] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

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

    // Check-then-act, not atomic: the guard above reads `existing.status`
    // once, but the public accept route (POST
    // /api/quotes/public/[token]/accept) can land between that read and this
    // write -- it's already CAS-guarded on its own end, so it always wins a
    // true race, but without re-asserting the editable-status set in THIS
    // update's own WHERE, this blind write would still silently overwrite
    // the line_items/totals/deposit a customer just signed off on, out from
    // under the deal/booking that accept just spun up from the ORIGINAL
    // values.
    const { data, error } = await supabaseAdmin
      .from('quotes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .in('status', EDITABLE_STATUSES)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'This quote was accepted or converted concurrently — refresh instead of editing' },
        { status: 409 },
      )
    }

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
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const { data: existing } = await supabaseAdmin
      .from('quotes')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot delete accepted or converted quotes' }, { status: 400 })
    }
    // Same TOCTOU class as PATCH above: re-assert the editable-status set in
    // the DELETE's own WHERE so a quote accepted concurrently (between the
    // read above and this delete) survives instead of being erased along
    // with the deal/booking that accept just created from it.
    const { data: deleted, error } = await supabaseAdmin
      .from('quotes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .in('status', EDITABLE_STATUSES)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!deleted) {
      return NextResponse.json(
        { error: 'This quote was accepted or converted concurrently — refresh instead of deleting' },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
