/**
 * Public invoice view (token-auth). Records view + expires past due date.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logInvoiceEvent } from '@/lib/invoice'
import { nowNaiveET } from '@/lib/recurring'

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
    const baseUpdate: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (invoice.view_count || 0) + 1,
    }
    if (!invoice.first_viewed_at) baseUpdate.first_viewed_at = now

    let nextStatus: string | null = null
    if (invoice.status === 'sent') nextStatus = 'viewed'
    // due_date is a DATE column (calendar day, no time) meant in the
    // business's local (ET) terms. `new Date(due_date) < new Date()` parsed
    // it as UTC midnight and compared it to the real instant -- UTC midnight
    // of the due date is 8pm ET the EVENING BEFORE (EDT) / 7pm ET (EST), so
    // an invoice went "overdue" up to ~28h before its due date had even
    // fully elapsed in ET. Compare ET calendar dates directly instead: only
    // overdue once ET's "today" has moved past the due date.
    if (invoice.due_date && !['paid', 'void', 'refunded'].includes(invoice.status)) {
      if (nowNaiveET().slice(0, 10) > (invoice.due_date as string) && invoice.status !== 'overdue') nextStatus = 'overdue'
    }

    // Check-then-act, not atomic: `invoice.status` above is a stale snapshot --
    // a concurrent payment (record-payment, Stripe webhook) can land between
    // that read and this write. Re-assert the pre-read status in THIS update's
    // own WHERE so a payment that just landed (bumping status to
    // 'partial'/'paid') can't be silently reverted to 'viewed'/'overdue'.
    const { data: updated } = await supabaseAdmin
      .from('invoices')
      .update(nextStatus ? { ...baseUpdate, status: nextStatus } : baseUpdate)
      .eq('id', invoice.id)
      .eq('status', invoice.status)
      .select('status')
      .maybeSingle()

    let finalStatus = updated?.status ?? invoice.status
    if (!updated) {
      // Status changed concurrently — record the view metadata only, and
      // reflect the current (not stale) status in the response below.
      await supabaseAdmin.from('invoices').update(baseUpdate).eq('id', invoice.id)
      const { data: current } = await supabaseAdmin.from('invoices').select('status').eq('id', invoice.id).maybeSingle()
      finalStatus = current?.status ?? invoice.status
    }

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
      status: finalStatus,
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
