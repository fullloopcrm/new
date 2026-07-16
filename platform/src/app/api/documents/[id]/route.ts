/**
 * Document by id — read, edit (draft only), delete (draft only).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { isEditableStatus, DOCUMENTS_BUCKET } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ data: signers }, { data: fields }, { data: activity }] = await Promise.all([
      supabaseAdmin.from('document_signers').select('*').eq('document_id', id).order('order_index'),
      supabaseAdmin.from('document_fields').select('*').eq('document_id', id).order('page').order('y_pct'),
      supabaseAdmin.from('document_activity').select('id, event_type, signer_id, detail, created_at').eq('document_id', id).order('created_at', { ascending: false }).limit(200),
    ])

    // Signed URL for the original PDF (short-lived)
    const { data: signedUrl } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.original_path, 3600)

    let signedPdfUrl: string | null = null
    if (doc.signed_path) {
      const { data: signedFinal } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(doc.signed_path, 3600)
      signedPdfUrl = signedFinal?.signedUrl || null
    }

    return NextResponse.json({
      document: doc,
      original_pdf_url: signedUrl?.signedUrl || null,
      signed_pdf_url: signedPdfUrl,
      signers: signers || [],
      fields: fields || [],
      activity: activity || [],
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/documents/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(existing.status)) {
      return NextResponse.json({
        error: `Cannot edit ${existing.status} document — void first and duplicate to create a corrected version.`,
      }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    const assignables = ['title', 'message', 'sign_order', 'expires_at', 'consent_text'] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    // Check-then-act, not atomic: `existing.status` above is a stale snapshot.
    // POST /api/documents/[id]/send can flip 'draft' -> 'sent' (locking the
    // doc's hash and notifying signers) between that read and this write --
    // re-assert the pre-read status in the write's own WHERE so a concurrent
    // send doesn't get silently clobbered by an edit to the already-sent doc.
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', existing.status)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'This document changed status concurrently — refresh instead of editing' },
        { status: 409 },
      )
    }
    return NextResponse.json({ document: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/documents/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('status, original_path, signed_path')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(existing.status)) {
      return NextResponse.json({ error: 'Only drafts can be deleted. Void sent docs instead.' }, { status: 400 })
    }

    // Check-then-act, not atomic: `existing.status` above is a stale snapshot.
    // A concurrent send() (POST /api/documents/[id]/send) can flip 'draft' ->
    // 'sent' between that read and this delete -- re-assert the pre-read
    // status in the delete's own WHERE, and only remove storage objects AFTER
    // a confirmed DB delete (using the paths the delete itself returned, not
    // the stale read), so a concurrent send can't have its original PDF
    // yanked out from under an in-flight hash/download by a delete that
    // should have been rejected.
    const { data: deleted, error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', existing.status)
      .select('original_path, signed_path')
      .maybeSingle()
    if (error) throw error
    if (!deleted) {
      return NextResponse.json(
        { error: 'This document changed status concurrently — refresh instead of deleting' },
        { status: 409 },
      )
    }

    const paths = [deleted.original_path, deleted.signed_path].filter(Boolean) as string[]
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove(paths)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/documents/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
