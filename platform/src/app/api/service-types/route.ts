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
 *
 * Carries default_hourly_rate alongside the name -- previously this endpoint
 * only returned name/hours, so the booking form had no way to know a
 * service's real catalog price and silently defaulted every new booking to
 * a hardcoded rate (69, nycmaid's own standard-cleaning rate) regardless of
 * tenant or which service was actually selected.
 */
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/tenant'
import { getSettings } from '@/lib/settings'
import { tenantDb } from '@/lib/tenant-db'

export async function GET() {
  // getCurrentTenant() tries the signed x-tenant-id header first (the public
  // /book page's path), then falls back to admin-PIN-impersonation/Clerk
  // session resolution -- getTenantFromHeaders() alone only covered the
  // header case, so this route always returned [] for an admin working a
  // tenant from the platform's own super-admin panel (no x-tenant-id header
  // is set on that path) instead of just the tenant's own custom domain,
  // silently emptying the Service dropdown in BookingsAdmin/CreateBookingForm
  // for every admin-impersonation session.
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json([])

  const { data: catalogServices } = await tenantDb(tenant.id)
    .from('service_types')
    .select('name, default_duration_hours, default_hourly_rate, active')
    .eq('item_type', 'service')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (catalogServices && catalogServices.length > 0) {
    return NextResponse.json(
      catalogServices.map((s) => ({
        name: s.name,
        default_hours: s.default_duration_hours ?? 2,
        default_hourly_rate: s.default_hourly_rate ?? null,
        active: true,
      })),
    )
  }

  // Legacy fallback carries its rate under `rate`, not `default_hourly_rate`
  // -- normalize the key so every consumer of this endpoint only ever has to
  // check one field name regardless of which branch served the response.
  const settings = await getSettings(tenant.id)
  const active = (settings.service_types || [])
    .filter((s) => s.active !== false)
    .map((s) => ({ ...s, default_hourly_rate: s.rate || null }))
  return NextResponse.json(active)
}
