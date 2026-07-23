import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

// Persists a freshly-geocoded lat/lng so the next read (map view, smart
// scheduler, etc.) doesn't have to hit the geocoder again for this address.
// Writes to client_properties when the caller has a property_id (a specific
// address on a multi-address client), else the client's own row — mirrors
// how applyPropertyToBookingClient()/bookingCoords() already read this same
// cache in @/lib/client-properties.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError
  const { id: clientId } = await params
  const db = tenantDb(tenant.tenantId)

  const body = await request.json().catch(() => ({}))
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const propertyId = typeof body.property_id === 'string' ? body.property_id : null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
  }

  const { data: client } = await db.from('clients').select('id').eq('id', clientId).single()
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (propertyId) {
    const { data: property } = await db
      .from('client_properties')
      .select('id')
      .eq('id', propertyId)
      .eq('client_id', clientId)
      .single()
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const { error } = await db
      .from('client_properties')
      .update({ latitude: lat, longitude: lng })
      .eq('id', propertyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { error } = await db.from('clients').update({ latitude: lat, longitude: lng }).eq('id', clientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
