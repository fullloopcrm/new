/**
 * Service-area coverage resolver — Phase 2 of tenant-site personalization.
 *
 * Given a tenant's geocoded center (from their business address) and a service
 * radius in miles, returns the covered neighborhoods and metro areas, each with
 * its straight-line distance from the center. This is the list every generated
 * geo/job page iterates in Phase 3.
 *
 * Reuses existing, free infrastructure — no new dependency, no API key:
 *   - ALL_NEIGHBORHOODS / AREAS  — src/lib/seo/locations.ts (lat/lng + real
 *     local signal: landmarks, housing types, local challenges, zips)
 *   - haversineDistance / geocodeAddress (Nominatim) — src/lib/geo.ts
 *
 * COVERAGE LIMIT (was open, now fixed): the neighborhood dataset is NYC-metro
 * only (Manhattan, Brooklyn, Queens, Long Island, North Jersey) — a tenant
 * whose center is outside that footprint resolves zero neighborhoods from the
 * static dataset. `resolveCoverage()` below now falls back to a live,
 * national lookup (Overpass/OSM, see ./nearby-places.ts) for `areas` when the
 * static dataset comes back empty, so a tenant anywhere in the US gets real
 * nearby cities instead of nothing. `neighborhoods` (the finer-grained,
 * NYC-specific dataset with landmarks/housing types/local-challenge copy)
 * stays dataset-bound — we never fabricate that richer local color for a
 * place we don't have real data for.
 */
import { ALL_NEIGHBORHOODS, type Neighborhood } from '@/lib/seo/locations'
import { AREAS, type Area } from '@/lib/seo/data/areas'
import { haversineDistance, geocodeAddress } from '@/lib/geo'
import { nearbyPlacesViaOverpass } from './nearby-places'

/**
 * How many of a tenant's nearest coverage areas get submitted for indexing
 * (sitemap.xml + <meta robots> on the area/careers pages themselves). Areas
 * ranked beyond this still render normally — real geo data, no 404 — they're
 * just excluded from the sitemap and marked noindex,follow, since the copy is
 * template-generated prose until generate-tenant-site.ts writes real content
 * for that area. Same containment already used for VA tenants' geo x service
 * combos and the marketing site's industry x city matrix (both mass-noindexed
 * after Google flagged them as near-duplicate). Combo pages
 * (/areas/[location]/[service]) have no content-generation path at all yet,
 * so those stay noindexed at every rank regardless of this limit.
 */
export const SITEMAP_AREA_LIMIT = 20

export interface CoveredNeighborhood {
  slug: string
  urlSlug: string
  name: string
  area: string
  lat: number
  lng: number
  distanceMiles: number
  zip_codes: string[]
  landmarks: string[]
  housing_types: string[]
  /** Industry-neutral alias for the dataset's local-challenge signal. */
  localChallenges: string[]
  nearby: string[]
}

export interface CoveredArea {
  slug: string
  urlSlug: string
  name: string
  state: string
  lat: number
  lng: number
  distanceMiles: number
}

export interface Coverage {
  center: { lat: number; lng: number } | null
  radiusMiles: number
  neighborhoods: CoveredNeighborhood[]
  areas: CoveredArea[]
}

function toCoveredNeighborhood(n: Neighborhood, distanceMiles: number): CoveredNeighborhood {
  return {
    slug: n.slug,
    urlSlug: n.urlSlug,
    name: n.name,
    area: n.area,
    lat: n.lat,
    lng: n.lng,
    distanceMiles,
    zip_codes: n.zip_codes,
    landmarks: n.landmarks,
    housing_types: n.housing_types,
    localChallenges: n.cleaning_challenges,
    nearby: n.nearby,
  }
}

/** Neighborhoods whose center is within `radiusMiles`, nearest first. */
export function neighborhoodsWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
): CoveredNeighborhood[] {
  return ALL_NEIGHBORHOODS
    .map((n) => toCoveredNeighborhood(n, haversineDistance(centerLat, centerLng, n.lat, n.lng)))
    .filter((n) => n.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

/** Metro areas whose center is within `radiusMiles`, nearest first. */
export function areasWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
): CoveredArea[] {
  return AREAS
    .map((a: Area) => ({
      slug: a.slug,
      urlSlug: a.urlSlug,
      name: a.name,
      state: a.state,
      lat: a.lat,
      lng: a.lng,
      distanceMiles: haversineDistance(centerLat, centerLng, a.lat, a.lng),
    }))
    .filter((a) => a.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

export interface ResolveCoverageOptions {
  lat?: number | null
  lng?: number | null
  address?: string | null
  radiusMiles: number
}

/**
 * Resolve full coverage for a tenant. Uses the passed lat/lng when present;
 * otherwise geocodes `address` (free Nominatim). Returns an empty coverage with
 * a null center when neither a center nor a geocodable address is available —
 * callers treat that as "geo layer not ready", never as an error.
 */
export async function resolveCoverage(opts: ResolveCoverageOptions): Promise<Coverage> {
  let center: { lat: number; lng: number } | null =
    typeof opts.lat === 'number' && typeof opts.lng === 'number'
      ? { lat: opts.lat, lng: opts.lng }
      : null

  if (!center && opts.address && opts.address.trim()) {
    center = await geocodeAddress(opts.address.trim())
  }

  if (!center) {
    return { center: null, radiusMiles: opts.radiusMiles, neighborhoods: [], areas: [] }
  }

  const neighborhoods = neighborhoodsWithinRadius(center.lat, center.lng, opts.radiusMiles)
  const staticAreas = areasWithinRadius(center.lat, center.lng, opts.radiusMiles)

  // The static NY/NJ dataset is a handful of hand-curated regional entries
  // (5 total: manhattan, brooklyn, queens, one umbrella "long-island", new
  // jersey) — real signal for nycmaid's own borough copy, but nowhere near
  // "every town" coverage. Always merge in the live Overpass lookup (real
  // OSM towns/cities/villages, works anywhere in the US) rather than only
  // falling back to it when the static list is fully empty — otherwise any
  // tenant centered near NYC/NJ (in range of those 5 static entries) never
  // gets granular per-town coverage. Static entries take priority on a
  // urlSlug collision (they carry hand-written descriptions the Overpass
  // result doesn't). Never throws (best-effort, see nearbyPlacesViaOverpass
  // docstring) — a live-lookup failure just means static-only, same as before.
  const livePlaces = await nearbyPlacesViaOverpass(center.lat, center.lng, opts.radiusMiles)
  const staticSlugs = new Set(staticAreas.map((a) => a.urlSlug))
  const mergedAreas = [
    ...staticAreas,
    ...livePlaces
      .filter((p) => !staticSlugs.has(p.urlSlug))
      .map((p) => ({
        slug: p.slug,
        urlSlug: p.urlSlug,
        name: p.name,
        state: p.state,
        lat: p.lat,
        lng: p.lng,
        distanceMiles: p.distanceMiles,
      })),
  ].sort((a, b) => a.distanceMiles - b.distanceMiles)

  return {
    center,
    radiusMiles: opts.radiusMiles,
    neighborhoods,
    areas: mergedAreas,
  }
}
