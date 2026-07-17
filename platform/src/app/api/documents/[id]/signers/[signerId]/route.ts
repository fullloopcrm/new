/**
 * Edit/remove individual signer. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { isEditableStatus } from '@/lib/documents'

type Params = { params: Promise<{ id: string; signerId: string }> }

async function requireDraft(tenantId: string, docId: string) {
  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('id', docId)
    .single()
  if (!doc) return { error: 'Document not found', status: 404 }
  if (!isEditableStatus(doc.status)) return { error: 'Cannot modify signers on a sent doc. Void first.', status: 400 }
  return null
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id, signerId } = await params
    const check = await requireDraft(tenantId, id)
    if (check) return NextResponse.json({ error: check.error }, { status: check.status })

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['name', 'email', 'phone', 'role', 'order_index']) {
      if (k in body) updates[k] = body[k]
    }

    // Atomic claim — only edit a signer still at 'pending'. requireDraft()
    // above reads the *document's* status, which is racy against a
    // concurrent send(): send() flips document draft -> sent AND (once
    // notified) signer pending -> sent in the same request. Gating this
    // write on the signer's own status closes that race in a single-table
    // condition, and — unlike the document-level check — it also blocks
    // editing a signer who has since been viewed, signed, or declined even
    // outside a send race.
    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Cannot modify a signer that has already been notified, viewed, signed, or declined.' }, { status: 400 })
    }
    return NextResponse.json({ signer: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id, signerId } = await params
    const check = await requireDraft(tenantId, id)
    if (check) return NextResponse.json({ error: check.error }, { status: check.status })

    // Atomic claim — only delete a signer still at 'pending'. Without this,
    // a concurrent sign() (which atomically claims pending/sent/viewed ->
    // signed) racing this delete could win first, and this request would
    // then delete the row anyway — destroying the just-recorded signature,
    // IP, and timestamp with no recovery path, the same class of bug fixed
    // in decline vs. sign.
    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Cannot remove a signer that has already been notified, viewed, signed, or declined.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
