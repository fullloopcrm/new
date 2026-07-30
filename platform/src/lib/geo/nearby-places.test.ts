import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * nearbyPlacesViaOverpass — Phase A verification (per the geo-nationalization
 * plan): assert a known non-NY/NJ address returns real places via the
 * Overpass fallback, not an empty list — the exact case the static NY/NJ
 * dataset in ./coverage.ts fails on today.
 *
 * The fixture below is a trimmed real Overpass response — the actual node
 * ids/coords/names/populations captured live against
 * `around:40233,39.7684,-86.1581` (downtown Indianapolis, 25mi), stripped of
 * the ~100 unused `name:xx` translation tags OSM attaches to every place
 * node. This keeps the test hermetic (no live network call, no dependence on
 * Overpass's real-time availability/rate limit) while still exercising the
 * parsing/filtering/sorting logic against data Overpass actually returned.
 *
 * Every test reloads the module fresh (`vi.resetModules` + dynamic import)
 * so the module-level in-memory cache never leaks between test cases —
 * without that, every test after the first would silently hit the warm
 * in-memory cache instead of the path under test.
 *
 * Supabase is mocked the same thenable-chain way as provision-tenant.test.ts:
 * the cache-read path (`.select().eq().maybeSingle()`) defaults to a miss so
 * every test exercises the live-fetch path unless a test overrides it.
 */

const INDY_FIXTURE = {
  elements: [
    { type: 'node', id: 153353016, lat: 39.7683331, lon: -86.1583502, tags: { name: 'Indianapolis', place: 'city', population: '882039' } },
    { type: 'node', id: 153379870, lat: 39.4822701, lon: -86.3555484, tags: { name: 'Adams', place: 'village', population: '1344' } },
    { type: 'node', id: 153395278, lat: 39.6128243, lon: -86.37416, tags: { name: 'Mooresville', place: 'town', population: '11347' } },
    { type: 'node', id: 153404714, lat: 39.8997622, lon: -86.1502659, tags: { name: 'Williams Creek', place: 'village', population: '410' } },
    { type: 'node', id: 153406570, lat: 39.8639329, lon: -86.4669429, tags: { name: 'Pittsboro', place: 'village', population: '2386' } },
    { type: 'node', id: 153419717, lat: 39.8311531, lon: -86.1974887, tags: { name: 'Wynnedale', place: 'village', population: '272' } },
    { type: 'node', id: 153424153, lat: 39.4806056, lon: -86.0549863, tags: { name: 'Franklin', place: 'town', population: '22356' } },
    { type: 'node', id: 153450543, lat: 39.7606013, lon: -86.5263879, tags: { name: 'Danville', place: 'village', population: '7827' } },
    { type: 'node', id: 153450803, lat: 39.9322625, lon: -85.8480354, tags: { name: 'Fortville', place: 'town', population: '3691' } },
    { type: 'node', id: 153597367, lat: 39.7881233, lon: -86.2407144, tags: { name: 'Speedway', place: 'town', population: '12416' } },
  ],
}

const INDY_LAT = 39.7684
const INDY_LNG = -86.1581
const RADIUS_MILES = 25

let dbCacheHit: { places: unknown; expires_at: string } | null = null
let upsertCalls: Array<Record<string, unknown>> = []

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: dbCacheHit, error: null }),
        }),
      }),
      upsert: (row: Record<string, unknown>) => {
        upsertCalls.push(row)
        return Promise.resolve({ error: null })
      },
    }),
  },
}))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function rateLimitedHtmlResponse(): Response {
  return new Response(
    '<?xml version="1.0"?><html><body>rate_limited. Please check /api/status</body></html>',
    { status: 200, headers: { 'content-type': 'text/html' } },
  )
}

/** Fresh module instance per test — resets the module-level in-memory cache. */
async function freshNearbyPlacesViaOverpass() {
  vi.resetModules()
  const mod = await import('./nearby-places')
  return mod.nearbyPlacesViaOverpass
}

beforeEach(() => {
  dbCacheHit = null
  upsertCalls = []
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('nearbyPlacesViaOverpass — Indianapolis (non-NY/NJ, static dataset has zero coverage)', () => {
  it('returns real, non-empty places instead of the empty list the static NY/NJ dataset gives', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(INDY_FIXTURE)))
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(places.length).toBeGreaterThan(0)
    const names = places.map((p) => p.name)
    expect(names).toContain('Indianapolis')
    expect(names).toContain('Speedway')
    expect(names).toContain('Mooresville')
  })

  it('sorts by distance ascending and keeps every result within the radius', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(INDY_FIXTURE)))
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(places[0].name).toBe('Indianapolis') // ~0 mi from itself
    for (let i = 1; i < places.length; i++) {
      expect(places[i].distanceMiles).toBeGreaterThanOrEqual(places[i - 1].distanceMiles)
    }
    for (const p of places) {
      expect(p.distanceMiles).toBeLessThanOrEqual(RADIUS_MILES)
    }
  })

  it('gives every place a unique slug even when names collide, and persists to the DB cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(INDY_FIXTURE)))
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    const slugs = places.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(upsertCalls.length).toBe(1)
    expect(upsertCalls[0].cache_key).toBe('39.77,-86.16,25')
    expect(Array.isArray(upsertCalls[0].places)).toBe(true)
  })

  it('falls back to the second Overpass mirror when the first is rate-limited', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitedHtmlResponse())
      .mockResolvedValueOnce(jsonResponse(INDY_FIXTURE))
    vi.stubGlobal('fetch', fetchMock)
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(places.length).toBeGreaterThan(0)
  })

  it('never throws — returns [] when every mirror is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(places).toEqual([])
  })

  it('reads a fresh DB cache hit instead of calling Overpass at all', async () => {
    dbCacheHit = {
      places: [{ slug: 'indianapolis-1', urlSlug: 'indianapolis', name: 'Indianapolis', state: '', lat: INDY_LAT, lng: INDY_LNG, distanceMiles: 0, population: 882039 }],
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(places).toHaveLength(1)
    expect(places[0].name).toBe('Indianapolis')
  })

  it('ignores an expired DB cache row and re-queries Overpass', async () => {
    dbCacheHit = {
      places: [{ slug: 'stale-1', urlSlug: 'stale', name: 'Stale Cached Place', state: '', lat: INDY_LAT, lng: INDY_LNG, distanceMiles: 0, population: null }],
      expires_at: new Date(Date.now() - 60_000).toISOString(), // already expired
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(INDY_FIXTURE)))
    const nearbyPlacesViaOverpass = await freshNearbyPlacesViaOverpass()

    const places = await nearbyPlacesViaOverpass(INDY_LAT, INDY_LNG, RADIUS_MILES)

    expect(places.map((p) => p.name)).not.toContain('Stale Cached Place')
    expect(places.map((p) => p.name)).toContain('Indianapolis')
  })
})
