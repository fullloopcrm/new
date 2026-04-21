/**
 * Document field placement — add + batch replace. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { isEditableStatus, FIELD_TYPES, type FieldType } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

interface FieldInput {
  id?: string
  signer_id: string
  type: FieldType
  page: number
  x_pct: number
  y_pct: number
  w_pct: number
  h_pct: number
  required?: boolean
  label?: string | null
}

function normalizeField(f: Partial<FieldInput>): FieldInput | { error: string } {
  if (!f.signer_id) return { error: 'signer_id required' }
  if (!f.type || !FIELD_TYPES.includes(f.type as FieldType)) return { error: `invalid type: ${f.type}` }
  const x = Number(f.x_pct), y = Number(f.y_pct), w = Number(f.w_pct), h = Number(f.h_pct)
  if ([x, y, w, h].some(v => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { error: 'x_pct/y_pct/w_pct/h_pct must be 0-100' }
  }
  return {
    signer_id: f.signer_id as string,
    type: f.type as FieldType,
    page: Math.max(1, Number(f.page) || 1),
    x_pct: x, y_pct: y, w_pct: w, h_pct: h,
    required: f.required !== false,
    label: f.label || null,
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('document_fields')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('document_id', id)
      .order('page').order('y_pct')
    if (error) throw error
    return NextResponse.json({ fields: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('status').eq('tenant_id', tenantId).eq('id', id).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(doc.status)) {
      return NextResponse.json({ error: 'Cannot add fields to a sent doc. Void first.' }, { status: 400 })
    }

    const body = await request.json()
    const normalized = normalizeField(body)
    if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('document_fields')
      .insert({ ...normalized, tenant_id: tenantId, document_id: id })
      .select('*').single()
    if (error) throw error
    return NextResponse.json({ field: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/documents/[id]/fields', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PUT = replace all fields at once (for bulk editor save)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('status').eq('tenant_id', tenantId).eq('id', id).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(doc.status)) {
      return NextResponse.json({ error: 'Cannot replace fields on a sent doc.' }, { status: 400 })
    }

    const body = await request.json()
    const raw: Partial<FieldInput>[] = body.fields || []
    const normalized: FieldInput[] = []
    for (const f of raw) {
      const n = normalizeField(f)
      if ('error' in n) return NextResponse.json({ error: n.error }, { status: 400 })
      normalized.push(n)
    }

    await supabaseAdmin.from('document_fields').delete().eq('tenant_id', tenantId).eq('document_id', id)
    if (normalized.length > 0) {
      const { error } = await supabaseAdmin
        .from('document_fields')
        .insert(normalized.map(n => ({ ...n, tenant_id: tenantId, document_id: id })))
      if (error) throw error
    }
    return NextResponse.json({ ok: true, count: normalized.length })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/documents/[id]/fields', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
