import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logDocEvent } from '@/lib/documents'

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

    const { data: signer } = await supabaseAdmin
      .from('document_signers')
      .select('id, document_id, tenant_id, status')
      .eq('public_token', token)
      .maybeSingle()
    if (!signer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (signer.status === 'signed') return NextResponse.json({ error: 'Already signed' }, { status: 400 })
    if (signer.status === 'declined') return NextResponse.json({ ok: true, already_declined: true })

    // Prevent re-opening a terminal-state document via decline.
    const { data: parent } = await supabaseAdmin
      .from('documents')
      .select('status')
      .eq('id', signer.document_id)
      .maybeSingle()
    if (parent && ['voided', 'completed', 'expired', 'declined'].includes(parent.status)) {
      return NextResponse.json({ error: `Document is ${parent.status}` }, { status: 400 })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')
    const now = new Date().toISOString()

    // Atomic claim — same pattern as ../sign/route.ts. Without the `.eq('status',
    // signer.status)` guard, two concurrent declines would both pass the checks
    // above and both write + both log a declined event, duplicating the audit
    // trail on a legally significant document.
    const { data: claimed } = await supabaseAdmin
      .from('document_signers')
      .update({ status: 'declined', declined_at: now, decline_reason: reason || null })
      .eq('id', signer.id)
      .eq('status', signer.status)
      .select('id')
      .maybeSingle()

    if (!claimed) {
      return NextResponse.json({ ok: true, already_declined: true })
    }

    // Any decline = doc declined (per product decision). Guard against the
    // same class of race as the signer claim above: an admin void/expire (or
    // the last signer completing) landing between the parent-status read at
    // the top of this request and this write would otherwise get silently
    // reverted back to 'declined'.
    await supabaseAdmin
      .from('documents')
      .update({ status: 'declined' })
      .eq('id', signer.document_id)
      .not('status', 'in', '(completed,declined,voided,expired)')

    await logDocEvent({
      document_id: signer.document_id,
      tenant_id: signer.tenant_id,
      signer_id: signer.id,
      event_type: 'declined',
      detail: { reason },
      ip_address: ip,
      user_agent: ua,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/documents/public/[token]/decline', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
