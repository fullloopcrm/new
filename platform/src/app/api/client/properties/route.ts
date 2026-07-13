import { NextResponse } from 'next/server'
import { protectClientAPI, isAdminAuthenticated } from '@/lib/nycmaid/auth'
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
// Auth: admins pass through; otherwise the caller must be the client (PIN cookie).
async function authClient(clientId: string | null | undefined): Promise<NextResponse | { isAdmin: boolean }> {
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    const auth = await protectClientAPI(clientId)
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
    // isAdminAuthenticated() carries no tenant binding (legacy admin_session,
    // same class as the Selena IDOR) — client_id alone isn't enough proof of
    // ownership, so resolve the client's own tenant and require rows to match it.
    const { data: clientRow } = await supabaseAdmin.from('clients').select('tenant_id').eq('id', clientId!).single()
    const { data: history } = await supabaseAdmin
      .from('property_changes')
      .select('id, property_id, action, old_value, new_value, changed_by, actor_id, source, created_at')
      .eq('client_id', clientId!)
      .eq('tenant_id', clientRow?.tenant_id ?? '')
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

  const updated = await updateProperty(
    clientId,
    propertyId,
    { address: body.address, unit: body.unit, label: body.label },
    actor
  )
  if (!updated) return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  return NextResponse.json({ property: updated })
}
