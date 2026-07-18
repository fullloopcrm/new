/**
 * Quotes — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import {
  normalizeLineItems,
  computeTotals,
  generatePublicToken,
  generateQuoteNumber,
  logQuoteEvent,
} from '@/lib/quote'

export async function GET(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.view')
    if (authError) return authError
    const { tenantId } = tenant
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
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
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

    const explicitQuoteNumber = Boolean(body.quote_number)
    let quote_number = body.quote_number || (await generateQuoteNumber(tenantId))
    let public_token = generatePublicToken()

    // client_id/deal_id are cross-table FKs — confirm each belongs to this
    // tenant before writing it, or a caller could attach the quote to another
    // tenant's client and exfiltrate that client's name/email/phone/address via
    // the clients() join on this route's own GET and quotes/[id]'s GET (same
    // class already fixed on PATCH /api/quotes/[id] but missed here on create).
    let client_id = body.client_id || null
    const deal_id = body.deal_id || null
    const linked_job_id = body.linked_job_id || null

    // Change order: linking a proposal to an existing job resolves the
    // client FROM the job, ignoring any client_id the caller sent — a job
    // already has exactly one client and the two must never disagree (see
    // migrations/2026_07_18_quotes_linked_job_id.sql).
    if (linked_job_id) {
      const { data: linkedJob } = await supabaseAdmin
        .from('jobs')
        .select('id, client_id')
        .eq('id', linked_job_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!linkedJob) return NextResponse.json({ error: 'Invalid linked_job_id' }, { status: 400 })
      client_id = (linkedJob.client_id as string) || null
    } else if (client_id) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!client) return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }
    if (deal_id) {
      const { data: deal } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('id', deal_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!deal) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })
    }

    // idx_quotes_tenant_number (026_quotes.sql) uniquely constrains
    // (tenant_id, quote_number). Two concurrent creates in the same
    // tenant+month both read the same monthly count from generateQuoteNumber
    // (non-atomic SELECT-count, not a DB sequence) and collide on insert.
    // Pre-fix this threw the raw 23505 as an unhandled 500 for a legitimate
    // concurrent request. Auto-generated numbers/tokens are safe to retry with
    // a freshly regenerated value; a caller-supplied quote_number collision is
    // a real conflict and gets a 409 instead of silently being renumbered.
    const MAX_NUMBER_ATTEMPTS = 5
    let data, error
    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      ;({ data, error } = await supabaseAdmin
        .from('quotes')
        .insert({
          tenant_id: tenantId,
          client_id,
          deal_id,
          linked_job_id,
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
        .single())
      if (!error) break
      if (error.code !== '23505' || explicitQuoteNumber) break
      quote_number = await generateQuoteNumber(tenantId)
      public_token = generatePublicToken()
    }
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Quote number already in use' }, { status: 409 })
      }
      throw error
    }

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
