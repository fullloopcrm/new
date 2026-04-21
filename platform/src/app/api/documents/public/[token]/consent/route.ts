/**
 * ESIGN Act consent acceptance. Must be called before signing.
 */
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

    const { data: signer } = await supabaseAdmin
      .from('document_signers')
      .select('id, document_id, tenant_id, consent_accepted_at')
      .eq('public_token', token)
      .maybeSingle()
    if (!signer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Block consent on terminal-state documents so we don't log consent on
    // voided/completed/expired docs (audit-trail hygiene).
    const { data: parent } = await supabaseAdmin
      .from('documents')
      .select('status')
      .eq('id', signer.document_id)
      .maybeSingle()
    if (parent && ['voided', 'completed', 'expired', 'declined'].includes(parent.status)) {
      return NextResponse.json({ error: `Document is ${parent.status}` }, { status: 400 })
    }

    if (signer.consent_accepted_at) {
      return NextResponse.json({ ok: true, already_accepted: true })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')

    await supabaseAdmin
      .from('document_signers')
      .update({
        consent_accepted_at: new Date().toISOString(),
        consent_ip: ip,
        consent_user_agent: ua,
      })
      .eq('id', signer.id)

    await logDocEvent({
      document_id: signer.document_id,
      tenant_id: signer.tenant_id,
      signer_id: signer.id,
      event_type: 'consent_accepted',
      ip_address: ip,
      user_agent: ua,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/documents/public/[token]/consent', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
