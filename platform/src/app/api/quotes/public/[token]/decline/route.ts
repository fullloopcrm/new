/**
 * Public quote decline.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'
import { escapeHtml } from '@/lib/escape-html'
import { rateLimitDb } from '@/lib/rate-limit-db'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params

    // Public, unauthenticated action endpoint — same guard as the sibling
    // accept route (fires owner email/SMS + deal activity on every call).
    const ip = ipFromRequest(request) || 'unknown'
    const rl = await rateLimitDb(`quote-public-decline:${ip}`, 10, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = String(body.reason || '').slice(0, 500)

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, tenant_id, status, quote_number, deal_id')
      .eq('public_token', token)
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (quote.status === 'accepted' || quote.status === 'converted') {
      return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
    }

    await supabaseAdmin
      .from('quotes')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        declined_reason: reason || null,
      })
      .eq('id', quote.id)

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'declined',
      detail: { reason },
      ip_address: ipFromRequest(request),
      user_agent: request.headers.get('user-agent'),
    })

    // Log the decline on the deal timeline. Leave the stage where it is — the
    // operator decides whether to re-quote or mark it Lost.
    if (quote.deal_id) {
      await supabaseAdmin.from('deal_activities').insert({
        tenant_id: quote.tenant_id,
        deal_id: quote.deal_id,
        type: 'note',
        description: `Proposal ${quote.quote_number} declined${reason ? ` — ${reason}` : ''}`,
        metadata: { quote_id: quote.id, declined_reason: reason || null },
      }).then(() => {}, () => {})
    }

    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId: quote.tenant_id,
        type: 'quote_declined',
        title: `Quote ${quote.quote_number} declined`,
        message: reason ? `Reason: ${escapeHtml(reason)}` : 'No reason given',
        channel: 'email',
        recipientType: 'admin',
        metadata: { quote_id: quote.id },
      })
    } catch (e) {
      console.warn('notify quote_declined failed', e)
    }

    const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
    await ownerAlert({
      tenantId: quote.tenant_id,
      subject: `Proposal declined — ${quote.quote_number}`,
      kicker: 'Proposal declined',
      heading: `${quote.quote_number} was declined`,
      bodyHtml: `<p style="margin:0 0 12px">The customer declined this proposal.</p>${reason ? `<p style="margin:0"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : '<p style="margin:0;color:#807B70">No reason given.</p>'}`,
      sms: `Proposal ${quote.quote_number} declined${reason ? `: ${reason}` : ''}. Re-quote or mark it lost.`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/quotes/public/[token]/decline', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
