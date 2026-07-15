import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import {
  listProperties,
  addProperty,
  updateProperty,
  setPrimaryProperty,
  deactivateProperty,
  type ChangeActor,
} from '@/lib/client-properties'

// Client-portal multi-address management. Ported from nycmaid; tenant scoping is
// handled inside the lib (rows carry the client's tenant_id).
//
// Auth: two legitimate callers, tried in order —
//   1. Operator dashboard (BookingsAdmin.tsx): Clerk/tenant_members session via
//      requirePermission — must also own the target client_id.
//   2. Customer portal: tenant-bound client_session cookie (lib/client-auth) —
//      must match the target client_id exactly.
// This used to trust lib/nycmaid/auth's isAdminAuthenticated() (legacy
// admin_session) as an unconditional bypass. That cookie carries NO tenant
// binding — its admin_users table is gone, so the only thing that can still
// mint it is the global ADMIN_PASSWORD PIN fallback in /api/auth/login — so
// any holder of that one shared secret could read/write ANY tenant's client
// property (address) data. Same bug class already fixed on admin-chat,
// client-analytics, and clients/[id]/contacts (see their "replaces legacy
// admin_session" comments); this route was the last one still on the old gate.
async function authClient(
  clientId: string | null | undefined,
  permission: 'clients.view' | 'clients.edit',
): Promise<NextResponse | { isAdmin: boolean; tenantId?: string }> {
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const { tenant: opTenant, error: opError } = await requirePermission(permission)
  if (!opError) {
    const { data: clientRow } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', opTenant.tenantId)
      .single()
    if (clientRow) return { isAdmin: true, tenantId: opTenant.tenantId }
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth
  return { isAdmin: false, tenantId: tenant.id }
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

  if (searchParams.get('include_history') === 'true' && auth.isAdmin && auth.tenantId) {
    const { data: history } = await tenantDb(auth.tenantId)
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
