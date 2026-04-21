/**
 * Edit/remove individual signer. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
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
    const { tenantId } = await getTenantForRequest()
    const { id, signerId } = await params
    const check = await requireDraft(tenantId, id)
    if (check) return NextResponse.json({ error: check.error }, { status: check.status })

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['name', 'email', 'phone', 'role', 'order_index']) {
      if (k in body) updates[k] = body[k]
    }

    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ signer: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id, signerId } = await params
    const check = await requireDraft(tenantId, id)
    if (check) return NextResponse.json({ error: check.error }, { status: check.status })

    const { error } = await supabaseAdmin
      .from('document_signers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', signerId)
      .eq('document_id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
