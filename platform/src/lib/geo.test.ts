import { describe, it, expect } from 'vitest'
import { haversineDistance, calculateDistance, estimateTransitMinutes } from './geo'

/**
 * Haversine distance in MILES (Earth radius 3959 mi) plus the straight-line
 * transit estimate. Values are pinned against the closed-form great-circle
 * arc so they fail if the radius constant, the cos(lat) terms, or the
 * transit slope/floor are changed.
 */
describe('haversineDistance', () => {
  it('is zero for identical coordinates', () => {
    expect(haversineDistance(40.7, -74, 40.7, -74)).toBe(0)
  })

  it('is ~69.10 mi for one degree of longitude at the equator', () => {
    // great-circle arc = 3959 * (PI/180) = 69.0976 mi
    expect(haversineDistance(0, 0, 0, 1)).toBeCloseTo(69.098, 2)
  })

  it('is ~69.10 mi for one degree of latitude', () => {
    expect(haversineDistance(0, 0, 1, 0)).toBeCloseTo(69.098, 2)
  })

  it('shrinks a longitude-degree by cos(lat) at latitude 40', () => {
    // 69.0976 * cos(40deg) = 52.93 mi — exercises the cos(lat) factor
    expect(haversineDistance(40, -74, 40, -73)).toBeCloseTo(52.93, 2)
  })

  it('exposes calculateDistance as the same function', () => {
    expect(calculateDistance).toBe(haversineDistance)
    expect(calculateDistance(0, 0, 0, 1)).toBeCloseTo(69.098, 2)
  })
})

describe('estimateTransitMinutes', () => {
  it('floors at 5 minutes under 0.3 miles', () => {
    expect(estimateTransitMinutes(0)).toBe(5)
    expect(estimateTransitMinutes(0.29)).toBe(5)
  })

  it('uses 10 + 5*miles, rounded, at/above 0.3 miles', () => {
    expect(estimateTransitMinutes(0.3)).toBe(12) // round(11.5) = 12
    expect(estimateTransitMinutes(2)).toBe(20)
    expect(estimateTransitMinutes(10)).toBe(60)
  })
})
