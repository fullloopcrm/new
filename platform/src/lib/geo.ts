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
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined') {
    const census = await geocodeCensus(address)
    if (census) return census
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'FullLoopCRM/1.0' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

// US Census Bureau onelineaddress geocoder. Returns {x: lng, y: lat} on match.
async function geocodeCensus(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    const c = data?.result?.addressMatches?.[0]?.coordinates
    if (c && typeof c.x === 'number' && typeof c.y === 'number') {
      return { lat: c.y, lng: c.x }
    }
  } catch {
    // fall through to Nominatim
  }
  return null
}
