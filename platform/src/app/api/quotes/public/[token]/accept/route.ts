/**
 * Public quote acceptance. Captures signature + name + IP + UA, transitions to 'accepted'.
 * Idempotent — safe to replay.
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

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const body = await request.json()
    const signature_png = String(body.signature_png || '')
    const signature_name = String(body.signature_name || '').trim()
    const accepted_tier = body.accepted_tier ? String(body.accepted_tier) : null

    if (!signature_png.startsWith('data:image/') || signature_png.length < 100) {
      return NextResponse.json({ error: 'Signature required' }, { status: 400 })
    }
    // Cap the signature payload — public endpoint, unauth, TEXT column on DB.
    if (signature_png.length > 500_000) {
      return NextResponse.json({ error: 'Signature image too large' }, { status: 400 })
    }
    if (!signature_name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, tenant_id, status, total_cents, quote_number')
      .eq('public_token', token)
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (quote.status === 'accepted' || quote.status === 'converted') {
      return NextResponse.json({ ok: true, already_accepted: true })
    }
    if (quote.status === 'declined' || quote.status === 'expired') {
      return NextResponse.json({ error: `Quote is ${quote.status}` }, { status: 400 })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')
    const acceptedAt = new Date().toISOString()

    await supabaseAdmin
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: acceptedAt,
        accepted_tier,
        signature_png,
        signature_name,
        signature_ip: ip,
        signature_user_agent: ua,
      })
      .eq('id', quote.id)

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'accepted',
      detail: { signature_name, accepted_tier, total_cents: quote.total_cents },
      ip_address: ip,
      user_agent: ua,
    })

    // Notify business owner — best-effort, don't fail the accept on notify errors
    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId: quote.tenant_id,
        type: 'quote_accepted',
        title: `Quote ${quote.quote_number} accepted`,
        message: `Signed by ${signature_name} — total $${(quote.total_cents / 100).toFixed(2)}`,
        channel: 'email',
        recipientType: 'admin',
        metadata: { quote_id: quote.id, href: `/admin/sales-hub/quotes/${quote.id}` },
      })
    } catch (e) {
      console.warn('notify quote_accepted failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/quotes/public/[token]/accept', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
