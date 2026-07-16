import { describe, it, expect } from 'vitest'
import { classifyVolatility, type PropertyDelta } from './seo/volatility'

// Fleet-wide rollout detection: the signal is CORRELATED movement across many
// independently-owned-content properties on the same day, not any single
// page's normal day-to-day noise (that's what verify-revert's own threshold
// already covers).

const delta = (property: string, d: number): PropertyDelta => ({
  property,
  domain: property,
  recentPosition: 10 + d,
  baselinePosition: 10,
  delta: d,
})

describe('classifyVolatility', () => {
  it('does not fire when only one property moves out of many', () => {
    const deltas = [delta('a', 5), delta('b', 0.2), delta('c', -0.1), delta('d', 0.3), delta('e', 0.1)]
    const verdict = classifyVolatility(deltas)
    expect(verdict.detected).toBe(false)
  })

  it('fires when a correlated fraction of the fleet worsens together', () => {
    const deltas = [delta('a', 3), delta('b', 4), delta('c', 2.5), delta('d', 0.2), delta('e', 0.1)]
    const verdict = classifyVolatility(deltas)
    expect(verdict.detected).toBe(true)
    expect(verdict.directionality).toBe('worsened')
  })

  it('does not fire on a small fleet even if the fraction is high, below the absolute floor', () => {
    const deltas = [delta('a', 5), delta('b', 0.1)]
    const verdict = classifyVolatility(deltas)
    expect(verdict.detected).toBe(false)
  })

  it('labels mixed direction when the fleet splits between better and worse', () => {
    const deltas = [delta('a', 3), delta('b', -3), delta('c', 2.5), delta('d', 0.1), delta('e', 0.1)]
    const verdict = classifyVolatility(deltas)
    expect(verdict.detected).toBe(true)
    expect(verdict.directionality).toBe('mixed')
  })

  it('reports null directionality when nothing moved', () => {
    const deltas = [delta('a', 0.1), delta('b', 0.2)]
    const verdict = classifyVolatility(deltas)
    expect(verdict.directionality).toBeNull()
  })
})
