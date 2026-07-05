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
 * COVERAGE LIMIT (intentional, flagged): the neighborhood dataset is currently
 * NYC-metro (Manhattan, Brooklyn, Queens, Long Island, North Jersey). A tenant
 * whose center is outside that footprint resolves zero neighborhoods — the geo
 * layer is a no-op for them until the dataset is broadened (Phase 2b: national
 * places via a Census gazetteer). Areas/neighborhoods are dataset-bound, not
 * invented, so we never fabricate places we don't have real data for.
 */
import { ALL_NEIGHBORHOODS, type Neighborhood } from '@/lib/seo/locations'
import { AREAS, type Area } from '@/lib/seo/data/areas'
import { haversineDistance, geocodeAddress } from '@/lib/geo'

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

  return {
    center,
    radiusMiles: opts.radiusMiles,
    neighborhoods: neighborhoodsWithinRadius(center.lat, center.lng, opts.radiusMiles),
    areas: areasWithinRadius(center.lat, center.lng, opts.radiusMiles),
  }
}
