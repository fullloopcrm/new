/**
 * Edit/remove individual signer. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { isEditableStatus, verifyStillDraft } from '@/lib/documents'

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

    // Snapshot for rollback -- if send() races us below, we restore exactly
    // what was here rather than leaving an already-sent doc's signer edited.
    const { data: before } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .maybeSingle()
    if (!before) return NextResponse.json({ error: 'Signer not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .select('*')
      .single()
    if (error) throw error

    if (!(await verifyStillDraft(tenantId, id))) {
      const restore: Record<string, unknown> = {}
      for (const k of Object.keys(updates)) restore[k] = before[k]
      await supabaseAdmin.from('document_signers').update(restore).eq('id', signerId)
      return NextResponse.json({ error: 'Document was sent concurrently' }, { status: 409 })
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

    // Snapshot for rollback -- if send() races us below, re-insert this
    // signer instead of letting a just-invited signer's row silently
    // disappear (their public link would 404, and the document could
    // complete without the consent it was sent out to collect).
    const { data: before } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .maybeSingle()
    if (!before) return NextResponse.json({ error: 'Signer not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('document_signers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
    if (error) throw error

    if (!(await verifyStillDraft(tenantId, id))) {
      await supabaseAdmin.from('document_signers').insert(before)
      return NextResponse.json({ error: 'Document was sent concurrently' }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
