// Tenant-wide HR document-requirement template. This is where trades differ
// (CDL for dumpster/moving/towing drivers, pesticide applicator license for
// pest control, etc.) — as data rows on top of the seeded default 6-doc
// checklist, never as forked code. See DEFAULT_HR_DOC_REQUIREMENTS in
// src/lib/hr.ts for the baseline every tenant starts with.
// GET  → list the tenant's requirement template (id route already exposes this
//        per-employee; this collection route is for the requirements-management UI).
// POST → add a new requirement row.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import type { DocAppliesTo } from '@/lib/hr'

const APPLIES_TO: DocAppliesTo[] = ['all', 'contractor_1099', 'employee_w2']

/** Stable lookup key — hr_documents.doc_type is matched by exact string equality. */
function slugifyDocType(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function GET() {
  const { tenant, error: permErr } = await requirePermission('team.view')
  if (permErr) return permErr
  try {
    const { data, error } = await supabaseAdmin
      .from('hr_document_requirements')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ requirements: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant

    let body: { doc_type?: string; label?: string; applies_to?: string; required?: boolean; has_expiry?: boolean; sort_order?: number }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const docType = body.doc_type ? slugifyDocType(body.doc_type) : ''
    if (!docType) return NextResponse.json({ error: 'doc_type required' }, { status: 400 })
    const label = body.label?.trim()
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })
    const appliesTo = body.applies_to && APPLIES_TO.includes(body.applies_to as DocAppliesTo) ? body.applies_to : 'all'

    let sortOrder = body.sort_order
    if (sortOrder == null) {
      const { data: existing } = await supabaseAdmin
        .from('hr_document_requirements')
        .select('sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: false })
        .limit(1)
      sortOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 10 : 10
    }

    const { data, error } = await supabaseAdmin
      .from('hr_document_requirements')
      .insert({
        tenant_id: tenantId,
        doc_type: docType,
        label,
        applies_to: appliesTo,
        required: body.required !== false,
        has_expiry: body.has_expiry === true,
        sort_order: sortOrder,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'a requirement with that doc_type already exists' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, requirement: data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
