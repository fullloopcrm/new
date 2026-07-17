/**
 * Public quote view + accept + decline. Token-authenticated (no tenant session).
 * GET /api/quotes/public/[token]       — render payload + record view
 * POST /api/quotes/public/[token]/accept — body: { signature_png, signature_name, accepted_tier? }
 * POST /api/quotes/public/[token]/decline — body: { reason? }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'
import { nowNaiveET } from '@/lib/recurring'

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

    // Resolve the status transition (expire past valid_until, else bump
    // sent->viewed on first view) against the status as READ above, then apply
    // both it and the view-tracking fields in one write.
    const originalStatus = quote.status as string
    let nextStatus: string | null = null
    // valid_until is a DATE column (calendar day, no time) meant in the
    // business's local (ET) terms. `new Date(valid_until) < new Date()`
    // parsed it as UTC midnight and compared it to the real instant -- UTC
    // midnight of valid_until is 8pm ET the EVENING BEFORE (EDT) / 7pm ET
    // (EST), so a quote expired up to ~28h before valid_until had even fully
    // elapsed in ET, sometimes showing "expired" to the customer before
    // valid_until had even arrived. Compare ET calendar dates directly
    // instead: only expired once ET's "today" has moved past valid_until.
    if (quote.valid_until && originalStatus === 'sent') {
      if (nowNaiveET().slice(0, 10) > (quote.valid_until as string)) nextStatus = 'expired'
    }
    if (nextStatus === null && originalStatus === 'sent') nextStatus = 'viewed'

    const now = new Date().toISOString()
    const baseUpdate: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (quote.view_count || 0) + 1,
    }
    if (!quote.first_viewed_at) baseUpdate.first_viewed_at = now

    // Check-then-act, not atomic: `originalStatus` is a stale snapshot -- the
    // public accept/decline routes (already CAS-guarded on their own end) can
    // land between the read above and this write. Re-assert the pre-read
    // status in THIS update's own WHERE so a concurrent accept/decline can't
    // be silently reverted to 'expired'/'viewed'.
    const { data: updated } = await supabaseAdmin
      .from('quotes')
      .update(nextStatus ? { ...baseUpdate, status: nextStatus } : baseUpdate)
      .eq('id', quote.id)
      .eq('status', originalStatus)
      .select('status')
      .maybeSingle()

    let finalStatus = updated?.status ?? originalStatus
    if (!updated) {
      // Status changed concurrently — record the view metadata only, and
      // reflect the current (not stale) status in the response below.
      await supabaseAdmin.from('quotes').update(baseUpdate).eq('id', quote.id)
      const { data: current } = await supabaseAdmin.from('quotes').select('status').eq('id', quote.id).maybeSingle()
      finalStatus = current?.status ?? originalStatus
    } else if (nextStatus === 'expired') {
      await logQuoteEvent({ quote_id: quote.id, tenant_id: quote.tenant_id, event_type: 'expired' })
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
      status: finalStatus,
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
