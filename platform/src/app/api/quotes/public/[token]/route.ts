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
      .select('*, tenants!inner(name, slug, domain, phone, email, address, logo_url, primary_color, status)')
      .eq('public_token', token)
      .eq('tenants.status', 'active')
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let effectiveStatus = quote.status as string

    // Expire if past valid_until. Guarded with a compare-and-swap on the
    // status just read — without it, a concurrent accept()/decline() that
    // already moved this quote to a terminal state (both of which claim
    // atomically) could have that result silently clobbered back to
    // 'expired' by this GET's stale read landing right after.
    if (quote.valid_until && quote.status === 'sent') {
      const validUntil = new Date(quote.valid_until as string)
      if (validUntil < new Date()) {
        const { data: claimedExpire } = await supabaseAdmin
          .from('quotes')
          .update({ status: 'expired' })
          .eq('id', quote.id)
          .eq('status', 'sent')
          .select('id')
          .maybeSingle()
        if (claimedExpire) {
          effectiveStatus = 'expired'
          await logQuoteEvent({ quote_id: quote.id, tenant_id: quote.tenant_id, event_type: 'expired' })
        }
      }
    }

    // Record view. View-tracking fields never conflict with a concurrent
    // accept/decline/expire, so they're safe to write unconditionally; the
    // 'sent'->'viewed' status bump is guarded the same compare-and-swap way
    // so it can't clobber a status this same request (or a concurrent
    // request) already moved on from.
    const now = new Date().toISOString()
    const viewUpdate: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (quote.view_count || 0) + 1,
    }
    if (!quote.first_viewed_at) viewUpdate.first_viewed_at = now
    await supabaseAdmin.from('quotes').update(viewUpdate).eq('id', quote.id)

    if (effectiveStatus === 'sent') {
      const { data: claimedView } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'viewed' })
        .eq('id', quote.id)
        .eq('status', 'sent')
        .select('status')
        .maybeSingle()
      if (claimedView) {
        effectiveStatus = claimedView.status as string
      } else {
        // Lost the race — a concurrent accept()/decline() already moved this
        // quote on. Re-fetch so the response reflects the row's real current
        // status instead of our stale 'sent' read.
        const { data: fresh } = await supabaseAdmin
          .from('quotes')
          .select('status')
          .eq('id', quote.id)
          .maybeSingle()
        effectiveStatus = (fresh?.status as string) || (quote.status as string)
      }
    }

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
      status: effectiveStatus,
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
      deposit_cents: quote.deposit_cents,
      deposit_paid_at: quote.deposit_paid_at,
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
