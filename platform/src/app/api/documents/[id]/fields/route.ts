/**
 * Document field placement — add + batch replace. Draft only.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
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

// label is caller-supplied free text with no other size guard downstream
// (stamped onto the finalized PDF and returned wholesale in GET) — same
// unbounded-string class already capped on field_values' value in the
// sibling public sign route.
const MAX_LABEL_LENGTH = 5000

function normalizeField(f: Partial<FieldInput>): FieldInput | { error: string } {
  if (!f.signer_id) return { error: 'signer_id required' }
  if (!f.type || !FIELD_TYPES.includes(f.type as FieldType)) return { error: `invalid type: ${f.type}` }
  const x = Number(f.x_pct), y = Number(f.y_pct), w = Number(f.w_pct), h = Number(f.h_pct)
  if ([x, y, w, h].some(v => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { error: 'x_pct/y_pct/w_pct/h_pct must be 0-100' }
  }
  if (typeof f.label === 'string' && f.label.length > MAX_LABEL_LENGTH) {
    return { error: `label is too long (max ${MAX_LABEL_LENGTH} characters)` }
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
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
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
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
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

    // signer_id is a caller-supplied FK — document_signers has no cross-document
    // FK check, so an unverified signer_id would let a field be planted against
    // a signer from a different document (any tenant). The sign endpoint later
    // resolves/updates field values by signer_id alone, so this must be a real
    // signer belonging to THIS document before it's persisted.
    const { data: ownedSigner } = await supabaseAdmin
      .from('document_signers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('document_id', id)
      .eq('id', normalized.signer_id)
      .maybeSingle()
    if (!ownedSigner) return NextResponse.json({ error: 'Signer not found on this document' }, { status: 404 })

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
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('status').eq('tenant_id', tenantId).eq('id', id).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(doc.status)) {
      return NextResponse.json({ error: 'Cannot replace fields on a sent doc.' }, { status: 400 })
    }

    const body = await request.json()
    const raw: Partial<FieldInput>[] = Array.isArray(body.fields) ? body.fields : []
    // body.fields is a caller-supplied array with no other size guard — an
    // unbounded batch would drive an unbounded delete+insert (and, per field,
    // an unbounded PDF-stamp pass at finalize). Same array-cardinality class
    // already capped on the sibling public sign route's field_values.
    if (raw.length > 200) {
      return NextResponse.json({ error: 'Too many fields (max 200)' }, { status: 400 })
    }
    const normalized: FieldInput[] = []
    for (const f of raw) {
      const n = normalizeField(f)
      if ('error' in n) return NextResponse.json({ error: n.error }, { status: 400 })
      normalized.push(n)
    }

    // Same FK-injection guard as POST: every signer_id in the batch must
    // belong to this document (and tenant) before any row is written.
    const { data: docSigners } = await supabaseAdmin
      .from('document_signers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('document_id', id)
    const validSignerIds = new Set((docSigners || []).map(s => s.id))
    const foreignSignerId = normalized.find(f => !validSignerIds.has(f.signer_id))
    if (foreignSignerId) {
      return NextResponse.json({ error: 'Signer not found on this document' }, { status: 404 })
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
