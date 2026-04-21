/**
 * Public quote decline.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const reason = String(body.reason || '').slice(0, 500)

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, tenant_id, status, quote_number')
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

    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId: quote.tenant_id,
        type: 'quote_declined',
        title: `Quote ${quote.quote_number} declined`,
        message: reason ? `Reason: ${reason}` : 'No reason given',
        channel: 'email',
        recipientType: 'admin',
        metadata: { quote_id: quote.id },
      })
    } catch (e) {
      console.warn('notify quote_declined failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/quotes/public/[token]/decline', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
