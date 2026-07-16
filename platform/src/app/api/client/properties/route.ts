import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/nycmaid/auth'
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
// Auth: admins pass through; otherwise the caller must be the client. Uses
// lib/client-auth's tenant-bound protectClientAPI (PORTAL_SECRET-signed, tenant
// id in the payload, what /api/client/login + /api/client/verify-code actually
// issue) — same fix already applied to the sibling /api/client/preferred-cleaner
// and /api/client/recurring routes. This route was still on lib/nycmaid/auth's
// legacy protectClientAPI, which is signed with the platform-wide ADMIN_PASSWORD,
// carries no tenant binding, and doesn't even parse the cookie format the real
// login flow issues (3-part legacy format vs. the 4-part clientId.tenantId.ts.sig
// format client-auth.ts creates) — so real client sessions never validated here.
async function authClient(clientId: string | null | undefined): Promise<NextResponse | { isAdmin: boolean }> {
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    const auth = await protectClientAPI(tenant.id, clientId)
    if (auth instanceof NextResponse) return auth
  }
  return { isAdmin }
}

function actorFor(isAdmin: boolean, clientId: string): ChangeActor {
  return isAdmin
    ? { changedBy: 'admin', actorId: 'admin', source: 'admin' }
    : { changedBy: 'client', actorId: clientId, source: 'portal' }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const auth = await authClient(clientId)
  if (auth instanceof NextResponse) return auth

  const properties = await listProperties(clientId!)

  if (searchParams.get('include_history') === 'true' && auth.isAdmin) {
    const { supabaseAdmin } = await import('@/lib/supabase')
    // isAdminAuthenticated() is a legacy admin_session cookie with no tenant
    // binding — resolve the client's OWN tenant_id and require every returned
    // row to match it, so a property_changes row ever mistagged to a foreign
    // tenant can't surface here.
    const { data: clientRow } = await supabaseAdmin.from('clients').select('tenant_id').eq('id', clientId!).single()
    const tenantId = clientRow?.tenant_id as string | undefined
    if (!tenantId) return NextResponse.json({ properties, history: [] })
    const { data: history } = await supabaseAdmin
      .from('property_changes')
      .select('id, property_id, action, old_value, new_value, changed_by, actor_id, source, created_at')
      .eq('client_id', clientId!)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ properties, history: history || [] })
  }

  return NextResponse.json({ properties })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const clientId = body.client_id
  const auth = await authClient(clientId)
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
  const auth = await authClient(clientId)
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

  // lot_size_sqft: only pass through when the caller sent a well-formed
  // positive number (or explicit null to clear it) — anything else (missing
  // key, malformed string) must stay `undefined` so updateProperty's
  // "key present" check doesn't wipe out an existing value.
  let lotSizeSqft: number | null | undefined
  if (body.lot_size_sqft === null) {
    lotSizeSqft = null
  } else if (body.lot_size_sqft !== undefined) {
    const n = Number(body.lot_size_sqft)
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: 'lot_size_sqft must be a positive number' }, { status: 400 })
    }
    lotSizeSqft = Math.round(n)
  }

  const updated = await updateProperty(
    clientId,
    propertyId,
    { address: body.address, unit: body.unit, label: body.label, lot_size_sqft: lotSizeSqft },
    actor
  )
  if (!updated) return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  return NextResponse.json({ property: updated })
}
