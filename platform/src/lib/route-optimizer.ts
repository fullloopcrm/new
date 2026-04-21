/**
 * Route optimization — nearest-neighbor + 2-opt swap.
 *
 * MVP: no external routing API. Uses haversine distance between lat/lng points.
 * Good enough for 5-20 stops. For tight time windows or heavy traffic modeling,
 * we'll wire Google Directions API later (optimize:true waypoint ordering).
 */

export interface RouteStop {
  booking_id: string
  client_id?: string | null
  client_name?: string | null
  address: string
  lat: number
  lng: number
  order?: number
  arrival_window_start?: string | null
  arrival_window_end?: string | null
  duration_minutes?: number
  notes?: string | null
  eta_seconds_from_start?: number
  distance_meters_from_prev?: number
}

export interface RoutePoint {
  lat: number
  lng: number
}

// Haversine distance in meters.
export function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000 // Earth radius (m)
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function toRad(deg: number): number { return (deg * Math.PI) / 180 }

// Rough drive-time estimate: assume 35 km/h average for local trade routes
// (accounts for stops, lights, urban traffic). Good for MVP.
const AVG_DRIVE_SPEED_MPS = (35 * 1000) / 3600

export function estimateDurationSec(distanceMeters: number): number {
  return Math.round(distanceMeters / AVG_DRIVE_SPEED_MPS)
}

export interface OptimizeInput {
  start: RoutePoint
  end?: RoutePoint | null
  stops: RouteStop[]
}

export interface OptimizeResult {
  orderedStops: RouteStop[]
  totalDistanceMeters: number
  totalDurationSeconds: number
}

/**
 * Nearest-neighbor + 2-opt improvement. Returns stops in visit order with
 * per-stop distance_meters_from_prev and eta_seconds_from_start populated.
 */
export function optimizeRoute(input: OptimizeInput): OptimizeResult {
  const stops = input.stops.filter(s =>
    typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng),
  )
  if (stops.length === 0) {
    return { orderedStops: [], totalDistanceMeters: 0, totalDurationSeconds: 0 }
  }

  // ── Nearest-neighbor seed ──
  const remaining = stops.slice()
  const ordered: RouteStop[] = []
  let cursor: RoutePoint = input.start

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(cursor, { lat: remaining[i].lat, lng: remaining[i].lng })
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const next = remaining.splice(bestIdx, 1)[0]
    ordered.push(next)
    cursor = { lat: next.lat, lng: next.lng }
  }

  // ── 2-opt swap until no improvement ──
  twoOptImprove(ordered, input.start, input.end || null)

  // Populate per-stop distance from prev + cumulative ETA
  let totalDistance = 0
  let runningTimeSec = 0
  let prev: RoutePoint = input.start
  const serviceMinutesDefault = 60
  const rendered: RouteStop[] = ordered.map((s, i) => {
    const segDist = haversineMeters(prev, { lat: s.lat, lng: s.lng })
    const segDriveSec = estimateDurationSec(segDist)
    runningTimeSec += segDriveSec
    totalDistance += segDist
    const stop: RouteStop = {
      ...s,
      order: i + 1,
      distance_meters_from_prev: Math.round(segDist),
      eta_seconds_from_start: runningTimeSec,
    }
    const serviceMin = s.duration_minutes || serviceMinutesDefault
    runningTimeSec += serviceMin * 60
    prev = { lat: s.lat, lng: s.lng }
    return stop
  })

  // Optional return leg
  if (input.end) {
    const returnDist = haversineMeters(prev, input.end)
    totalDistance += returnDist
    runningTimeSec += estimateDurationSec(returnDist)
  }

  return {
    orderedStops: rendered,
    totalDistanceMeters: Math.round(totalDistance),
    totalDurationSeconds: runningTimeSec,
  }
}

function routeDistance(order: RouteStop[], start: RoutePoint, end: RoutePoint | null): number {
  let total = 0
  let prev: RoutePoint = start
  for (const s of order) {
    total += haversineMeters(prev, { lat: s.lat, lng: s.lng })
    prev = { lat: s.lat, lng: s.lng }
  }
  if (end) total += haversineMeters(prev, end)
  return total
}

function twoOptImprove(order: RouteStop[], start: RoutePoint, end: RoutePoint | null): void {
  const n = order.length
  if (n < 3) return
  let improved = true
  let iterations = 0
  const maxIter = 100
  while (improved && iterations < maxIter) {
    improved = false
    iterations++
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const currentDist = routeDistance(order, start, end)
        const swapped = twoOptSwap(order, i, k)
        const newDist = routeDistance(swapped, start, end)
        if (newDist < currentDist - 1) {
          for (let j = 0; j < n; j++) order[j] = swapped[j]
          improved = true
        }
      }
    }
  }
}

function twoOptSwap(order: RouteStop[], i: number, k: number): RouteStop[] {
  const result = order.slice(0, i)
  for (let j = k; j >= i; j--) result.push(order[j])
  for (let j = k + 1; j < order.length; j++) result.push(order[j])
  return result
}

/** Deep link to Google Maps directions for a list of stops. */
export function googleMapsDirectionsUrl(
  start: RoutePoint,
  stops: { lat: number; lng: number }[],
  end?: RoutePoint | null,
): string {
  const origin = `${start.lat},${start.lng}`
  const destination = end ? `${end.lat},${end.lng}` : stops.length ? `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}` : origin
  const waypoints = (end ? stops : stops.slice(0, -1))
    .map(s => `${s.lat},${s.lng}`)
    .join('|')
  const u = new URL('https://www.google.com/maps/dir/')
  u.searchParams.set('api', '1')
  u.searchParams.set('origin', origin)
  u.searchParams.set('destination', destination)
  if (waypoints) u.searchParams.set('waypoints', waypoints)
  u.searchParams.set('travelmode', 'driving')
  return u.toString()
}

export function formatDistanceMiles(meters: number): string {
  const miles = meters / 1609.344
  return `${miles.toFixed(1)} mi`
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
