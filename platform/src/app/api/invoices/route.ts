/**
 * Invoices — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl, getDefaultEntityId, isEntityOwnedByTenant } from '@/lib/entity'
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
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const bookingId = url.searchParams.get('booking_id')
    const overdueOnly = url.searchParams.get('overdue') === '1'
    const entityId = entityIdFromUrl(url)
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100)

    let q = supabaseAdmin
      .from('invoices')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
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
    const body = await request.json()

    // Optional: generate from booking
    let prefillLineItems: unknown[] | null = null
    let prefillContact: Record<string, unknown> = {}
    if (body.from_booking_id) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, clients(id, name, email, phone, address), service_types(name, default_hourly_rate, pricing_model)')
        .eq('tenant_id', tenantId)
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
      const { data: quote } = await supabaseAdmin
        .from('quotes')
        .select('*')
        .eq('tenant_id', tenantId)
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

    const due_date =
      body.due_date ||
      (body.due_days ? new Date(Date.now() + Number(body.due_days) * 86400000).toISOString().slice(0, 10) : null)
    // A foreign entity_id here is a dangling cross-tenant reference (other
    // finance routes join entities(name) by entity_id) -- keep it in-tenant.
    if (body.entity_id && !(await isEntityOwnedByTenant(tenantId, body.entity_id))) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }
    const entityId = body.entity_id || (await getDefaultEntityId(tenantId))

    // Confirm a directly-supplied client (not one derived from an
    // already-tenant-scoped booking/quote lookup above) belongs to this
    // tenant -- otherwise a foreign client_id gets its name/email/phone/
    // address pulled into this tenant's invoice via the GET join, a
    // cross-tenant PII leak.
    const directClientId = typeof body.client_id === 'string' && body.client_id ? body.client_id : null
    if (directClientId) {
      const { data: c } = await supabaseAdmin.from('clients').select('id').eq('id', directClientId).eq('tenant_id', tenantId).single()
      if (!c) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    const clientId = directClientId || (prefillContact as { client_id?: string }).client_id || null

    // invoice_number is derived from a COUNT() snapshot (generateInvoiceNumber),
    // so two concurrent creates in the same tenant/month can compute the same
    // number. The (tenant_id, invoice_number) unique index rejects the second
    // insert -- retry with a freshly generated number instead of 500ing what
    // is otherwise a legitimate concurrent request.
    const explicitInvoiceNumber = body.invoice_number as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const invoice_number = explicitInvoiceNumber || (await generateInvoiceNumber(tenantId))
      const public_token = generateInvoicePublicToken()
      const result = await supabaseAdmin
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          entity_id: entityId,
          client_id: clientId,
          booking_id: body.booking_id || body.from_booking_id || null,
          quote_id: body.quote_id || (prefillContact as { quote_id?: string }).quote_id || null,
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
        .single()
      if (!result.error) {
        data = result.data
        break
      }
      const isNumberCollision = result.error.code === '23505' && !explicitInvoiceNumber
      if (!isNumberCollision || attempt === 4) throw result.error
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
