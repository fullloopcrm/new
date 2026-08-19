// Haversine distance calculation

const EARTH_RADIUS_MILES = 3959

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Alias for compatibility
export const calculateDistance = haversineDistance

// Estimate transit time from straight-line distance
export function estimateTransitMinutes(distanceMiles: number): number {
  if (distanceMiles < 0.3) return 5
  return Math.round(10 + distanceMiles * 5)
}

// Every tenant on this platform is a US home-service business — a real
// result should never fall outside the continental US. Client addresses are
// often stored incomplete (no city/state, e.g. "352 W 58 St, 20E"), and
// Nominatim (global, no US bias by default) was matching those bare
// street/apartment numbers against similarly-numbered streets anywhere in
// the world — real production data included a Manhattan client geocoded to
// Hong Kong, another to London, another to rural Australia, silently
// corrupting every distance/travel-time calculation that read the cached
// result afterward. Reject anything outside this box instead of caching a
// wild coordinate. (Alaska/Hawaii excluded — no tenant currently operates
// there; revisit if one does.)
const US_MIN_LAT = 24
const US_MAX_LAT = 50
const US_MIN_LNG = -125
const US_MAX_LNG = -66

function isPlausibleUSCoordinate(lat: number, lng: number): boolean {
  return lat >= US_MIN_LAT && lat <= US_MAX_LAT && lng >= US_MIN_LNG && lng <= US_MAX_LNG
}

// In-process cache, keyed by normalized address. A serverless function
// instance stays warm across multiple invocations -- this is what was
// missing entirely. Every caller (scoreTeamForBooking, suggestBookingSlots,
// cron, backfill) shares it via the exported geocodeAddress below. A single
// recurring-schedule creation used to geocode the same handful of addresses
// (team member homes, that day's other clients for clustering) FRESH on every
// one of its ~6 initial weekly dates -- zero reuse, each miss a real network
// round-trip (measured ~500ms against Census, live). Storing the in-flight
// Promise (not just the resolved value) also dedupes concurrent lookups for
// the same address, so a caller that parallelizes its date loop can't fire N
// redundant requests for one address at once. Capped to bound memory on a
// long-lived warm instance; evicts the oldest entry (Map preserves insertion
// order) once full -- true LRU isn't worth the complexity for this hit rate.
const GEOCODE_CACHE_MAX = 2000
const geocodeCache = new Map<string, Promise<{ lat: number; lng: number } | null>>()

function normalizeAddressKey(address: string): string {
  return address.trim().toLowerCase()
}

// Primary geocoder: US Census (free, no API key, fast, strong US coverage —
// the standalone nycmaid app ran on this and never had the reliability/rate-limit
// problems Nominatim has for production use). Falls back to Nominatim if Census
// finds nothing (e.g. a non-US address on a non-nycmaid tenant).
//
// Census-gov does not send CORS headers, so calling it from the browser always
// fails (silently, as a rejected fetch) — verified live: every client-side
// call paid for a guaranteed-failing round trip before falling through to
// Nominatim anyway, which made map loads SLOWER, not faster. Server-side
// callers (smart-schedule, cron, backfill) have no such restriction and get
// the real speed/reliability win. Skip straight to Nominatim in the browser.
async function geocodeAddressUncached(address: string): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined') {
    const census = await geocodeCensus(address)
    if (census) return census
  }

  try {
    // countrycodes=us biases Nominatim's match to the US instead of the
    // whole world -- doesn't guarantee a correct match on an incomplete
    // address, so the plausibility check below is the real backstop.
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'FullLoopCRM/1.0' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      if (!isPlausibleUSCoordinate(lat, lng)) return null
      return { lat, lng }
    }
    return null
  } catch {
    return null
  }
}

export function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = normalizeAddressKey(address)
  const cached = geocodeCache.get(key)
  if (cached) return cached

  if (geocodeCache.size >= GEOCODE_CACHE_MAX) {
    const oldestKey = geocodeCache.keys().next().value
    if (oldestKey !== undefined) geocodeCache.delete(oldestKey)
  }
  const promise = geocodeAddressUncached(address)
  geocodeCache.set(key, promise)
  return promise
}

// US Census Bureau onelineaddress geocoder. Returns {x: lng, y: lat} on match.
async function geocodeCensus(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    const c = data?.result?.addressMatches?.[0]?.coordinates
    if (c && typeof c.x === 'number' && typeof c.y === 'number' && isPlausibleUSCoordinate(c.y, c.x)) {
      return { lat: c.y, lng: c.x }
    }
  } catch {
    // fall through to Nominatim
  }
  return null
}
