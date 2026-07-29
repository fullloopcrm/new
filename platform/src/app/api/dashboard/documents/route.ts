// Generic client/tenant document attachments. `client_documents` is a plain
// tracking row for a file already uploaded to the shared `uploads` Storage
// bucket via POST /api/uploads — this route never touches Storage itself.
//
// client_id is optional:
//   - present  -> the document belongs to that client (client detail page).
//   - absent   -> the document belongs to the TENANT itself, e.g. a signed
//     sales proposal attached from the platform-admin business detail page
//     (/admin/businesses/[id]).
//
// Two auth paths, because this route is mounted from two different pages
// with two different session types:
//   1. requirePermission() — a normal tenant dashboard session (owner/staff,
//      or an impersonated admin). Used by the client detail page.
//   2. requireAdmin() + an explicit `tenant_id` — the platform-admin business
//      detail page has its own admin_token session, not a tenant dashboard
//      session, and knows the target tenant only from its own URL. Only
//      reachable when the caller supplies tenant_id explicitly, so a normal
//      tenant-scoped caller can never accidentally hit this path.
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { requireAdmin } from '@/lib/require-admin'
import type { Permission } from '@/lib/rbac'

type Resolved =
  | { tenantId: string; uploadedBy: string; error: null }
  | { tenantId: null; uploadedBy: null; error: NextResponse }

async function resolveTenant(permission: Permission, explicitTenantId: string | null): Promise<Resolved> {
  const { tenant, error } = await requirePermission(permission)
  if (tenant) return { tenantId: tenant.tenantId, uploadedBy: tenant.userId, error: null }

  if (explicitTenantId) {
    const adminError = await requireAdmin()
    if (adminError) return { tenantId: null, uploadedBy: null, error: adminError }
    return { tenantId: explicitTenantId, uploadedBy: 'admin', error: null }
  }

  return { tenantId: null, uploadedBy: null, error: error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('client_id')
  const explicitTenantId = req.nextUrl.searchParams.get('tenant_id')

  const resolved = await resolveTenant('clients.view', explicitTenantId)
  if (resolved.error) return resolved.error
  const { tenantId } = resolved

  try {
    const base = tenantDb(tenantId).from('client_documents').select('*').order('created_at', { ascending: false })
    const { data, error } = await (clientId ? base.eq('client_id', clientId) : base.is('client_id', null))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ documents: data || [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: {
    client_id?: string
    file_name?: string
    file_url?: string
    file_size_bytes?: number
    content_type?: string
    tenant_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const resolved = await resolveTenant('clients.edit', body.tenant_id || null)
  if (resolved.error) return resolved.error
  const { tenantId, uploadedBy } = resolved

  if (!body.file_name?.trim()) return NextResponse.json({ error: 'file_name required' }, { status: 400 })
  if (!body.file_url?.trim()) return NextResponse.json({ error: 'file_url required' }, { status: 400 })

  try {
    // client_id is caller-supplied — verify it's actually this tenant's own
    // client before attaching the document to it (same guard shape as
    // preferred_team_member_id in /api/clients/[id]).
    if (body.client_id) {
      const { data: client } = await tenantDb(tenantId)
        .from('clients')
        .select('id')
        .eq('id', body.client_id)
        .maybeSingle()
      if (!client) return NextResponse.json({ error: 'client not found' }, { status: 404 })
    }

    const { data, error } = await tenantDb(tenantId)
      .from('client_documents')
      .insert({
        client_id: body.client_id || null,
        file_name: body.file_name.trim(),
        file_url: body.file_url.trim(),
        file_size_bytes: body.file_size_bytes ?? null,
        content_type: body.content_type ?? null,
        uploaded_by: uploadedBy,
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

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const explicitTenantId = req.nextUrl.searchParams.get('tenant_id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const resolved = await resolveTenant('clients.edit', explicitTenantId)
  if (resolved.error) return resolved.error
  const { tenantId } = resolved

  try {
    // Scoped to this tenant (via tenantDb) + this id, so a forged id can't
    // touch another tenant's row -- same pattern as the hr_documents PATCH
    // handler's `.eq('id', ...).eq('team_member_id', ...)` scoping.
    // NOTE: this deletes the tracking row only; the underlying object in the
    // `uploads` Storage bucket is NOT removed (known simplification for this
    // minimal version).
    const { data, error } = await tenantDb(tenantId)
      .from('client_documents')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'document not found' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
