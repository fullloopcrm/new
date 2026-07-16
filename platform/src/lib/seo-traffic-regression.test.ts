import { describe, it, expect } from 'vitest'
import { isTrafficRegression } from './seo/verify-revert'

// verify-revert's second revert signal: total page clicks vs. baseline,
// independent of the single tracked query used by the position check. Guards
// against the exact gap that motivated it — a page whose tracked query goes
// quiet defaulting to "no data, keep forever" even if real traffic collapsed.

describe('isTrafficRegression', () => {
  it('reverts when current clicks drop to half or less of a meaningful baseline', () => {
    expect(isTrafficRegression(20, 10)).toBe(true)
    expect(isTrafficRegression(20, 5)).toBe(true)
  })

  it('keeps when current clicks are above the drop threshold', () => {
    expect(isTrafficRegression(20, 11)).toBe(false)
    expect(isTrafficRegression(20, 20)).toBe(false)
    expect(isTrafficRegression(20, 30)).toBe(false)
  })

  it('ignores pages below the minimum baseline volume — too small to mean anything', () => {
    expect(isTrafficRegression(4, 0)).toBe(false)
    expect(isTrafficRegression(1, 0)).toBe(false)
  })

  it('never fires without a baseline to compare against', () => {
    expect(isTrafficRegression(null, 0)).toBe(false)
    expect(isTrafficRegression(null, 100)).toBe(false)
  })
})
