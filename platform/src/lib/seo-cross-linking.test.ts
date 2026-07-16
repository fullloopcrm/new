import { describe, it, expect } from 'vitest'
import { isEligiblePair, partnersFor, draftAnchorText, type LinkCandidate } from './seo/cross-linking'

// Conservative cross-tenant linking — guards the exact rules Jeff approved:
// no same-trade (competitor) pairs, local-scope tenants only cross state
// boundaries via a shared state, national-scope tenants aren't geo-gated.

const maid: LinkCandidate = { tenant_id: 'maid', slug: 'nycmaid', industry: 'cleaning', scope: 'local', states: ['NY'], domain: 'thenycmaid.com' }
const sunnyside: LinkCandidate = { tenant_id: 'sunny', slug: 'sunnyside-clean-nyc', industry: 'cleaning', scope: 'local', states: ['NY'], domain: 'cleaningservicesunnysideny.com' }
const laundry: LinkCandidate = { tenant_id: 'laundry', slug: 'wash-and-fold-nyc', industry: 'laundry', scope: 'local', states: ['NY'], domain: 'washandfoldnyc.com' }
const floridaMaid: LinkCandidate = { tenant_id: 'flmaid', slug: 'the-florida-maid', industry: 'cleaning', scope: 'local', states: ['FL'], domain: 'thefloridamaid.com' }
const junk: LinkCandidate = { tenant_id: 'junk', slug: 'we-pay-you-junk', industry: 'junk_removal', scope: 'national', states: ['ALL'], domain: 'wepayyoujunkremoval.com' }
const unconfigured: LinkCandidate = { tenant_id: 'unk', slug: 'mystery-co', industry: 'pest', scope: null, states: [], domain: 'mystery.com' }

describe('isEligiblePair', () => {
  it('rejects same-industry pairs as competitors, even in the same state', () => {
    expect(isEligiblePair(maid, sunnyside)).toBe(false)
  })

  it('rejects local tenants in different states', () => {
    expect(isEligiblePair(maid, floridaMaid)).toBe(false)
  })

  it('allows local tenants in the same state with different industries', () => {
    expect(isEligiblePair(maid, laundry)).toBe(true)
  })

  it('allows a national tenant to pair regardless of the other side\'s state', () => {
    expect(isEligiblePair(floridaMaid, junk)).toBe(true)
    expect(isEligiblePair(maid, junk)).toBe(true)
  })

  it('never pairs a tenant with itself', () => {
    expect(isEligiblePair(maid, maid)).toBe(false)
  })

  it('refuses to guess for an unconfigured service_area', () => {
    expect(isEligiblePair(maid, unconfigured)).toBe(false)
  })
})

describe('partnersFor', () => {
  it('ranks a same-state local partner ahead of a national one', () => {
    const pool = [junk, laundry, sunnyside, floridaMaid]
    const ranked = partnersFor(maid, pool)
    expect(ranked[0].slug).toBe('wash-and-fold-nyc')
  })

  it('excludes ineligible partners entirely', () => {
    const pool = [sunnyside, floridaMaid, laundry]
    const ranked = partnersFor(maid, pool)
    expect(ranked.map((r) => r.slug)).not.toContain('sunnyside-clean-nyc')
    expect(ranked.map((r) => r.slug)).not.toContain('the-florida-maid')
  })
})

describe('draftAnchorText', () => {
  it('varies phrasing across seeds instead of repeating the same sentence', () => {
    const a = draftAnchorText('We Pay You Junk', 'junk_removal', 0)
    const b = draftAnchorText('We Pay You Junk', 'junk_removal', 1)
    expect(a).not.toBe(b)
  })

  it('mentions the partner name', () => {
    expect(draftAnchorText('We Pay You Junk', 'junk_removal', 0)).toContain('We Pay You Junk')
  })
})
