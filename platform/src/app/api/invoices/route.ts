/**
 * Invoices — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import {
  normalizeLineItems,
  computeTotals,
  generateInvoicePublicToken,
  generateInvoiceNumber,
  logInvoiceEvent,
} from '@/lib/invoice'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const bookingId = url.searchParams.get('booking_id')
    const overdueOnly = url.searchParams.get('overdue') === '1'
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
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()

    // Optional: generate from booking
    let prefillLineItems: unknown[] | null = null
    let prefillContact: Record<string, unknown> = {}
    if (body.from_booking_id) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, clients(id, name, email, phone, address), service_types(name, default_hourly_rate)')
        .eq('tenant_id', tenantId)
        .eq('id', body.from_booking_id)
        .single()
      if (booking) {
        const hours = Number(booking.actual_hours) || 0
        const rate = Number(booking.service_types?.default_hourly_rate) || 0
        const total = Number(booking.price) || (hours && rate ? hours * rate : 0)
        prefillLineItems = total
          ? [{
              id: `li_${Date.now()}`,
              name: booking.service_types?.name || 'Service',
              description: booking.notes || null,
              quantity: hours || 1,
              unit_price_cents: Math.round((total / Math.max(1, hours)) * 100),
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

    const invoice_number = body.invoice_number || (await generateInvoiceNumber(tenantId))
    const public_token = generateInvoicePublicToken()
    const due_date =
      body.due_date ||
      (body.due_days ? new Date(Date.now() + Number(body.due_days) * 86400000).toISOString().slice(0, 10) : null)

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        client_id: body.client_id || (prefillContact as { client_id?: string }).client_id || null,
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
    if (error) throw error

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
