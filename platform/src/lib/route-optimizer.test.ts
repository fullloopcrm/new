import { describe, it, expect } from 'vitest'
import {
  haversineMeters,
  estimateDurationSec,
  optimizeRoute,
  googleMapsDirectionsUrl,
  formatDistanceMiles,
  formatDuration,
  type RouteStop,
} from './route-optimizer'

/**
 * Route optimizer pure helpers. Distances are pinned against the closed-form
 * great-circle arc (R = 6,371,000 m), drive-time against the 35 km/h constant,
 * and optimizeRoute is checked for nearest-neighbor reordering + populated
 * per-stop ETA/distance. Each fails if the corresponding constant or formula
 * is reverted.
 */
describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters({ lat: 40.7, lng: -74 }, { lat: 40.7, lng: -74 })).toBe(0)
  })

  it('is ~111,195 m for one degree of longitude at the equator', () => {
    // arc = 6_371_000 * (PI/180) = 111,194.93 m
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111194.93, 1)
  })

  it('shrinks by cos(lat) at latitude 40 (exercises cos terms)', () => {
    // ~85,180 m for one longitude-degree at lat 40 (vs 111,195 at the equator)
    expect(haversineMeters({ lat: 40, lng: -74 }, { lat: 40, lng: -73 })).toBeCloseTo(85179.8, 1)
  })
})

describe('estimateDurationSec', () => {
  it('is zero for zero distance', () => {
    expect(estimateDurationSec(0)).toBe(0)
  })

  it('turns 35 km into exactly one hour at 35 km/h', () => {
    expect(estimateDurationSec(35000)).toBe(3600)
  })

  it('rounds 1000 m to 103 s', () => {
    // 1000 / (35000/3600) = 102.857 -> 103
    expect(estimateDurationSec(1000)).toBe(103)
  })
})

describe('formatDistanceMiles', () => {
  it('converts meters to miles at one decimal', () => {
    expect(formatDistanceMiles(1609.344)).toBe('1.0 mi')
    expect(formatDistanceMiles(16093.44)).toBe('10.0 mi')
    expect(formatDistanceMiles(804.672)).toBe('0.5 mi')
    expect(formatDistanceMiles(0)).toBe('0.0 mi')
  })
})

describe('formatDuration', () => {
  it('renders minutes-only under an hour', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(90)).toBe('2m') // round(1.5) = 2
  })

  it('renders hours + minutes at/above an hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
    expect(formatDuration(5400)).toBe('1h 30m')
    expect(formatDuration(7200)).toBe('2h 0m')
  })
})

describe('googleMapsDirectionsUrl', () => {
  it('uses the last stop as destination when no end is given', () => {
    const url = new URL(
      googleMapsDirectionsUrl({ lat: 40.7, lng: -74 }, [{ lat: 40.8, lng: -73.9 }]),
    )
    expect(url.searchParams.get('origin')).toBe('40.7,-74')
    expect(url.searchParams.get('destination')).toBe('40.8,-73.9')
    expect(url.searchParams.get('waypoints')).toBeNull() // single stop is the destination
    expect(url.searchParams.get('travelmode')).toBe('driving')
  })

  it('routes through all stops as waypoints when an explicit end is given', () => {
    const url = new URL(
      googleMapsDirectionsUrl(
        { lat: 40.7, lng: -74 },
        [{ lat: 40.8, lng: -73.9 }, { lat: 40.9, lng: -73.8 }],
        { lat: 41, lng: -75 },
      ),
    )
    expect(url.searchParams.get('origin')).toBe('40.7,-74')
    expect(url.searchParams.get('destination')).toBe('41,-75')
    expect(url.searchParams.get('waypoints')).toBe('40.8,-73.9|40.9,-73.8')
  })
})

describe('optimizeRoute', () => {
  it('returns zeros for no stops', () => {
    const r = optimizeRoute({ start: { lat: 0, lng: 0 }, stops: [] })
    expect(r).toEqual({ orderedStops: [], totalDistanceMeters: 0, totalDurationSeconds: 0 })
  })

  it('populates order, per-stop distance, ETA and totals for a single stop', () => {
    const stops: RouteStop[] = [
      { booking_id: 'b1', address: '1 deg east', lat: 0, lng: 1 },
    ]
    const r = optimizeRoute({ start: { lat: 0, lng: 0 }, stops })
    expect(r.orderedStops).toHaveLength(1)
    const s = r.orderedStops[0]
    expect(s.order).toBe(1)
    expect(s.distance_meters_from_prev).toBe(111195) // round(111194.93)
    expect(s.eta_seconds_from_start).toBe(11437) // round(111194.93 / (35000/3600))
    expect(r.totalDistanceMeters).toBe(111195)
    // drive 11437 + default 60 min service (3600) = 15037
    expect(r.totalDurationSeconds).toBe(15037)
  })

  it('reorders via nearest-neighbor (near stop visited before far stop)', () => {
    const stops: RouteStop[] = [
      { booking_id: 'far', address: 'far', lat: 0, lng: 1 }, // ~111 km
      { booking_id: 'near', address: 'near', lat: 0, lng: 0.001 }, // ~111 m
    ]
    const r = optimizeRoute({ start: { lat: 0, lng: 0 }, stops })
    expect(r.orderedStops.map(s => s.booking_id)).toEqual(['near', 'far'])
  })
})
