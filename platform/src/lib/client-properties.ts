// Multi-address resolution + CRUD (ported from nycmaid src/lib/client-properties.ts).
//
// One client can have many properties (addresses). FullLoop adaptation: every
// client_properties / property_changes row carries tenant_id (resolved from the
// client). Geocoding fire-and-forget is dropped here — coords resolve on demand
// in the scheduler — so this file has no @/lib/geo dependency.

import { supabaseAdmin } from './supabase'

export interface PropertyRef {
  id: string
  address: string
  latitude: number | null
  longitude: number | null
}

// ---- read / resolve helpers (used by dispatch + sends) --------------------

// supabase-js types a to-one join as an array; at runtime it's an object.
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
// property's values when set. Mutates in place.
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

// Resolve the address a booking should use. Priority: explicit property_id →
// client's primary active property → legacy clients.address. Defensive: returns
// the client fallback when client_properties is empty.
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

    const { data: c } = await supabaseAdmin
      .from('clients')
      .select('address, latitude, longitude')
      .eq('id', clientId)
      .single()
    if (c?.address) return { propertyId: null, address: c.address, latitude: c.latitude ?? null, longitude: c.longitude ?? null }
  }

  return { propertyId: null, address: null, latitude: null, longitude: null }
}

// ---- CRUD (portal / admin) ------------------------------------------------

export function normalizeAddress(raw: string): string {
  return (raw || '').toLowerCase().replace(/[.,#]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function combine(address: string, unit?: string | null): string {
  const a = (address || '').trim()
  const u = (unit || '').trim()
  return u ? `${a}, ${u}` : a
}

export interface ChangeActor {
  changedBy?: 'client' | 'admin' | 'agent' | 'system'
  actorId?: string | null
  source?: 'portal' | 'admin' | 'booking' | 'api'
}

// FL rows are tenant-scoped — resolve the client's tenant_id for inserts.
async function clientTenantId(clientId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('clients').select('tenant_id').eq('id', clientId).single()
  return (data?.tenant_id as string) ?? null
}

// Append an audit row. Never throws — logging must not break the write path.
export async function logPropertyChange(opts: {
  clientId: string
  propertyId?: string | null
  action: 'add' | 'edit' | 'set_primary' | 'deactivate' | 'reactivate'
  oldValue?: unknown
  newValue?: unknown
  actor?: ChangeActor
}): Promise<void> {
  try {
    const tenantId = await clientTenantId(opts.clientId)
    if (!tenantId) return
    await supabaseAdmin.from('property_changes').insert({
      tenant_id: tenantId,
      client_id: opts.clientId,
      property_id: opts.propertyId ?? null,
      action: opts.action,
      old_value: opts.oldValue ?? null,
      new_value: opts.newValue ?? null,
      changed_by: opts.actor?.changedBy ?? 'system',
      actor_id: opts.actor?.actorId ?? null,
      source: opts.actor?.source ?? null,
    })
  } catch (err) {
    console.error('logPropertyChange failed:', err)
  }
}

// Resolve the property for a client + address: reuse an existing match, else
// create. Lets a returning client book a DIFFERENT address without a duplicate
// client record.
export async function resolveProperty(
  clientId: string,
  rawAddress: string,
  unit?: string | null,
  actor: ChangeActor = { changedBy: 'system', source: 'booking' }
): Promise<PropertyRef | null> {
  const full = combine(rawAddress, unit)
  if (!clientId || !full) return null

  const norm = normalizeAddress(full)

  const { data: existing } = await supabaseAdmin
    .from('client_properties')
    .select('id, address, latitude, longitude')
    .eq('client_id', clientId)
    .eq('active', true)

  const match = existing?.find((p) => normalizeAddress(p.address) === norm)
  if (match) return match

  const tenantId = await clientTenantId(clientId)
  if (!tenantId) return null

  const isPrimary = !existing || existing.length === 0

  const { data: created, error } = await supabaseAdmin
    .from('client_properties')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      address: full,
      unit: unit || null,
      is_primary: isPrimary,
      active: true,
    })
    .select('id, address, latitude, longitude')
    .single()

  if (error) {
    console.error('resolveProperty insert failed:', error.message)
    return null
  }

  await logPropertyChange({
    clientId,
    propertyId: created.id,
    action: 'add',
    newValue: { address: full, is_primary: isPrimary },
    actor,
  })

  return created
}

// List a client's active properties (primary first, then oldest).
export async function listProperties(clientId: string) {
  const { data } = await supabaseAdmin
    .from('client_properties')
    .select('id, label, address, unit, is_primary, active, created_at')
    .eq('client_id', clientId)
    .eq('active', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  return data || []
}

// Add a property explicitly (portal/admin). Dedupes to an existing match.
export async function addProperty(
  clientId: string,
  rawAddress: string,
  opts: { unit?: string | null; label?: string | null; makePrimary?: boolean; actor?: ChangeActor } = {}
): Promise<PropertyRef | null> {
  const existing = await resolveProperty(clientId, rawAddress, opts.unit, opts.actor ?? { changedBy: 'client', source: 'portal' })
  if (existing && opts.label) {
    await supabaseAdmin.from('client_properties').update({ label: opts.label }).eq('id', existing.id)
  }
  if (existing && opts.makePrimary) {
    await setPrimaryProperty(clientId, existing.id, opts.actor)
  }
  return existing
}

// Edit an existing property's address/unit/label, logging before/after.
export async function updateProperty(
  clientId: string,
  propertyId: string,
  patch: { address?: string; unit?: string | null; label?: string | null },
  actor?: ChangeActor
): Promise<PropertyRef | null> {
  const { data: before } = await supabaseAdmin
    .from('client_properties')
    .select('id, address, unit, label, latitude, longitude')
    .eq('id', propertyId)
    .eq('client_id', clientId)
    .single()
  if (!before) return null

  const next: Record<string, unknown> = {}
  // Resolve by which key is present, not by value — `??` would treat an
  // explicit `unit: null` (clear the unit) as absent and fall back to the
  // stale `before.unit`, baking the old unit into the recombined address.
  const nextUnit = patch.unit !== undefined ? patch.unit : before.unit
  if (patch.address != null) next.address = combine(patch.address, nextUnit)
  if (patch.unit !== undefined) next.unit = patch.unit
  if (patch.label !== undefined) next.label = patch.label
  if (Object.keys(next).length === 0) return before as PropertyRef

  // Address changed → clear stale coords (re-geocoded on demand by the scheduler).
  const addressChanged = next.address != null && next.address !== before.address
  if (addressChanged) { next.latitude = null; next.longitude = null }

  const { data: after, error } = await supabaseAdmin
    .from('client_properties')
    .update(next)
    .eq('id', propertyId)
    .eq('client_id', clientId)
    .select('id, address, latitude, longitude')
    .single()
  if (error || !after) { console.error('updateProperty failed:', error?.message); return null }

  await logPropertyChange({
    clientId, propertyId, action: 'edit',
    oldValue: { address: before.address, unit: before.unit, label: before.label },
    newValue: { address: after.address, unit: nextUnit, label: patch.label !== undefined ? patch.label : before.label },
    actor,
  })
  return after
}

// Make one property primary (and clear the flag on the others).
export async function setPrimaryProperty(clientId: string, propertyId: string, actor?: ChangeActor): Promise<void> {
  await supabaseAdmin.from('client_properties').update({ is_primary: false }).eq('client_id', clientId)
  await supabaseAdmin.from('client_properties').update({ is_primary: true }).eq('id', propertyId).eq('client_id', clientId)
  await logPropertyChange({ clientId, propertyId, action: 'set_primary', newValue: { is_primary: true }, actor })
}

// Soft-delete a property (keeps booking history intact).
export async function deactivateProperty(clientId: string, propertyId: string, actor?: ChangeActor): Promise<void> {
  await supabaseAdmin.from('client_properties').update({ active: false, is_primary: false }).eq('id', propertyId).eq('client_id', clientId)
  await logPropertyChange({ clientId, propertyId, action: 'deactivate', actor })
}
