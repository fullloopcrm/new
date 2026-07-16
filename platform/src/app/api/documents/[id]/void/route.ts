import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { isTerminalStatus, logDocEvent } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
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

    // Check-then-act, not atomic: `doc.status` was read once and validated
    // non-terminal above, but a concurrent signer completing the last
    // required signature (public sign route's finalizeDocument, which stamps
    // status='completed' + writes the signed PDF) can land in the gap. Without
    // re-asserting the pre-read status in THIS update's own WHERE, a void
    // click racing a signer's final signature would silently revert an
    // already-completed, already-emailed document back to 'voided'.
    const { data: voided } = await supabaseAdmin
      .from('documents')
      .update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: reason || null })
      .eq('id', id)
      .eq('status', doc.status)
      .select('id')
      .maybeSingle()
    if (!voided) {
      return NextResponse.json(
        { error: 'This document changed status concurrently — refresh and retry' },
        { status: 409 },
      )
    }

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
