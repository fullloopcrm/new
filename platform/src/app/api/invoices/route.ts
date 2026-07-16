/**
 * Invoices — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { entityIdFromUrl, getDefaultEntityId, verifyEntityId } from '@/lib/entity'
import {
  normalizeLineItems,
  computeTotals,
  generateInvoicePublicToken,
  generateInvoiceNumber,
  logInvoiceEvent,
} from '@/lib/invoice'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const bookingId = url.searchParams.get('booking_id')
    const overdueOnly = url.searchParams.get('overdue') === '1'
    const entityId = entityIdFromUrl(url)
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100)

    let q = db
      .from('invoices')
      .select('*, clients(id, name, email, phone, address)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) q = q.eq('status', status)
    if (clientId) q = q.eq('client_id', clientId)
    if (bookingId) q = q.eq('booking_id', bookingId)
    if (entityId) q = q.eq('entity_id', entityId)
    if (overdueOnly) {
      const today = new Date().toISOString().slice(0, 10)
      q = q.lt('due_date', today).not('status', 'in', '(paid,void,refunded)')
    }

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ invoices: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/invoices', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const body = await request.json()

    // Optional: generate from booking
    let prefillLineItems: unknown[] | null = null
    let prefillContact: Record<string, unknown> = {}
    if (body.from_booking_id) {
      const { data: booking } = await db
        .from('bookings')
        .select('*, clients(id, name, email, phone, address), service_types(name, default_hourly_rate, pricing_model)')
        .eq('id', body.from_booking_id)
        .single()
      if (booking) {
        const model = (booking.service_types?.pricing_model as string) || 'hourly'
        const hours = Number(booking.actual_hours) || 0
        const rate = Number(booking.service_types?.default_hourly_rate) || 0
        // booking.price is in CENTS. Fall back to hours×rate (converted to cents)
        // only when no price was recorded. (Prior code double-multiplied by 100.)
        const totalCents = Number(booking.price) || (hours && rate ? Math.round(hours * rate * 100) : 0)
        // Hourly → line reads "N hrs × $rate"; flat/per-unit → single "1 × total" line.
        const qty = model === 'hourly' ? (hours || 1) : 1
        prefillLineItems = totalCents
          ? [{
              id: `li_${Date.now()}`,
              name: booking.service_types?.name || 'Service',
              description: booking.notes || null,
              quantity: qty,
              unit_price_cents: Math.round(totalCents / Math.max(1, qty)),
            }]
          : []
        if (booking.clients) {
          prefillContact = {
            client_id: booking.clients.id,
            contact_name: booking.clients.name,
            contact_email: booking.clients.email,
            contact_phone: booking.clients.phone,
            service_address: booking.clients.address || booking.address,
          }
        }
      }
    }

    // Optional: generate from quote
    if (body.from_quote_id) {
      const { data: quote } = await db
        .from('quotes')
        .select('*')
        .eq('id', body.from_quote_id)
        .single()
      if (quote) {
        prefillLineItems = quote.line_items
        prefillContact = {
          client_id: quote.client_id,
          contact_name: quote.contact_name,
          contact_email: quote.contact_email,
          contact_phone: quote.contact_phone,
          service_address: quote.service_address,
          quote_id: quote.id,
          title: quote.title,
          description: quote.description,
          terms: quote.terms,
          tax_rate_bps: quote.tax_rate_bps,
          discount_cents: quote.discount_cents,
        }
      }
    }

    const rawItems = (body.line_items as unknown[] | undefined) || (prefillLineItems as unknown[] | undefined) || []
    const lineItems = normalizeLineItems(rawItems as Partial<import('@/lib/quote').QuoteLineItem>[])
    const tax_rate_bps =
      'tax_rate_bps' in body
        ? Number(body.tax_rate_bps)
        : Number((prefillContact as { tax_rate_bps?: number }).tax_rate_bps || 0)
    const discount_cents =
      'discount_cents' in body
        ? Number(body.discount_cents)
        : Number((prefillContact as { discount_cents?: number }).discount_cents || 0)
    const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)

    const explicitInvoiceNumber = Boolean(body.invoice_number)
    let invoice_number = body.invoice_number || (await generateInvoiceNumber(tenantId))
    let public_token = generateInvoicePublicToken()
    const due_date =
      body.due_date ||
      (body.due_days ? new Date(Date.now() + Number(body.due_days) * 86400000).toISOString().slice(0, 10) : null)
    // client_id/booking_id/quote_id/entity_id are cross-table FKs — confirm each
    // belongs to this tenant before writing it, or a caller could attach the
    // invoice to another tenant's client/booking/quote/entity and exfiltrate its
    // PII via the clients()/bookings() embeds used by this route's own GET, the
    // invoice list, and finance/ar-aging + finance/reconcile-candidates, or via
    // any entities() embed.
    const clientId = body.client_id || (prefillContact as { client_id?: string }).client_id || null
    const bookingId = body.booking_id || body.from_booking_id || null
    const quoteId = body.quote_id || (prefillContact as { quote_id?: string }).quote_id || null
    if (clientId) {
      const { data: client } = await db.from('clients').select('id').eq('id', clientId).maybeSingle()
      if (!client) return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }
    if (bookingId) {
      const { data: booking } = await db.from('bookings').select('id').eq('id', bookingId).maybeSingle()
      if (!booking) return NextResponse.json({ error: 'Invalid booking_id' }, { status: 400 })
    }
    if (quoteId) {
      const { data: quote } = await db.from('quotes').select('id').eq('id', quoteId).maybeSingle()
      if (!quote) return NextResponse.json({ error: 'Invalid quote_id' }, { status: 400 })
    }
    const entityId = body.entity_id
      ? await verifyEntityId(tenantId, body.entity_id)
      : (await getDefaultEntityId(tenantId))
    if (body.entity_id && !entityId) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 400 })
    }

    // idx_invoices_tenant_number (027_invoices.sql) uniquely constrains
    // (tenant_id, invoice_number). Two concurrent creates in the same
    // tenant+month both read the same monthly count from generateInvoiceNumber
    // (non-atomic SELECT-count, not a DB sequence) and collide on insert.
    // Pre-fix this threw the raw 23505 as an unhandled 500 for a legitimate
    // concurrent request (same class as the sibling POST /api/quotes fix).
    // Auto-generated numbers/tokens are safe to retry with a freshly
    // regenerated value; a caller-supplied invoice_number collision is a real
    // conflict and gets a 409 instead of silently being renumbered.
    const MAX_NUMBER_ATTEMPTS = 5
    let data, error
    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      ;({ data, error } = await db
        .from('invoices')
        .insert({
          entity_id: entityId,
          client_id: clientId,
          booking_id: bookingId,
          quote_id: quoteId,
          invoice_number,
          status: 'draft',
          title: body.title || (prefillContact as { title?: string }).title || null,
          description: body.description || (prefillContact as { description?: string }).description || null,
          contact_name: body.contact_name || (prefillContact as { contact_name?: string }).contact_name || null,
          contact_email: body.contact_email || (prefillContact as { contact_email?: string }).contact_email || null,
          contact_phone: body.contact_phone || (prefillContact as { contact_phone?: string }).contact_phone || null,
          service_address: body.service_address || (prefillContact as { service_address?: string }).service_address || null,
          line_items: lineItems,
          subtotal_cents: totals.subtotal_cents,
          tax_rate_bps,
          tax_cents: totals.tax_cents,
          discount_cents: totals.discount_cents,
          total_cents: totals.total_cents,
          terms: body.terms || (prefillContact as { terms?: string }).terms || null,
          notes: body.notes || null,
          due_date,
          public_token,
        })
        .select('*')
        .single())
      if (!error) break
      if (error.code !== '23505' || explicitInvoiceNumber) break
      invoice_number = await generateInvoiceNumber(tenantId)
      public_token = generateInvoicePublicToken()
    }
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Invoice number already in use' }, { status: 409 })
      }
      throw error
    }

    // Mark the source booking as billed so it's never picked up again by the
    // monthly rollup generator (cron/generate-monthly-invoices) or re-billed
    // standalone — bookings.invoice_id is the single "already invoiced" gate
    // shared by both paths.
    if (bookingId) {
      await db.from('bookings').update({ invoice_id: data.id }).eq('id', bookingId)
    }

    await logInvoiceEvent({
      invoice_id: data.id,
      tenant_id: tenantId,
      event_type: 'created',
      detail: {
        invoice_number: data.invoice_number,
        total_cents: data.total_cents,
        from: body.from_booking_id ? 'booking' : body.from_quote_id ? 'quote' : 'standalone',
      },
    })
    return NextResponse.json({ invoice: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/invoices', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
