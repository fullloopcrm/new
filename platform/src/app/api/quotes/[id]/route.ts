/**
 * Quote by id — read, update (draft-only), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, computeTotals, logQuoteEvent, capQuoteTextField } from '@/lib/quote'
import { seedQuoteBudgetFromTemplate } from '@/lib/budget-template'

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
    // Same length caps as create (POST /api/quotes) -- an edit/autosave is an
    // equally-reachable write path for the uncapped-string class fixed there.
    const cappedTextFields = [
      'title', 'description', 'contact_name', 'contact_email', 'contact_phone',
      'service_address', 'terms', 'notes',
    ] as const
    for (const k of cappedTextFields) if (k in body) updates[k] = capQuoteTextField(k, body[k])
    const assignables = ['valid_until', 'client_id', 'tiers'] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    // Confirm a reassigned client_id belongs to this tenant -- otherwise a
    // foreign client's name/email/phone/address gets pulled into this quote
    // via the clients() join on GET (same class already fixed on
    // deals/[id] PATCH and quotes/invoices create in 7907701b).
    if ('client_id' in updates && updates.client_id) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients').select('id').eq('id', updates.client_id as string).eq('tenant_id', tenantId).single()
      if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
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

    // Atomic re-check: the accepted/converted guard above (`existing.status`)
    // was read via a plain SELECT snapshot before this write. A concurrent
    // customer accept() (or a convert-to-job) landing in that gap would
    // otherwise still let this staff edit through unconditionally, silently
    // rewriting line items/totals/deposit on a quote the customer just
    // accepted -- possibly after they've already paid a deposit against the
    // pre-edit total. `.eq('status', existing.status)` makes the write
    // conditional on the status actually still being what was just read,
    // same compare-and-swap pattern already applied to the public quote
    // view route's status transitions.
    const { data, error } = await supabaseAdmin
      .from('quotes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', existing.status)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Quote status changed concurrently — reload and try again' }, { status: 409 })
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

    // Covers the common "create blank draft, then add line items via
    // autosave" flow -- POST /api/quotes already seeds a budget when items
    // are present at creation, but a quote started empty only gets its line
    // items here. No-ops once a budget row exists (see
    // seedQuoteBudgetFromTemplate).
    if ('line_items' in updates) {
      await seedQuoteBudgetFromTemplate(tenantId, id, updates.line_items as { name?: string; quantity?: number }[])
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
    // Atomic re-check: the accepted/converted guard above read a plain
    // SELECT snapshot. A concurrent customer accept() landing in the gap
    // between that read and this delete would otherwise still let the
    // delete through, destroying a quote the customer just accepted (and
    // any deposit-checkout flow already in progress against it).
    // `.eq('status', existing.status)` guards the delete on the status
    // actually still holding at delete time.
    const { data: deleted, error } = await supabaseAdmin
      .from('quotes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', existing.status)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!deleted) {
      return NextResponse.json({ error: 'Quote status changed concurrently — reload and try again' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/quotes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
