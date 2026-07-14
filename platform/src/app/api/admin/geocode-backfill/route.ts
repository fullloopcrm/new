/**
 * Backfill lat/lng for clients + team_members that don't have coords.
 * Tenant-scoped. Ported from nycmaid. Auth: settings.edit.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'

export async function POST() {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const tenantId = tenant.tenantId
  const db = tenantDb(tenantId)
  let clientsGeocoded = 0
  let teamGeocoded = 0
  let failed = 0

  const { data: clients } = await db
    .from('clients')
    .select('id, address')
    .is('latitude', null)
    .not('address', 'is', null)
    .limit(200)

  for (const c of clients || []) {
    if (!c.address) continue
    const coords = await geocodeAddress(c.address)
    if (coords) {
      await db
        .from('clients')
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq('id', c.id)
      clientsGeocoded++
    } else {
      failed++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  const { data: members } = await db
    .from('team_members')
    .select('id, address')
    .is('home_latitude', null)
    .not('address', 'is', null)
    .limit(50)

  for (const m of members || []) {
    if (!m.address) continue
    const coords = await geocodeAddress(m.address)
    if (coords) {
      await db
        .from('team_members')
        .update({ home_latitude: coords.lat, home_longitude: coords.lng })
        .eq('id', m.id)
      teamGeocoded++
    } else {
      failed++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({ success: true, clientsGeocoded, teamGeocoded, failed })
}
