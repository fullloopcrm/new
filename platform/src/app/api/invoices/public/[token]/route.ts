/**
 * Public invoice view (token-auth). Records view + expires past due date.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logInvoiceEvent } from '@/lib/invoice'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*, tenants!inner(name, slug, domain, phone, email, logo_url, primary_color, status)')
      .eq('public_token', token)
      .eq('tenants.status', 'active')
      .maybeSingle()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (invoice.view_count || 0) + 1,
    }
    if (!invoice.first_viewed_at) update.first_viewed_at = now
    if (invoice.status === 'sent') update.status = 'viewed'

    // Check overdue
    if (invoice.due_date && !['paid', 'void', 'refunded'].includes(invoice.status)) {
      const due = new Date(invoice.due_date as string)
      if (due < new Date() && invoice.status !== 'overdue') {
        update.status = 'overdue'
      }
    }

    await supabaseAdmin.from('invoices').update(update).eq('id', invoice.id)

    await logInvoiceEvent({
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id,
      event_type: 'viewed',
      ip_address: ipFromRequest(request),
      user_agent: request.headers.get('user-agent'),
    })

    // Redact internal
    const publicInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: update.status || invoice.status,
      title: invoice.title,
      description: invoice.description,
      contact_name: invoice.contact_name,
      contact_email: invoice.contact_email,
      contact_phone: invoice.contact_phone,
      service_address: invoice.service_address,
      line_items: invoice.line_items,
      subtotal_cents: invoice.subtotal_cents,
      tax_rate_bps: invoice.tax_rate_bps,
      tax_cents: invoice.tax_cents,
      discount_cents: invoice.discount_cents,
      total_cents: invoice.total_cents,
      amount_paid_cents: invoice.amount_paid_cents,
      terms: invoice.terms,
      due_date: invoice.due_date,
      issued_at: invoice.issued_at,
      paid_at: invoice.paid_at,
      public_token: invoice.public_token,
      business: invoice.tenants,
    }
    return NextResponse.json({ invoice: publicInvoice })
  } catch (err) {
    console.error('GET /api/invoices/public/[token]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
