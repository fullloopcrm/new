// Employee documents. `id` is the team_member_id.
// POST  → create a document record (typically against a requirement doc_type).
// PATCH → update an existing document's status / file / expiry (by document_id).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

const DOC_STATUSES = ['pending', 'submitted', 'approved', 'rejected', 'expired']

// Same bug class fixed elsewhere in this codebase (team_members photo_url,
// management-applications, onboarding-profile, admin notes): a free-text
// *_url field stored verbatim from the request body, with no render sink
// today but nothing stopping a future one from rendering it as <a href>.
// Reject anything that isn't a plain http(s) URL before it reaches the DB.
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

async function assertMember(tenantId: string, memberId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params
    if (!(await assertMember(tenantId, id)))
      return NextResponse.json({ error: 'employee not found' }, { status: 404 })

    let body: { doc_type?: string; label?: string; status?: string; file_url?: string; issued_on?: string; expires_on?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    if (!body.doc_type?.trim()) return NextResponse.json({ error: 'doc_type required' }, { status: 400 })
    if (body.status && !DOC_STATUSES.includes(body.status))
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    const fileUrl = body.file_url?.trim() || null
    if (fileUrl && !isHttpUrl(fileUrl))
      return NextResponse.json({ error: 'invalid file_url' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('hr_documents')
      .insert({
        tenant_id: tenantId,
        team_member_id: id,
        doc_type: body.doc_type.trim(),
        label: body.label?.trim() || null,
        status: body.status || 'pending',
        file_url: fileUrl,
        issued_on: body.issued_on || null,
        expires_on: body.expires_on || null,
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, document: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params

    let body: { document_id?: string; status?: string; file_url?: string; label?: string; issued_on?: string | null; expires_on?: string | null }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    if (!body.document_id) return NextResponse.json({ error: 'document_id required' }, { status: 400 })
    if (body.status && !DOC_STATUSES.includes(body.status))
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    if (body.file_url != null) {
      const trimmed = body.file_url.trim()
      if (trimmed && !isHttpUrl(trimmed))
        return NextResponse.json({ error: 'invalid file_url' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('status' in body) {
      patch.status = body.status
      // Compliance audit trail: stamp the review moment when a document is
      // actually adjudicated. Not reviewed_by too -- the caller's userId can be
      // 'admin' or a Clerk id, neither of which fits the UUID-typed column
      // (same constraint hr_notes.ts documents for author_id).
      if (body.status === 'approved' || body.status === 'rejected') patch.reviewed_at = new Date().toISOString()
    }
    if ('file_url' in body) patch.file_url = body.file_url?.trim() || null
    if ('label' in body) patch.label = body.label?.trim() || null
    if ('issued_on' in body) patch.issued_on = body.issued_on || null
    if ('expires_on' in body) patch.expires_on = body.expires_on || null

    // Scope the update to this tenant + member so a forged document_id can't
    // touch another tenant's row.
    const { data, error } = await supabaseAdmin
      .from('hr_documents')
      .update(patch)
      .eq('id', body.document_id)
      .eq('tenant_id', tenantId)
      .eq('team_member_id', id)
      .select('*')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'document not found' }, { status: 404 })

    return NextResponse.json({ ok: true, document: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
