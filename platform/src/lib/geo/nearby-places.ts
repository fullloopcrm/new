/**
 * National "nearby places" fallback — Phase 2 geo nationalization.
 *
 * `resolveCoverage()` (./coverage.ts) resolves nearby cities/neighborhoods from a
 * static, NY/NJ-only dataset. Outside that footprint (e.g. an Indianapolis
 * tenant) it returns zero results. This module is the live fallback: given a
 * geocoded center + radius, it returns real nearby cities/towns/villages
 * anywhere in the US, with no pre-built dataset required.
 *
 * WHY NOT NOMINATIM (the first attempt, tried live, failed):
 * Nominatim (used elsewhere in this repo — see geocodeAddress in ../geo.ts)
 * only exposes forward search (name/address -> one place) and reverse geocode
 * (point -> the single place containing it). Neither is a "list everything
 * within N miles" query — /search matches a text query against place names, it
 * doesn't enumerate places inside a radius/bbox; /reverse returns exactly one
 * result (the address/place containing the given point), not a list of
 * nearby ones. Passing a generic query like "city" with a viewbox does not
 * work either — Nominatim still requires the query text to match the target
 * place's name. There is no Nominatim endpoint shaped like "nearby places."
 *
 * WHAT ACTUALLY WORKS: the Overpass API (the query engine over OpenStreetMap's
 * raw data, https://overpass-api.de) supports a genuine radius search via its
 * `around` filter: `node["place"~"city|town|village"](around:METERS,LAT,LNG)`
 * returns every OSM place node within that radius, each with a name and
 * coordinates. This is exactly "nearby cities within a radius, no pre-built
 * dataset" — verified live against both Times Square (NYC-metro, 25mi -> 321
 * real places incl. Weehawken, Hoboken, Jersey City, sorted by distance) and
 * downtown Indianapolis (25mi -> 46 real places incl. Mooresville, Franklin,
 * Fortville — a region the static NY/NJ dataset has zero coverage for).
 *
 * RATE LIMITS (both this endpoint and Nominatim's are strict — do not remove
 * the caching/fallback below without replacing it):
 * - Nominatim's usage policy: max 1 req/sec, custom User-Agent required, no
 *   heavy/bulk use — already respected by geocodeAddress in ../geo.ts.
 * - Overpass's public instance (overpass-api.de) publishes a small slot count
 *   per IP (`GET /api/status`) and returns a `rate_limited` error (as HTML,
 *   not JSON — handled below) when exceeded. It has no published fixed
 *   requests/sec figure but is explicitly shared, best-effort infrastructure;
 *   heavy production use should self-host Overpass or use a paid provider.
 *   A second public mirror (kumi.systems) is used as a fallback below.
 *
 * CACHING (24h TTL, and why it's a DB table, not just an in-memory Map):
 * This only ever runs inside `resolveCoverage()` -> `activateTenant()`, which
 * is invoked from `src/app/api/admin/businesses/[id]/activate/route.ts`
 * (`export const runtime = 'nodejs'`) — a Vercel serverless function, not a
 * long-running process. A module-level `Map` is NOT reliably shared across
 * invocations there: cold starts get a fresh empty module scope, and even
 * warm-container reuse isn't guaranteed. Given Overpass's real rate limiting
 * (hit live during development after just two requests in quick succession —
 * see `GET /api/status`), a cache that silently resets on most invocations
 * defeats the purpose. `geo_nearby_places_cache` (migration
 * `supabase/migrations/20260730140000_geo_nearby_places_cache.sql`) is the
 * real persistence layer, keyed the same way as the in-memory Map
 * (`${lat.toFixed(2)},${lng.toFixed(2)},${radiusMiles}`); the Map stays as a
 * same-invocation fast path only (harmless, occasionally saves a DB round
 * trip within one warm container, never load-bearing for the TTL).
 */
import { haversineDistance } from '../geo'
import { supabaseAdmin } from '../supabase'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const METERS_PER_MILE = 1609.344
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 20_000
// Drop a place ONLY when OSM tags a real, known population below this floor —
// the "zoomed out, not all the way in" cutoff (a few hundred people is a
// hamlet in practice, whatever `place` tag it carries). A place with NO
// population tag is kept, never dropped — OSM's population tagging is
// inconsistent, and a real, sizable town lacking the tag is far more likely
// than a tagged one being wrong, so silence is not treated as "small."
const MIN_KNOWN_POPULATION = 500

export interface NearbyPlace {
  slug: string
  urlSlug: string
  name: string
  /** Best-effort — OSM place nodes rarely carry a state tag directly (unlike
   * a proper reverse-geocode). Empty string when unknown rather than guessed;
   * a metro that straddles a state line (NYC/NJ, for example) makes "assume
   * the tenant's own state" wrong for some results, so we don't fabricate it. */
  state: string
  lat: number
  lng: number
  distanceMiles: number
  population: number | null
}

interface OverpassNode {
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassNode[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Same-invocation fast path only — see CACHING note above for why this alone
// is not sufficient on serverless.
const cache = new Map<string, { expires: number; data: NearbyPlace[] }>()

function cacheKey(lat: number, lng: number, radiusMiles: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)},${radiusMiles}`
}

/** Best-effort read from the persistent cache. Never throws — a DB hiccup
 * just means falling through to a live Overpass query, same as a miss. */
async function readDbCache(key: string): Promise<NearbyPlace[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('geo_nearby_places_cache')
      .select('places, expires_at')
      .eq('cache_key', key)
      .maybeSingle()
    if (error || !data) return null
    if (new Date(data.expires_at).getTime() <= Date.now()) return null
    return data.places as NearbyPlace[]
  } catch (err) {
    console.error('nearbyPlacesViaOverpass: DB cache read failed', err)
    return null
  }
}

/** Best-effort write to the persistent cache. Never throws — a failed write
 * just means the next invocation re-queries Overpass instead of hitting a
 * warm cache; it must never block returning the live-fetched result. */
async function writeDbCache(
  key: string,
  lat: number,
  lng: number,
  radiusMiles: number,
  places: NearbyPlace[],
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('geo_nearby_places_cache').upsert(
      {
        cache_key: key,
        lat,
        lng,
        radius_miles: radiusMiles,
        places,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: 'cache_key' },
    )
    if (error) console.error('nearbyPlacesViaOverpass: DB cache write failed', error)
  } catch (err) {
    console.error('nearbyPlacesViaOverpass: DB cache write failed', err)
  }
}

function buildQuery(lat: number, lng: number, radiusMiles: number): string {
  const radiusMeters = Math.round(radiusMiles * METERS_PER_MILE)
  return `[out:json][timeout:25];(node["place"~"^(city|town|village)$"](around:${radiusMeters},${lat},${lng}););out body;`
}

function toNearbyPlace(node: OverpassNode, centerLat: number, centerLng: number): NearbyPlace | null {
  const name = node.tags?.name
  if (!name) return null
  const populationRaw = node.tags?.population
  const population = populationRaw ? Number.parseInt(populationRaw, 10) : null
  return {
    // OSM place names collide across states/counties (two "Franklin"s showed
    // up within 25mi of NYC in live testing) — the node id keeps slugs unique.
    slug: `${slugify(name)}-${node.id}`,
    urlSlug: slugify(name),
    name,
    state: node.tags?.['addr:state'] || node.tags?.['is_in:state'] || '',
    lat: node.lat,
    lng: node.lon,
    distanceMiles: haversineDistance(centerLat, centerLng, node.lat, node.lon),
    population: Number.isFinite(population) ? population : null,
  }
}

async function queryOverpass(endpoint: string, query: string): Promise<OverpassResponse | null> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'User-Agent': 'FullLoopCRM/1.0 (service-area lookup)',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const text = await res.text()
  // Overpass returns rate-limit/error responses as an HTML page, not JSON —
  // detect that before attempting to parse, and fall through to the next
  // mirror instead of throwing on the caller.
  if (!res.ok || text.trimStart().startsWith('<')) {
    throw new Error(`Overpass ${endpoint} unavailable (status ${res.status}): ${text.slice(0, 200)}`)
  }
  return JSON.parse(text) as OverpassResponse
}

/**
 * Real nearby cities/towns/villages within `radiusMiles` of a center point,
 * nearest first — works anywhere in the world OSM has data (in practice, the
 * whole US), no pre-built dataset. Best-effort: returns [] rather than
 * throwing if every Overpass mirror is unavailable or rate-limited, so
 * callers (resolveCoverage -> activateTenant) can treat this the same as
 * "geo layer not ready" instead of failing tenant activation.
 */
export async function nearbyPlacesViaOverpass(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
): Promise<NearbyPlace[]> {
  const key = cacheKey(centerLat, centerLng, radiusMiles)
  const inMemory = cache.get(key)
  if (inMemory && inMemory.expires > Date.now()) return inMemory.data

  const persisted = await readDbCache(key)
  if (persisted) {
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: persisted })
    return persisted
  }

  const query = buildQuery(centerLat, centerLng, radiusMiles)
  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await queryOverpass(endpoint, query)
      if (!data) continue
      const places = data.elements
        .map((node) => toNearbyPlace(node, centerLat, centerLng))
        .filter((p): p is NearbyPlace =>
          p !== null &&
          p.distanceMiles <= radiusMiles &&
          (p.population === null || p.population >= MIN_KNOWN_POPULATION))
        .sort((a, b) => a.distanceMiles - b.distanceMiles)

      cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: places })
      await writeDbCache(key, centerLat, centerLng, radiusMiles, places)
      return places
    } catch (err) {
      lastError = err
      // try the next mirror
    }
  }

  console.error('nearbyPlacesViaOverpass: all Overpass endpoints failed', lastError)
  return []
}
