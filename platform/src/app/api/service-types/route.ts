/**
 * Public service types for the calling tenant -- what shows in the booking
 * form's Service dropdown (admin BookingsAdmin.tsx and every tenant's public
 * /book page). Tenant resolved from the x-tenant-id header set by middleware.
 *
 * Sources the real Catalog (`service_types` table, item_type IN
 * service/project/product/equipment -- see api/catalog/route.ts), filtered
 * to item_type='service' only: a booking's Service field must offer
 * services to book, never products/equipment/projects from the same
 * catalog. Falls back to the legacy settings.service_types JSON field only
 * for a tenant that hasn't populated the catalog yet, so no tenant
 * regresses to an empty dropdown.
 */
import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getSettings } from '@/lib/settings'
import { tenantDb } from '@/lib/tenant-db'

export async function GET() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json([])

  const { data: catalogServices } = await tenantDb(tenant.id)
    .from('service_types')
    .select('name, default_duration_hours, active')
    .eq('item_type', 'service')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (catalogServices && catalogServices.length > 0) {
    return NextResponse.json(
      catalogServices.map((s) => ({ name: s.name, default_hours: s.default_duration_hours ?? 2, active: true })),
    )
  }

  const settings = await getSettings(tenant.id)
  const active = (settings.service_types || []).filter((s) => s.active !== false)
  return NextResponse.json(active)
}
