import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentTenant } from '@/lib/tenant'

// Tenant-aware port from nycmaid.
//
// Uses getCurrentTenant() (not getTenantForRequest()) — this route is reached
// via /dashboard/clients/feedback under platform-admin PIN impersonation, not
// a tenant custom domain or a Clerk session. getTenantForRequest() only
// resolves tenant from the x-tenant-id header (tenant custom domain) or Clerk
// auth — it 401s under PIN impersonation. getCurrentTenant() is what the
// dashboard layout itself and /api/schedule/calendar already use, and is the
// only one of the two that checks the admin-PIN impersonation cookie.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  // totalCount/unreadCount need their own exact-count queries — data.length
  // was previously used for both, silently capped at 200 by the page limit
  // below (once feedback exceeds 200 rows, "X total"/"Y unread" freezes
  // wrong instead of reflecting the real count).
  const [{ data, error }, { count: totalCount }, { count: unreadCount }] = await Promise.all([
    supabaseAdmin
      .from('client_feedback')
      .select('*, clients(name, phone, email), campaigns(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('client_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('client_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('read', false),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    feedback: data,
    totalCount: totalCount || 0,
    unreadCount: unreadCount || 0,
  })
}

export async function PUT(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  const { id, read } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .update({ read })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
