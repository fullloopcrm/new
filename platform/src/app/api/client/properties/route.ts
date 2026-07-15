import { NextResponse } from 'next/server'
import { protectClientAPI } from '@/lib/client-auth'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import {
  listProperties,
  addProperty,
  updateProperty,
  setPrimaryProperty,
  deactivateProperty,
  type ChangeActor,
} from '@/lib/client-properties'

// Client-portal multi-address management. Ported from nycmaid; the CRUD helpers
// in @/lib/client-properties scope every row by client_id, but client_id alone
// isn't tenant-safe unless the caller was already proven to own (or administer)
// that specific client — that's what this file's auth layer must guarantee.
//
// Auth: dashboard admins (Clerk session, RBAC-gated) or the client themself
// (tenant-bound client-portal session, @/lib/client-auth). This used to trust
// the legacy nycmaid isAdminAuthenticated()/protectClientAPI() pair — a
// pre-multi-tenant auth system with NO tenant binding in either check (same
// orphaned-auth class already closed on client-analytics: "admin_users table
// removed, /api/auth/login orphaned" — but that route's dead PIN-fallback
// login still mints an admin_session cookie good enough to pass
// isAdminAuthenticated() here, with zero tenant check on the resulting
// access). Separately, real clients logged in via the modern /api/client/login
// hold a 4-part tenant-bound cookie (@/lib/client-auth) that never matched
// the old 3-part format nycmaid's protectClientAPI expected, so this route
// silently rejected every legitimate client caller while the stale admin
// bypass still worked. Both paths now resolve tenant from the request and
// verify the target client_id belongs to it.
async function authClient(
  clientId: string | null | undefined,
  wantPermission: 'clients.view' | 'clients.edit',
): Promise<NextResponse | { isAdmin: boolean }> {
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const { tenant: adminTenant, error: adminError } = await requirePermission(wantPermission)
  if (adminTenant) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', adminTenant.tenantId)
      .maybeSingle()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    return { isAdmin: true }
  }

  const siteTenant = await getTenantFromHeaders()
  if (!siteTenant) return adminError
  const auth = await protectClientAPI(siteTenant.id, clientId)
  if (auth instanceof NextResponse) return auth
  return { isAdmin: false }
}

function actorFor(isAdmin: boolean, clientId: string): ChangeActor {
  return isAdmin
    ? { changedBy: 'admin', actorId: 'admin', source: 'admin' }
    : { changedBy: 'client', actorId: clientId, source: 'portal' }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const auth = await authClient(clientId, 'clients.view')
  if (auth instanceof NextResponse) return auth

  const properties = await listProperties(clientId!)

  if (searchParams.get('include_history') === 'true' && auth.isAdmin) {
    const { data: history } = await supabaseAdmin
      .from('property_changes')
      .select('id, property_id, action, old_value, new_value, changed_by, actor_id, source, created_at')
      .eq('client_id', clientId!)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ properties, history: history || [] })
  }

  return NextResponse.json({ properties })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const clientId = body.client_id
  const auth = await authClient(clientId, 'clients.edit')
  if (auth instanceof NextResponse) return auth

  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (address.length < 5) {
    return NextResponse.json({ error: 'Please enter a full address.' }, { status: 400 })
  }
  const property = await addProperty(clientId, address, {
    unit: body.unit || null,
    label: body.label || null,
    makePrimary: body.make_primary === true,
    actor: actorFor(auth.isAdmin, clientId),
  })
  if (!property) return NextResponse.json({ error: 'Failed to add address' }, { status: 500 })
  return NextResponse.json({ property })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}))
  const clientId = body.client_id
  const propertyId = body.property_id
  const auth = await authClient(clientId, 'clients.edit')
  if (auth instanceof NextResponse) return auth
  if (!propertyId) return NextResponse.json({ error: 'Missing property_id' }, { status: 400 })

  const actor = actorFor(auth.isAdmin, clientId)

  if (body.action === 'set_primary') {
    await setPrimaryProperty(clientId, propertyId, actor)
    return NextResponse.json({ success: true })
  }
  if (body.action === 'deactivate') {
    await deactivateProperty(clientId, propertyId, actor)
    return NextResponse.json({ success: true })
  }

  const updated = await updateProperty(
    clientId,
    propertyId,
    { address: body.address, unit: body.unit, label: body.label },
    actor
  )
  if (!updated) return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  return NextResponse.json({ property: updated })
}
