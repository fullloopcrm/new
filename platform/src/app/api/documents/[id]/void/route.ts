import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { isTerminalStatus, logDocEvent } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = String(body.reason || '').slice(0, 500)

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (isTerminalStatus(doc.status)) return NextResponse.json({ error: `Already ${doc.status}` }, { status: 400 })

    await supabaseAdmin
      .from('documents')
      .update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: reason || null })
      .eq('id', id)

    await logDocEvent({
      document_id: id,
      tenant_id: tenantId,
      event_type: 'voided',
      detail: { reason },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
