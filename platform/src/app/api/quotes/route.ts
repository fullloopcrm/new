/**
 * Quotes — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
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

    if (status) q = q.eq('status', status)
    if (clientId) q = q.eq('client_id', clientId)

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

    const quote_number = body.quote_number || (await generateQuoteNumber(tenantId))
    const public_token = generatePublicToken()

    const { data, error } = await supabaseAdmin
      .from('quotes')
      .insert({
        tenant_id: tenantId,
        client_id: body.client_id || null,
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

    return NextResponse.json({ quote: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes', err)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}
