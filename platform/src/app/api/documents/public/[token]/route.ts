/**
 * Public signer view — returns the payload the signer needs to render
 * the PDF + their fields. Token-authenticated per signer.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { canSignerAct, DOCUMENTS_BUCKET, logDocEvent } from '@/lib/documents'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

    const { data: signer } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('public_token', token)
      .maybeSingle()
    if (!signer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('*, tenants!inner(name, domain, phone, email, logo_url, primary_color, status)')
      .eq('id', signer.document_id)
      .eq('tenants.status', 'active')
      .single()
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // Record view
    const now = new Date().toISOString()
    const viewUpdate: Record<string, unknown> = {
      last_viewed_at: now,
      view_count: (signer.view_count || 0) + 1,
    }
    if (!signer.first_viewed_at) viewUpdate.first_viewed_at = now
    if (signer.status === 'sent') viewUpdate.status = 'viewed'
    await supabaseAdmin.from('document_signers').update(viewUpdate).eq('id', signer.id)

    if (doc.status === 'sent') {
      await supabaseAdmin.from('documents').update({ status: 'viewed' }).eq('id', doc.id)
    }

    await logDocEvent({
      document_id: doc.id,
      tenant_id: doc.tenant_id,
      signer_id: signer.id,
      event_type: 'viewed',
      ip_address: ipFromRequest(request),
      user_agent: request.headers.get('user-agent'),
    })

    // Check if signer can act now (sequential order)
    const { data: allSigners } = await supabaseAdmin
      .from('document_signers')
      .select('id, order_index, status, name')
      .eq('document_id', doc.id)
      .order('order_index')

    const canAct = canSignerAct(
      doc.sign_order as 'parallel' | 'sequential',
      { order_index: signer.order_index, status: signer.status },
      allSigners || [],
    )

    const { data: fields } = await supabaseAdmin
      .from('document_fields')
      .select('*')
      .eq('document_id', doc.id)
      .order('page').order('y_pct')

    // Signed URL for PDF
    const { data: signedUrl } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.original_path, 3600)

    return NextResponse.json({
      document: {
        id: doc.id,
        title: doc.title,
        message: doc.message,
        status: doc.status,
        sign_order: doc.sign_order,
        consent_text: doc.consent_text,
        page_count: doc.page_count,
        business: doc.tenants,
      },
      pdf_url: signedUrl?.signedUrl || null,
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        order_index: signer.order_index,
        status: signer.status,
        consent_accepted_at: signer.consent_accepted_at,
        can_act: canAct,
      },
      all_signers: (allSigners || []).map(s => ({
        id: s.id,
        name: s.name,
        order_index: s.order_index,
        status: s.status,
        is_me: s.id === signer.id,
      })),
      fields: (fields || []).map(f => ({
        id: f.id,
        signer_id: f.signer_id,
        is_mine: f.signer_id === signer.id,
        type: f.type,
        page: f.page,
        x_pct: Number(f.x_pct),
        y_pct: Number(f.y_pct),
        w_pct: Number(f.w_pct),
        h_pct: Number(f.h_pct),
        required: f.required,
        label: f.label,
        value: f.signer_id === signer.id ? f.value : null,
      })),
    })
  } catch (err) {
    console.error('GET /api/documents/public/[token]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
