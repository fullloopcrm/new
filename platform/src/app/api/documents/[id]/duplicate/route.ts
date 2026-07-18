/**
 * Duplicate a document to a new draft. Copies title/message/consent/fields/signers
 * (with fresh tokens) and re-uses the stored PDF by copying the storage object.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { DOCUMENTS_BUCKET, documentOriginalPath, generateSignerToken, logDocEvent } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data: src } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // voided_from is only meaningful when duplicating from a voided doc
    // (the "duplicate & void" flow). Plain duplicates should not inherit it.
    const voidedFrom = src.status === 'voided' ? src.id : null

    // Create new draft row
    const { data: newDoc, error: dErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        title: `${src.title} (copy)`,
        message: src.message,
        sign_order: src.sign_order,
        consent_text: src.consent_text,
        page_count: src.page_count,
        voided_from: voidedFrom,
        original_path: 'pending',
      })
      .select('*')
      .single()
    if (dErr) throw dErr

    // Copy storage object. A failed download/upload used to be silently
    // ignored -- original_path still got pointed at newPath with nothing
    // actually stored there, so the route returned 200 as if the duplicate
    // fully succeeded. The break only surfaced later, as a confusing 500
    // from POST /api/documents/[id]/send ("Unable to read original PDF").
    // No signers/fields exist yet at this point, so a clean rollback is
    // just deleting the draft row.
    const newPath = documentOriginalPath(tenantId, newDoc.id)
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(src.original_path)
    if (dlErr || !blob) {
      await supabaseAdmin.from('documents').delete().eq('id', newDoc.id)
      return NextResponse.json(
        { error: `Unable to copy original PDF: ${dlErr?.message || 'source file missing'}` },
        { status: 500 }
      )
    }
    const arrayBuf = await blob.arrayBuffer()
    const { error: upErr } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(newPath, new Uint8Array(arrayBuf), { contentType: 'application/pdf', upsert: true })
    if (upErr) {
      await supabaseAdmin.from('documents').delete().eq('id', newDoc.id)
      return NextResponse.json(
        { error: `Unable to store duplicated PDF: ${upErr.message}` },
        { status: 500 }
      )
    }
    await supabaseAdmin.from('documents').update({ original_path: newPath }).eq('id', newDoc.id)

    // Copy signers (with fresh tokens + pending status)
    const { data: srcSigners } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('document_id', id)
      .order('order_index')

    const oldToNewSigner = new Map<string, string>()
    for (const s of srcSigners || []) {
      const { data: ns } = await supabaseAdmin
        .from('document_signers')
        .insert({
          tenant_id: tenantId,
          document_id: newDoc.id,
          order_index: s.order_index,
          name: s.name,
          email: s.email,
          phone: s.phone,
          role: s.role,
          public_token: generateSignerToken(),
          status: 'pending',
        })
        .select('id')
        .single()
      if (ns) oldToNewSigner.set(s.id, ns.id)
    }

    // Copy fields (map signer_id via oldToNewSigner)
    const { data: srcFields } = await supabaseAdmin
      .from('document_fields')
      .select('*')
      .eq('document_id', id)

    if (srcFields && srcFields.length > 0) {
      const newFields = srcFields
        .map(f => {
          const newSignerId = oldToNewSigner.get(f.signer_id)
          if (!newSignerId) return null
          return {
            tenant_id: tenantId,
            document_id: newDoc.id,
            signer_id: newSignerId,
            type: f.type,
            page: f.page,
            x_pct: f.x_pct,
            y_pct: f.y_pct,
            w_pct: f.w_pct,
            h_pct: f.h_pct,
            required: f.required,
            label: f.label,
          }
        })
        .filter((f): f is NonNullable<typeof f> => !!f)
      if (newFields.length > 0) {
        await supabaseAdmin.from('document_fields').insert(newFields)
      }
    }

    await logDocEvent({
      document_id: newDoc.id,
      tenant_id: tenantId,
      event_type: 'created',
      detail: { duplicated_from: id },
    })

    return NextResponse.json({ document: { ...newDoc, original_path: newPath } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/documents/[id]/duplicate', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
