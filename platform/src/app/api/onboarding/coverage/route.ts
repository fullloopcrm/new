import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { resolveCoverage } from '@/lib/geo/coverage'
import type { ServiceZone } from '@/lib/service-area'

/**
 * Auto-populate coverage zones from the tenant's verified address + a mile
 * radius — the "local" service-area default for anyone outside the one metro
 * (NYC) we have a hand-authored zone list for (see ServiceAreaEditor.tsx).
 * Reuses resolveCoverage (free Nominatim geocoding + a static NYC/NJ
 * neighborhood dataset, falling back to live OSM/Overpass nationally) —
 * same engine activateTenant() already uses for the geo/job-page spine, not
 * new infrastructure.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { token?: string; radiusMiles?: number } | null
  const radiusMiles = body?.radiusMiles
  if (!radiusMiles || radiusMiles <= 0) return NextResponse.json({ error: 'radiusMiles required' }, { status: 400 })

  const tenantId = await resolveOnboardingTenantId(body?.token || null)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('address, service_area_lat, service_area_lng')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: entity } = await supabaseAdmin
    .from('entities')
    .select('city, state, zip')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .maybeSingle()

  // The bare street ("765 Laura St") geocodes ambiguously/wrong — Nominatim
  // needs city/state/zip too, same as any address lookup. Bug found + fixed
  // 2026-08-02: an earlier version passed tenant.address alone and got a
  // real wrong-state result (Fresno, CA for a Clearwater, FL address).
  const fullAddress = [tenant.address, entity?.city, entity?.state, entity?.zip]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(', ')

  const coverage = await resolveCoverage({
    lat: tenant.service_area_lat as number | null,
    lng: tenant.service_area_lng as number | null,
    address: fullAddress || null,
    radiusMiles,
  })

  if (!coverage.center) return NextResponse.json({ zones: [], geocoded: false })

  // Persist the geocoded center so repeat calls (e.g. radius edited again)
  // don't re-hit Nominatim — same pattern activate-tenant.ts uses.
  if (typeof tenant.service_area_lat !== 'number') {
    await supabaseAdmin
      .from('tenants')
      .update({ service_area_lat: coverage.center.lat, service_area_lng: coverage.center.lng })
      .eq('id', tenantId)
  }

  // Populated areas (cities/towns) only, nearest first, capped -- Jeff's
  // explicit call (2026-08-02): auto-populate should pick real named places
  // a customer would recognize, not the fine-grained NYC/NJ neighborhood
  // dataset (coverage.neighborhoods), which stays available as the manual
  // "Quick add: NYC boroughs" preset instead.
  const zones: ServiceZone[] = coverage.areas
    .map((a) => ({ id: `area_${a.slug}`, label: a.state ? `${a.name}, ${a.state}` : a.name }))
    .slice(0, 25)

  return NextResponse.json({ zones, geocoded: true })
}
