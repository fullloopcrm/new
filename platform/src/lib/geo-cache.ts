'use client'
// Shared browser-side geocode cache. Previously each map component (dashboard
// homepage, /dashboard/map, /team job map) reimplemented its own geocoding
// loop with an in-memory-only cache that gets rebuilt from scratch on every
// page load — the addresses never changed, but every visit re-hit the
// geocoder for all of them. ClientsMap.tsx already had this right
// (localStorage-persisted, batched); this extracts that pattern so every map
// shares one cache instead of each page re-geocoding independently.

export type Coords = { lat: number; lng: number }

const CACHE_KEY = 'fullloop_geocode_cache'
const BATCH_SIZE = 5

// Persisted lat/lng in the DB is not guaranteed correct — found live (2026-07-24)
// real NYC addresses with stored coords in Florida, the UK, and Australia,
// almost certainly from a bad geocode result that got written once and never
// re-checked. Trusting persisted coords blindly (the whole point of this file)
// would put those bad pins on the map permanently instead of re-resolving them.
// Reject anything implausibly far from the rest of the batch's own median
// point — tenant-agnostic (no hardcoded region), works for any tenant's actual
// service area since it's relative to that tenant's own other points.
//
// 100mi was too tight: found live (2026-08-08) on a tenant serving all of
// Florida (a single state, but ~450mi Pensacola-to-Miami) — the threshold
// was rejecting genuinely correct, geographically spread clients as
// "outliers" relative to whichever regional cluster happened to be the
// majority, silently erasing real customers from the map. 500mi comfortably
// covers any single-state service area (even Texas/California/Alaska
// top-to-bottom) while still catching what this check exists to catch: the
// actual bad geocodes seen in production landed hundreds to thousands of
// miles away (Utah, Arkansas, Mississippi, Colorado, the UK, Australia).
const OUTLIER_THRESHOLD_MILES = 500

export function rejectOutliers<T extends { lat: number; lng: number }>(entries: T[]): T[] {
  if (entries.length < 3) return entries // too few points to judge an outlier meaningfully
  const sorted = (nums: number[]) => [...nums].sort((a, b) => a - b)
  const median = (nums: number[]) => sorted(nums)[Math.floor(nums.length / 2)]
  const medianLat = median(entries.map(e => e.lat))
  const medianLng = median(entries.map(e => e.lng))

  return entries.filter((e) => {
    // Inline haversine (lib/geo.ts's version isn't imported here to keep this
    // file free of the geocodeAddress import at module scope for callers that
    // only need the cache, not the geocoder).
    const R = 3959
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(e.lat - medianLat)
    const dLng = toRad(e.lng - medianLng)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(medianLat)) * Math.cos(toRad(e.lat)) * Math.sin(dLng / 2) ** 2
    const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return miles <= OUTLIER_THRESHOLD_MILES
  })
}

export function loadGeoCache(): Record<string, Coords> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveGeoCache(cache: Record<string, Coords>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage unavailable (private mode, quota) — cache just won't persist
  }
}

// Resolves cached/pre-geocoded entries immediately, then geocodes the rest in
// parallel batches, calling onBatch after each batch so callers can render
// progressively instead of waiting for every address to resolve.
export async function geocodeAddressesCached(
  addresses: string[],
  onBatch?: (resolved: Record<string, Coords>) => void,
): Promise<Record<string, Coords>> {
  const { geocodeAddress } = await import('@/lib/geo')
  const cache = loadGeoCache()
  const unique = [...new Set(addresses.filter(Boolean))]
  const resolved: Record<string, Coords> = {}

  const toGeocode: string[] = []
  for (const address of unique) {
    if (cache[address]) resolved[address] = cache[address]
    else toGeocode.push(address)
  }
  if (Object.keys(resolved).length > 0) onBatch?.(resolved)
  if (toGeocode.length === 0) return resolved

  for (let i = 0; i < toGeocode.length; i += BATCH_SIZE) {
    const batch = toGeocode.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (address) => {
        const coords = await geocodeAddress(address)
        return [address, coords] as const
      }),
    )
    for (const [address, coords] of results) {
      if (coords) {
        cache[address] = coords
        resolved[address] = coords
      }
    }
    onBatch?.(resolved)
  }

  saveGeoCache(cache)
  return resolved
}
