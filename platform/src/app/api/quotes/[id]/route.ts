/**
 * Quote by id — read, update (draft-only), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { normalizeLineItems, computeTotals, logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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
      .select('id, event_type, detail, created_at')
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
    const { tenantId } = await getTenantForRequest()
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

    const { data, error } = await supabaseAdmin
      .from('quotes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    await logQuoteEvent({
      quote_id: id,
      tenant_id: tenantId,
      event_type: 'edited',
      detail: { fields: Object.keys(updates) },
    })
    return NextResponse.json({ quote: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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
