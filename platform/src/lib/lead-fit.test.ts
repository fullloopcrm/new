import { describe, it, expect } from 'vitest'
import { computeFit, fitBucket, optLabel, QUALIFY_OPTIONS } from './lead-fit'

/**
 * Deterministic lead FIT scoring. Every weight in computeFit is pinned by a
 * summed-score assertion, and the bucket thresholds (60 / 35 / 10) plus the
 * price-shopper override are each exercised, so a change to any weight,
 * threshold, or the shopper flag makes a test fail.
 */
describe('computeFit', () => {
  it('sums all positive weights into a hot bucket', () => {
    const r = computeFit({
      automation_comfort: 'excited', // 30
      growth_goal: 'scale_2x', // 25
      revenue_trajectory: 'up', // 15
      timeline: 'asap', // 15
      current_system: 'nothing', // 0
      lead_gen_spend: '5k_plus', // 15
      wants_automation: true, // 10
      wants_growth: true, // 10
      comparing_prices: false,
    })
    expect(r.score).toBe(120)
    expect(r.bucket).toBe('hot')
  })

  it('lands in the good band (35-59) without shopper flags', () => {
    const r = computeFit({
      automation_comfort: 'open', // 15
      growth_goal: 'steady', // 15
      timeline: '30', // 10
    })
    expect(r.score).toBe(40)
    expect(r.bucket).toBe('good')
  })

  it('lands in the watch band (10-34)', () => {
    const r = computeFit({ automation_comfort: 'open' }) // 15
    expect(r.score).toBe(15)
    expect(r.bucket).toBe('watch')
  })

  it('scores an empty answer set at 0 and buckets it as shopper', () => {
    const r = computeFit({})
    expect(r.score).toBe(0)
    expect(r.bucket).toBe('shopper')
  })

  it('applies the negative skeptical / decline weights', () => {
    const r = computeFit({
      automation_comfort: 'skeptical', // -20
      growth_goal: 'none', // -20
      revenue_trajectory: 'down', // -10
    })
    expect(r.score).toBe(-50)
    expect(r.bucket).toBe('shopper')
  })

  it('forces shopper when comparing_prices is set, regardless of score', () => {
    const r = computeFit({
      automation_comfort: 'excited', // 30
      comparing_prices: true, // -20 and shopper flag
    })
    expect(r.score).toBe(10)
    expect(r.bucket).toBe('shopper') // flag overrides the would-be 'watch'
  })

  it('forces shopper when current_system is actively shopping', () => {
    const r = computeFit({
      automation_comfort: 'excited', // 30
      growth_goal: 'scale_2x', // 25
      revenue_trajectory: 'up', // 15
      current_system: 'shopping', // -15 and shopper flag
    })
    expect(r.score).toBe(55) // high score...
    expect(r.bucket).toBe('shopper') // ...but shopping flag wins
  })
})

describe('fitBucket', () => {
  it('passes through the four valid buckets', () => {
    expect(fitBucket('hot')).toBe('hot')
    expect(fitBucket('good')).toBe('good')
    expect(fitBucket('watch')).toBe('watch')
    expect(fitBucket('shopper')).toBe('shopper')
  })

  it('defaults anything invalid to watch', () => {
    expect(fitBucket('nonsense')).toBe('watch')
    expect(fitBucket(null)).toBe('watch')
    expect(fitBucket(undefined)).toBe('watch')
  })
})

describe('optLabel', () => {
  it('maps a known value to its label', () => {
    expect(optLabel(QUALIFY_OPTIONS.timeline, 'asap')).toBe('ASAP')
    expect(optLabel(QUALIFY_OPTIONS.current_system, 'shopping')).toBe('Shopping several CRMs right now')
  })

  it('returns an em-dash for null/empty', () => {
    expect(optLabel(QUALIFY_OPTIONS.timeline, null)).toBe('—')
    expect(optLabel(QUALIFY_OPTIONS.timeline, undefined)).toBe('—')
  })

  it('falls back to the raw value when unknown', () => {
    expect(optLabel(QUALIFY_OPTIONS.timeline, 'someday')).toBe('someday')
  })
})
