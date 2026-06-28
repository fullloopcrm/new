// Multi-address resolution helpers (ported exact from nycmaid src/lib/client-properties.ts).
//
// One client can have many properties (addresses). These helpers resolve the
// address a booking should use: the booking's property → the client's primary
// active property → legacy clients.address. SAFE BEFORE the 052 migration runs:
// getBookingAddress checks `data` (null when client_properties doesn't exist yet)
// and falls through to the legacy clients.address, so nothing breaks pre-migration.
//
// CRUD for properties (add/edit/set-primary from the portal/admin) is a separate
// follow-up — this file is only the read/resolve path used by dispatch + sends.

import { supabaseAdmin } from './supabase'

// supabase-js types a to-one join as an array; at runtime it's an object.
// Accept both shapes so callers don't need `as unknown as` gymnastics.
type AddrShape = { address?: string | null; latitude?: number | null; longitude?: number | null }
type Rel<T> = T | T[] | null | undefined

interface BookingAddrJoin {
  client_properties?: Rel<AddrShape>
  clients?: Rel<AddrShape>
}

function one<T>(v: Rel<T>): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null
  return (v ?? null) as T | null
}

export function bookingAddress(b: BookingAddrJoin | null | undefined): string | null {
  return one(b?.client_properties)?.address ?? one(b?.clients)?.address ?? null
}

// Overwrite a joined booking's clients.{address,latitude,longitude} with its
// property's values when set. Lets downstream code that reads b.clients.* stay
// unchanged while showing the property for THIS booking. Mutates in place.
export function applyPropertyToBookingClient(b: BookingAddrJoin | null | undefined): void {
  const cp = one(b?.client_properties)
  const cl = one(b?.clients) as (AddrShape | null)
  if (!cp || !cl) return
  if (cp.address != null) cl.address = cp.address
  if (cp.latitude != null) cl.latitude = cp.latitude
  if (cp.longitude != null) cl.longitude = cp.longitude
}

export function bookingCoords(b: BookingAddrJoin | null | undefined): { lat: number; lng: number } | null {
  const cp = one(b?.client_properties)
  if (cp?.latitude != null && cp?.longitude != null) return { lat: Number(cp.latitude), lng: Number(cp.longitude) }
  const c = one(b?.clients)
  if (c?.latitude != null && c?.longitude != null) return { lat: Number(c.latitude), lng: Number(c.longitude) }
  return null
}

// Resolve the address a booking should use for zone + cleaner scoring.
// Priority: explicit property_id → client's primary active property →
// legacy clients.address fallback (pre-migration clients with no property row).
export async function getBookingAddress(opts: {
  propertyId?: string | null
  clientId?: string | null
}): Promise<{ propertyId: string | null; address: string | null; latitude: number | null; longitude: number | null }> {
  const { propertyId, clientId } = opts

  if (propertyId) {
    const { data } = await supabaseAdmin
      .from('client_properties')
      .select('id, address, latitude, longitude')
      .eq('id', propertyId)
      .single()
    if (data) return { propertyId: data.id, address: data.address, latitude: data.latitude, longitude: data.longitude }
  }

  if (clientId) {
    const { data: props } = await supabaseAdmin
      .from('client_properties')
      .select('id, address, latitude, longitude, is_primary, created_at')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
    const p = props?.[0]
    if (p) return { propertyId: p.id, address: p.address, latitude: p.latitude, longitude: p.longitude }

    // Legacy fallback: client predates properties and backfill found no address.
    const { data: c } = await supabaseAdmin
      .from('clients')
      .select('address, latitude, longitude')
      .eq('id', clientId)
      .single()
    if (c?.address) return { propertyId: null, address: c.address, latitude: c.latitude ?? null, longitude: c.longitude ?? null }
  }

  return { propertyId: null, address: null, latitude: null, longitude: null }
}
