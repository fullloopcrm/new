import { describe, it, expect } from 'vitest'
import { baselinePosition, baselineQuery } from './verify-revert'

/**
 * baselinePosition (2026-08-19, found via live seo_changes audit): using
 * best_position — the page's best-EVER rank, often from a different query or
 * months back — as the revert baseline instead of the actual pre-change
 * position silently reverted real improvements. Three confirmed live cases:
 * a page at 14.9 that moved to 10.9 was reverted because best_position was 6;
 * a page at 19.7 that moved to 14.7 was reverted because best_position was 10.
 */
describe('baselinePosition', () => {
  it('uses the real pre-change position, not the all-time best_position', () => {
    expect(baselinePosition({ position: 14.9, best_position: 6 })).toBe(14.9)
    expect(baselinePosition({ position: 19.7, best_position: 10 })).toBe(19.7)
  })

  it('falls back to null when position is missing, even if best_position exists', () => {
    expect(baselinePosition({ best_position: 6 })).toBeNull()
  })

  it('falls back to our_position for the competitor-gap recipe shape', () => {
    expect(baselinePosition({ our_position: 4 })).toBe(4)
  })

  it('prefers position over our_position when both are present', () => {
    expect(baselinePosition({ position: 14.9, our_position: 4 })).toBe(14.9)
  })

  it('returns null for empty/missing metric', () => {
    expect(baselinePosition(null)).toBeNull()
    expect(baselinePosition({})).toBeNull()
  })
})

describe('baselineQuery', () => {
  it('prefers query over top_query', () => {
    expect(baselineQuery({ query: 'bushwick exterminator', top_query: 'exterminator nyc' })).toBe(
      'bushwick exterminator',
    )
  })

  it('falls back to top_query when query is absent', () => {
    expect(baselineQuery({ top_query: 'exterminator nyc' })).toBe('exterminator nyc')
  })

  it('returns null for empty/missing metric', () => {
    expect(baselineQuery(null)).toBeNull()
    expect(baselineQuery({})).toBeNull()
  })
})
