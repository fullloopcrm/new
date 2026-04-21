/**
 * Public quote view + accept + decline. Token-authenticated (no tenant session).
 * GET /api/quotes/public/[token]       — render payload + record view
 * POST /api/quotes/public/[token]/accept — body: { signature_png, signature_name, accepted_tier? }
 * POST /api/quotes/public/[token]/decline — body: { reason? }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  )
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*, tenants(name, slug, domain, phone, email, logo_url, primary_color)')
      .eq('public_token', token)
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Expire if past valid_until
    if (quote.valid_until && quote.status === 'sent') {
      const validUntil = new Date(quote.valid_until as string)
      if (validUntil < new Date()) {
        await supabaseAdmin.from('quotes').update({ status: 'expired' }).eq('id', quote.id)
        quote.status = 'expired'
        await logQuoteEvent({ quote_id: quote.id, tenant_id: quote.tenant_id, event_type: 'expired' })
      }
    }

    // Record view — first view bumps status to 'viewed'
    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (quote.view_count || 0) + 1,
    }
    if (!quote.first_viewed_at) update.first_viewed_at = now
    if (quote.status === 'sent') update.status = 'viewed'

    await supabaseAdmin.from('quotes').update(update).eq('id', quote.id)

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'viewed',
      ip_address: ipFromRequest(request),
      user_agent: request.headers.get('user-agent'),
    })

    // Redact internal fields
    const publicQuote = {
      id: quote.id,
      quote_number: quote.quote_number,
      status: update.status || quote.status,
      title: quote.title,
      description: quote.description,
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      contact_phone: quote.contact_phone,
      service_address: quote.service_address,
      line_items: quote.line_items,
      tiers: quote.tiers,
      subtotal_cents: quote.subtotal_cents,
      tax_rate_bps: quote.tax_rate_bps,
      tax_cents: quote.tax_cents,
      discount_cents: quote.discount_cents,
      total_cents: quote.total_cents,
      terms: quote.terms,
      notes: quote.notes,
      valid_until: quote.valid_until,
      accepted_at: quote.accepted_at,
      declined_at: quote.declined_at,
      accepted_tier: quote.accepted_tier,
      signature_name: quote.signature_name,
      business: quote.tenants,
    }
    return NextResponse.json({ quote: publicQuote })
  } catch (err) {
    console.error('GET /api/quotes/public/[token]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
