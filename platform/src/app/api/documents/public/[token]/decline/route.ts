import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logDocEvent } from '@/lib/documents'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeHtml } from '@/lib/escape-html'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params

    // Public, unauthenticated action endpoint — same guard as the sibling
    // quote/invoice public routes.
    const rlIp = ipFromRequest(request) || 'unknown'
    const rl = await rateLimitDb(`document-decline:${rlIp}`, 15, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = String(body.reason || '').slice(0, 500)

    const { data: signer } = await supabaseAdmin
      .from('document_signers')
      .select('id, document_id, tenant_id, status, name')
      .eq('public_token', token)
      .maybeSingle()
    if (!signer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (signer.status === 'signed') return NextResponse.json({ error: 'Already signed' }, { status: 400 })

    // Prevent re-opening a terminal-state document via decline.
    const { data: parent } = await supabaseAdmin
      .from('documents')
      .select('status, title')
      .eq('id', signer.document_id)
      .maybeSingle()
    if (parent && ['voided', 'completed', 'expired', 'declined'].includes(parent.status)) {
      return NextResponse.json({ error: `Document is ${parent.status}` }, { status: 400 })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')
    const now = new Date().toISOString()

    await supabaseAdmin
      .from('document_signers')
      .update({ status: 'declined', declined_at: now, decline_reason: reason || null })
      .eq('id', signer.id)

    // Any decline = doc declined (per product decision)
    await supabaseAdmin
      .from('documents')
      .update({ status: 'declined' })
      .eq('id', signer.document_id)

    await logDocEvent({
      document_id: signer.document_id,
      tenant_id: signer.tenant_id,
      signer_id: signer.id,
      event_type: 'declined',
      detail: { reason },
      ip_address: ip,
      user_agent: ua,
    })

    // Every other public accept/decline flow (quotes) alerts the tenant admin
    // on decline — this route never did, for any document lifecycle event
    // (consent, sign, decline, completion). A signer declining left the admin
    // with no way to know short of manually checking the dashboard. Mirrors
    // quotes/public/[token]/decline/route.ts's notify()+ownerAlert() pair.
    const docTitle = parent?.title || 'Document'
    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId: signer.tenant_id,
        type: 'document_declined',
        title: `${docTitle} declined`,
        message: reason ? `Reason: ${reason}` : 'No reason given',
        channel: 'email',
        recipientType: 'admin',
        metadata: { document_id: signer.document_id, signer_id: signer.id },
      })
    } catch (e) {
      console.warn('notify document_declined failed', e)
    }

    const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
    await ownerAlert({
      tenantId: signer.tenant_id,
      subject: `Document declined — ${docTitle}`,
      kicker: 'Document declined',
      heading: `${docTitle} was declined`,
      bodyHtml: `<p style="margin:0 0 12px">${escapeHtml(signer.name || 'The signer')} declined this document.</p>${reason ? `<p style="margin:0"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : '<p style="margin:0;color:#807B70">No reason given.</p>'}`,
      sms: `${docTitle} declined by ${signer.name || 'the signer'}${reason ? `: ${reason}` : ''}.`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/documents/public/[token]/decline', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
