import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { listProperties, addProperty, updateProperty, setPrimaryProperty, deactivateProperty } from '@/lib/client-properties'
import { verifyPortalToken } from '../auth/token'

// Self-service addresses management for an authenticated client — thin
// wrapper around the shared client-properties.ts lib already used by the
// admin CRUD at /api/clients/[id]/properties. No OTP needed here: addresses
// aren't a comms channel, so there's no impersonation risk like phone/email.

async function requireOwnClient(tenantId: string, clientId: string): Promise<boolean> {
  const { data } = await tenantDb(tenantId).from('clients').select('id').eq('id', clientId).single()
  return !!data
}

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await requireOwnClient(auth.tid, auth.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const properties = await listProperties(auth.id)
  return NextResponse.json({ properties })
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await requireOwnClient(auth.tid, auth.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (address.length < 5) {
    return NextResponse.json({ error: 'Please enter a full address.' }, { status: 400 })
  }

  const property = await addProperty(auth.id, address, {
    unit: body.unit || null,
    label: body.label || null,
    makePrimary: body.make_primary === true,
    actor: { changedBy: 'client', source: 'portal' },
  })
  if (!property) return NextResponse.json({ error: 'Failed to add address' }, { status: 500 })
  return NextResponse.json({ property })
}

export async function PATCH(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await requireOwnClient(auth.tid, auth.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const propertyId = body.property_id
  if (!propertyId) return NextResponse.json({ error: 'Missing property_id' }, { status: 400 })

  const actor = { changedBy: 'client' as const, source: 'portal' as const }

  if (body.action === 'set_primary') {
    await setPrimaryProperty(auth.id, propertyId, actor)
    return NextResponse.json({ success: true })
  }
  if (body.action === 'deactivate') {
    await deactivateProperty(auth.id, propertyId, actor)
    return NextResponse.json({ success: true })
  }

  const updated = await updateProperty(auth.id, propertyId, { address: body.address, unit: body.unit, label: body.label }, actor)
  if (!updated) return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  return NextResponse.json({ property: updated })
}
