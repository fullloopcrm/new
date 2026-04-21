/**
 * Document by id — read, edit (draft only), delete (draft only).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { isEditableStatus, DOCUMENTS_BUCKET } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
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

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ document: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/documents/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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

    // Remove storage objects
    const paths = [existing.original_path, existing.signed_path].filter(Boolean) as string[]
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove(paths)
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/documents/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
