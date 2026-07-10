/**
 * Quotes — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { findForeignRef } from '@/lib/verify-tenant-refs'
import {
  normalizeLineItems,
  computeTotals,
  generatePublicToken,
  generateQuoteNumber,
  logQuoteEvent,
} from '@/lib/quote'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100)

    let q = supabaseAdmin
      .from('quotes')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    const dealId = url.searchParams.get('deal_id')
    if (status) q = q.eq('status', status)
    if (clientId) q = q.eq('client_id', clientId)
    if (dealId) q = q.eq('deal_id', dealId)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ quotes: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quotes', err)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()

    const lineItems = normalizeLineItems(body.line_items || [])
    const tax_rate_bps = Number(body.tax_rate_bps) || 0
    const discount_cents = Number(body.discount_cents) || 0
    const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)

    // Resolve the deposit into a concrete cents amount so the public page and
    // checkout never recompute. flat = cents; percent = basis points.
    const deposit_type = ['flat', 'percent'].includes(body.deposit_type) ? body.deposit_type : 'none'
    const deposit_value = Math.max(0, Math.round(Number(body.deposit_value) || 0))
    let deposit_cents = 0
    if (deposit_type === 'flat') deposit_cents = Math.min(deposit_value, totals.total_cents)
    else if (deposit_type === 'percent') deposit_cents = Math.round((totals.total_cents * deposit_value) / 10000)

    // Recurring intent: null = one-off (default). A set cadence makes the sale
    // spin up a recurring_schedules series on close (see sale-to-recurring.ts).
    const RECURRING_TYPES = ['weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday']
    const recurring_type = RECURRING_TYPES.includes(body.recurring_type) ? body.recurring_type : null
    const recurring_start_date = recurring_type ? body.recurring_start_date || null : null
    const recurring_preferred_time = recurring_type ? body.recurring_preferred_time || null : null
    const recurring_duration_hours = recurring_type && body.recurring_duration_hours ? Number(body.recurring_duration_hours) : null
    // Fulfillment: 'booking' (service → Bookings) | 'project' (→ Job board). null = project default.
    const fulfillment_type = ['booking', 'project'].includes(body.fulfillment_type) ? body.fulfillment_type : null

    const quote_number = body.quote_number || (await generateQuoteNumber(tenantId))
    const public_token = generatePublicToken()

    const foreign = await findForeignRef(tenantId, [
      { table: 'clients', ids: [body.client_id] },
      { table: 'deals', ids: [body.deal_id] },
    ])
    if (foreign) {
      return NextResponse.json({ error: `Unknown ${foreign.table.replace(/s$/, '').replace(/_/g, ' ')} for this account` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('quotes')
      .insert({
        tenant_id: tenantId,
        client_id: body.client_id || null,
        deal_id: body.deal_id || null,
        quote_number,
        status: 'draft',
        title: body.title || null,
        description: body.description || null,
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        service_address: body.service_address || null,
        line_items: lineItems,
        tiers: body.tiers || null,
        subtotal_cents: totals.subtotal_cents,
        tax_rate_bps,
        tax_cents: totals.tax_cents,
        discount_cents: totals.discount_cents,
        total_cents: totals.total_cents,
        terms: body.terms || null,
        notes: body.notes || null,
        valid_until: body.valid_until || null,
        deposit_type,
        deposit_value,
        deposit_cents,
        // Only reference recurring columns when actually recurring, so a
        // pre-migration DB still creates normal (one-off) quotes fine.
        ...(recurring_type
          ? { recurring_type, recurring_start_date, recurring_preferred_time, recurring_duration_hours }
          : {}),
        ...(fulfillment_type ? { fulfillment_type } : {}),
        public_token,
      })
      .select('*')
      .single()
    if (error) throw error

    await logQuoteEvent({
      quote_id: data.id,
      tenant_id: tenantId,
      event_type: 'created',
      detail: { quote_number: data.quote_number, total_cents: data.total_cents },
    })

    // Carry the proposal onto the deal's timeline so it shows in the pipeline.
    // Autosaved drafts pass silent:true to stay OFF the pipeline until sent —
    // the send route announces to the deal instead (see quotes/[id]/send).
    if (data.deal_id && !body.silent) {
      await supabaseAdmin.from('deal_activities').insert({
        tenant_id: tenantId,
        deal_id: data.deal_id,
        type: 'note',
        description: `Proposal ${data.quote_number} created — ${(data.total_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        metadata: { quote_id: data.id, quote_number: data.quote_number, total_cents: data.total_cents },
      })
      // Keep the deal's value in step with the proposal total.
      await supabaseAdmin
        .from('deals')
        .update({ value_cents: data.total_cents, last_activity_at: new Date().toISOString() })
        .eq('id', data.deal_id)
        .eq('tenant_id', tenantId)
    }

    return NextResponse.json({ quote: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes', err)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}
