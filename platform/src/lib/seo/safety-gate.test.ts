import { describe, it, expect } from 'vitest'
import { evaluateSafety } from './safety-gate'

/**
 * Brand-query guard (fix/autopilot-position-tier, 2026-08-01): a page
 * deliberately ranking #1 for the tenant's own brand name (e.g. "nyc maid",
 * "florida maid") must never be touched by an automated system, regardless
 * of ranking tier — that protection didn't exist at all before this.
 */
describe('safety-gate brand-query guard', () => {
  const before = 'NYC Maid Service Queens, NY | The NYC Maid'

  it('rejects when the top query is exactly the tenant brand', () => {
    const res = evaluateSafety({
      field: 'title',
      before,
      after: 'Affordable Queens Cleaning Service | The NYC Maid',
      url: 'https://www.thenycmaid.com/queens-maid-service',
      topQuery: 'nyc maid',
    })
    expect(res.pass).toBe(false)
    expect(res.reasons.some((r) => r.includes('brand query'))).toBe(true)
  })

  it('rejects "the nyc maid" (brand with article) the same way', () => {
    const res = evaluateSafety({
      field: 'title',
      before,
      after: 'Affordable Queens Cleaning Service | The NYC Maid',
      url: 'https://www.thenycmaid.com/queens-maid-service',
      topQuery: 'the nyc maid',
    })
    expect(res.pass).toBe(false)
  })

  it('does NOT reject a real service query that merely mentions the city', () => {
    const res = evaluateSafety({
      field: 'title',
      before,
      after: 'Affordable Queens Maid Service — Same-Day | The NYC Maid',
      url: 'https://www.thenycmaid.com/queens-maid-service',
      topQuery: 'maid service queens near me',
    })
    expect(res.pass).toBe(true)
  })

  it('is a no-op when no topQuery is supplied (backward compatible)', () => {
    const res = evaluateSafety({
      field: 'title',
      before,
      after: 'Affordable Queens Maid Service — Same-Day | The NYC Maid',
      url: 'https://www.thenycmaid.com/queens-maid-service',
    })
    expect(res.pass).toBe(true)
  })
})

/**
 * Competitor-name false-positive fix (2026-08-01): competitorBrands is
 * derived from competitor domains (towing.com -> "towing", roadside.aaa.com
 * -> "roadside") — often generic industry words that legitimately belong in
 * the tenant's own copy (thenyctowingservice.com obviously needs to say
 * "towing"). Real bug found via live simulation: this blocked 2 genuinely
 * good proposals for a towing tenant. Fix: only flag a word the rewrite
 * NEWLY introduces — if the tenant's own existing copy already used it,
 * it's not a competitor callout.
 */
describe('safety-gate competitor-name guard — only newly-introduced words', () => {
  it('does NOT reject a generic industry word already in the tenant\'s own copy', () => {
    const res = evaluateSafety({
      field: 'title',
      before: '24/7 Towing & Roadside in All 5 Boroughs | The NYC Towing Service',
      after: 'Towing & Roadside Help, Sunset Park | The NYC Towing Service',
      url: 'https://www.thenyctowingservice.com/locations/brooklyn/sunset-park',
      competitorBrands: ['towing', 'roadside'],
    })
    expect(res.pass).toBe(true)
  })

  it('still rejects a competitor word genuinely NEW to this page', () => {
    const res = evaluateSafety({
      field: 'title',
      before: 'Towing Service in Sunset Park | The NYC Towing Service',
      after: 'Better Than MerryMaids in Sunset Park | The NYC Towing Service',
      url: 'https://www.thenyctowingservice.com/locations/brooklyn/sunset-park',
      competitorBrands: ['merrymaids'],
    })
    expect(res.pass).toBe(false)
    expect(res.reasons.some((r) => r.includes('names competitor'))).toBe(true)
  })
})
