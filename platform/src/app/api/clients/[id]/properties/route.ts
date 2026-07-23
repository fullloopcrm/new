import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import {
  listProperties,
  addProperty,
  updateProperty,
  setPrimaryProperty,
  deactivateProperty,
} from '@/lib/client-properties'

// Admin-only management of a client's addresses (dashboard client drawer).
// Distinct from the client-portal-facing equivalent — this always authenticates
// as the operator, never the client, so every write is stamped changedBy:'admin'.
async function verifyOwnership(tenantId: string, clientId: string): Promise<boolean> {
  const { data } = await tenantDb(tenantId).from('clients').select('id').eq('id', clientId).single()
  return !!data
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.view')
  if (authError) return authError
  const { id: clientId } = await params
  if (!(await verifyOwnership(tenant.tenantId, clientId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const properties = await listProperties(clientId)

  const { searchParams } = new URL(request.url)
  if (searchParams.get('include_history') === 'true') {
    const { data: history } = await supabaseAdmin
      .from('property_changes')
      .select('id, property_id, action, old_value, new_value, changed_by, actor_id, source, created_at')
      .eq('tenant_id', tenant.tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ properties, history: history || [] })
  }

  return NextResponse.json({ properties })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError
  const { id: clientId } = await params
  if (!(await verifyOwnership(tenant.tenantId, clientId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (address.length < 5) {
    return NextResponse.json({ error: 'Please enter a full address.' }, { status: 400 })
  }

  const property = await addProperty(clientId, address, {
    unit: body.unit || null,
    label: body.label || null,
    makePrimary: body.make_primary === true,
    actor: { changedBy: 'admin', actorId: 'admin', source: 'admin' },
    phone: body.phone !== undefined ? (body.phone || null) : undefined,
    smsOk: typeof body.sms_ok === 'boolean' ? body.sms_ok : undefined,
    emailOk: typeof body.email_ok === 'boolean' ? body.email_ok : undefined,
    callOk: typeof body.call_ok === 'boolean' ? body.call_ok : undefined,
  })
  if (!property) return NextResponse.json({ error: 'Failed to add address' }, { status: 500 })
  return NextResponse.json({ property })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError
  const { id: clientId } = await params
  if (!(await verifyOwnership(tenant.tenantId, clientId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const propertyId = body.property_id
  if (!propertyId) return NextResponse.json({ error: 'Missing property_id' }, { status: 400 })

  const actor = { changedBy: 'admin' as const, actorId: 'admin', source: 'admin' as const }

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
    {
      address: body.address,
      unit: body.unit,
      label: body.label,
      phone: body.phone !== undefined ? (body.phone || null) : undefined,
      sms_ok: typeof body.sms_ok === 'boolean' ? body.sms_ok : undefined,
      email_ok: typeof body.email_ok === 'boolean' ? body.email_ok : undefined,
      call_ok: typeof body.call_ok === 'boolean' ? body.call_ok : undefined,
    },
    actor
  )
  if (!updated) return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  return NextResponse.json({ property: updated })
}
