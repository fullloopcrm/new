/**
 * Public quote view + accept + decline. Token-authenticated (no tenant session).
 * GET /api/quotes/public/[token]       — render payload + record view
 * POST /api/quotes/public/[token]/accept — body: { signature_png, signature_name, accepted_tier? }
 * POST /api/quotes/public/[token]/decline — body: { reason? }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeHtml } from '@/lib/escape-html'

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

    // Public, unauthenticated, DB-write-per-request (view_count/last_viewed_at
    // bump + a quote_events insert) — cap so a scripted poller can't churn
    // writes indefinitely. Mirrors the guard on /api/leads/visits and /api/track.
    const ip = ipFromRequest(request) || 'unknown'
    const rl = await rateLimitDb(`quote-public:${ip}`, 30, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*, tenants!inner(name, slug, domain, phone, email, address, logo_url, primary_color, status)')
      .eq('public_token', token)
      .eq('tenants.status', 'active')
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Expire if past valid_until
    if (quote.valid_until && quote.status === 'sent') {
      const validUntil = new Date(quote.valid_until as string)
      if (validUntil < new Date()) {
        await supabaseAdmin.from('quotes').update({ status: 'expired' }).eq('id', quote.id)
        quote.status = 'expired'
        await logQuoteEvent({ quote_id: quote.id, tenant_id: quote.tenant_id, event_type: 'expired' })

        // Archetype depth (same class as this file's own quote_viewed fix
        // below): 'quote_expired' has been a declared NotificationType since
        // notify.ts's beginning, and this exact transition — the only place
        // in the codebase that ever sets a quote's status to 'expired' —
        // already does the full quote_events bookkeeping its sibling
        // accept/decline transitions do, but never fired notify()/ownerAlert()
        // the way both of those one-shot terminal events do. A proposal
        // dying silently with no owner signal is exactly the "declared type,
        // real tracking, never wired" gap items (63)/(65) fixed elsewhere —
        // this is the one instance of that class living in the same file,
        // one function above the already-fixed quote_viewed case. Naturally
        // one-shot: this block only runs while status is still 'sent', so a
        // quote already 'expired' never re-enters it on a later visit.
        try {
          const { notify } = await import('@/lib/notify')
          await notify({
            tenantId: quote.tenant_id,
            type: 'quote_expired',
            title: `Quote ${quote.quote_number} expired`,
            message: `${quote.contact_name || 'The customer'}'s proposal passed its valid-until date without being accepted`,
            channel: 'email',
            recipientType: 'admin',
            metadata: { quote_id: quote.id, href: `/admin/sales-hub/quotes/${quote.id}` },
          })
        } catch (e) {
          console.warn('notify quote_expired failed', e)
        }

        const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
        await ownerAlert({
          tenantId: quote.tenant_id,
          subject: `Expired — ${quote.quote_number}`,
          kicker: 'Proposal expired',
          heading: `${quote.quote_number} expired unsigned`,
          bodyHtml: `<p style="margin:0">${escapeHtml(quote.contact_name || 'The customer')}'s proposal passed its valid-until date without being accepted — worth a follow-up if it's still live.</p>`,
          sms: `${quote.contact_name || 'A customer'}'s proposal ${quote.quote_number} expired unsigned.`,
        })
      }
    }

    // Record view — first view bumps status to 'viewed'
    const now = new Date().toISOString()
    const isFirstView = !quote.first_viewed_at
    const update: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (quote.view_count || 0) + 1,
    }
    if (isFirstView) update.first_viewed_at = now
    if (quote.status === 'sent') update.status = 'viewed'

    await supabaseAdmin.from('quotes').update(update).eq('id', quote.id)

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'viewed',
      ip_address: ipFromRequest(request),
      user_agent: request.headers.get('user-agent'),
    })

    // Fresh-ground fix: 'quote_viewed' has been a declared NotificationType
    // since this file's sibling accept/decline routes were built, but no call
    // site ever fired it — the owner's most actionable early signal ("they're
    // looking at it right now") was tracked in quote_events/first_viewed_at
    // and otherwise never surfaced on any channel. Only on the FIRST view —
    // view_count increments on every refresh, and neither the in-app record
    // nor the owner's inbox should churn on repeat opens the way accept/decline
    // (one-shot terminal events) don't need to guard against.
    if (isFirstView) {
      try {
        const { notify } = await import('@/lib/notify')
        await notify({
          tenantId: quote.tenant_id,
          type: 'quote_viewed',
          title: `Quote ${quote.quote_number} viewed`,
          message: `${quote.contact_name || 'The customer'} opened this proposal for the first time`,
          channel: 'email',
          recipientType: 'admin',
          metadata: { quote_id: quote.id, href: `/admin/sales-hub/quotes/${quote.id}` },
        })
      } catch (e) {
        console.warn('notify quote_viewed failed', e)
      }

      const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
      await ownerAlert({
        tenantId: quote.tenant_id,
        subject: `Viewed — ${quote.quote_number}`,
        kicker: 'Proposal viewed',
        heading: `${quote.contact_name || 'The customer'} opened ${quote.quote_number}`,
        bodyHtml: `<p style="margin:0">They just viewed this proposal for the first time — good moment to follow up.</p>`,
        sms: `${quote.contact_name || 'A customer'} just viewed ${quote.quote_number}.`,
      })
    }

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
