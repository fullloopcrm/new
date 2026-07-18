/**
 * Quote by id — read, update (draft-only), delete.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, normalizeTiers, computeTotals, logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const { data, error } = await db
      .from('quotes')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: activity } = await db
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
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await db
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
    if ('tiers' in updates) updates.tiers = normalizeTiers(updates.tiers)

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
    // close together on the SAME quote (a line-item change and a discount
    // change from two tabs, or two autosave debounces overlapping — this
    // route's own 'silent' flag exists BECAUSE autosave fires on every
    // keystroke debounce) would otherwise both read the same stale snapshot
    // -- whichever write lands second silently reverts the other field to
    // what it read, with no error to either side. Guard the final write with
    // the row's updated_at (bumped by quotes_set_updated_at on every UPDATE)
    // so a write based on a stale read fails loudly instead of clobbering
    // silently.
    let pricingCasUpdatedAt: string | undefined
    if ('line_items' in body || 'tax_rate_bps' in body || 'discount_cents' in body) {
      const { data: current } = await db
        .from('quotes')
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

    // Deposit — resolve against the (possibly just-recomputed) total. When no
    // pricing fields were sent above, updates.total_cents is still undefined
    // here, so this does its own stale read of total_cents to compute against.
    // That read is just as vulnerable to the race the pricing block's CAS
    // guard exists for: a concurrent line-item/discount edit can bump
    // total_cents between this read and the write below, and without a CAS
    // guard this deposit-only write would land anyway, storing deposit_cents
    // computed off a total that's no longer current. Capture updated_at here
    // too (only if the pricing block above didn't already set it) so the same
    // eq('updated_at', ...) guard on the final write covers this path.
    if ('deposit_type' in body || 'deposit_value' in body) {
      const dtype = ['flat', 'percent'].includes(body.deposit_type) ? body.deposit_type : 'none'
      const dval = Math.max(0, Math.round(Number(body.deposit_value) || 0))
      let total = updates.total_cents as number | undefined
      if (total == null) {
        const { data: c2 } = await db.from('quotes').select('total_cents, updated_at').eq('id', id).single()
        total = Number(c2?.total_cents) || 0
        if (!pricingCasUpdatedAt) pricingCasUpdatedAt = c2?.updated_at as string | undefined
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

    let query = db
      .from('quotes')
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
        { error: pricingCasUpdatedAt ? 'Quote was changed by someone else — refresh and retry' : 'Not found' },
        { status: pricingCasUpdatedAt ? 409 : 404 },
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
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const { data: existing } = await db
      .from('quotes')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'accepted' || existing.status === 'converted') {
      return NextResponse.json({ error: 'Cannot delete accepted or converted quotes' }, { status: 400 })
    }
    const { error } = await db.from('quotes').delete().eq('tenant_id', tenantId).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
