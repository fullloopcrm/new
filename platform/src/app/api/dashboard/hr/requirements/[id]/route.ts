// Update a single HR document-requirement row. `id` is the requirement row id.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import type { DocAppliesTo } from '@/lib/hr'

const APPLIES_TO: DocAppliesTo[] = ['all', 'contractor_1099', 'employee_w2']

function slugifyDocType(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params

    let body: { doc_type?: string; label?: string; applies_to?: string; required?: boolean; has_expiry?: boolean; sort_order?: number }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    // Only assign keys the caller actually sent, so a partial PUT never wipes
    // unrelated fields.
    const patch: Record<string, unknown> = {}
    if ('doc_type' in body) {
      const docType = body.doc_type ? slugifyDocType(body.doc_type) : ''
      if (!docType) return NextResponse.json({ error: 'doc_type cannot be empty' }, { status: 400 })
      patch.doc_type = docType
    }
    if ('label' in body) {
      const label = body.label?.trim()
      if (!label) return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 })
      patch.label = label
    }
    if ('applies_to' in body) {
      if (!body.applies_to || !APPLIES_TO.includes(body.applies_to as DocAppliesTo))
        return NextResponse.json({ error: 'invalid applies_to' }, { status: 400 })
      patch.applies_to = body.applies_to
    }
    if ('required' in body) patch.required = body.required === true
    if ('has_expiry' in body) patch.has_expiry = body.has_expiry === true
    if ('sort_order' in body) {
      if (typeof body.sort_order !== 'number' || !Number.isFinite(body.sort_order))
        return NextResponse.json({ error: 'invalid sort_order' }, { status: 400 })
      patch.sort_order = body.sort_order
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'no fields to update' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('hr_document_requirements')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .maybeSingle()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'a requirement with that doc_type already exists' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'requirement not found' }, { status: 404 })

    return NextResponse.json({ ok: true, requirement: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
