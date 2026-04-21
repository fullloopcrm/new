/**
 * Document signers — add/list. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { generateSignerToken, isEditableStatus } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('document_id', id)
      .order('order_index')
    if (error) throw error
    return NextResponse.json({ signers: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (!isEditableStatus(doc.status)) {
      return NextResponse.json({ error: 'Cannot add signers to a sent document. Void first.' }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from('document_signers')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', id)

    const { data, error } = await supabaseAdmin
      .from('document_signers')
      .insert({
        tenant_id: tenantId,
        document_id: id,
        order_index: body.order_index || (count || 0) + 1,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        role: body.role || null,
        public_token: generateSignerToken(),
        status: 'pending',
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ signer: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/documents/[id]/signers', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
