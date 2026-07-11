import { describe, it, expect } from 'vitest'
import {
  defaultFunnelMode,
  PROJECT_LEAD_INDUSTRIES,
  pricingShapeFor,
  priceLabel,
  mapIndustry,
  type IndustryKey,
} from './industry-presets'

// F1 — the 23 project/lead verticals must NOT default to the booking funnel
// (which hourly-quotes + slot-books multi-week projects). They quote-first.
describe('defaultFunnelMode — project/lead archetype (F1)', () => {
  const projectVerticals: IndustryKey[] = [
    'landscaping', 'remodeling', 'roofing', 'siding', 'painting', 'flooring',
    'concrete', 'deck', 'fencing', 'demolition', 'drywall', 'epoxy',
    'foundation', 'insulation', 'moving', 'paving', 'windows_doors', 'stucco',
    'solar', 'smart_home', 'accessibility', 'restoration', 'interior_design',
  ]

  it('classifies all 23 project/lead verticals as quote-first (pipeline)', () => {
    expect(PROJECT_LEAD_INDUSTRIES.size).toBe(23)
    for (const v of projectVerticals) {
      expect(defaultFunnelMode(v)).toBe('pipeline')
    }
  })

  it('leaves short/booking trades on the booking funnel', () => {
    const bookingTrades: IndustryKey[] = [
      'cleaning', 'plumbing', 'hvac', 'electrical', 'handyman', 'pest',
      'dumpster', 'junk_removal', 'laundry', 'fitness', 'mobile_salon', 'general',
    ]
    for (const t of bookingTrades) {
      expect(defaultFunnelMode(t)).toBe('booking')
    }
  })

  it('a real project trade routed through mapIndustry quote-firsts end-to-end', () => {
    // "roof replacement" free-text → roofing → pipeline (not booking).
    expect(defaultFunnelMode(mapIndustry('roof replacement'))).toBe('pipeline')
    expect(defaultFunnelMode(mapIndustry('kitchen remodel'))).toBe('pipeline')
    // A cleaning tenant stays on booking.
    expect(defaultFunnelMode(mapIndustry('house cleaning'))).toBe('booking')
  })
})

// F3 — flat/per-unit trades must be priced flat, not $/hr, so quote/checkout/
// invoice math bills the fixed price instead of elapsed-hours × rate.
describe('pricingShapeFor — flat/per-unit trades (F3)', () => {
  it('models the seven flat/per-unit trades as flat with a real unit', () => {
    expect(pricingShapeFor('dumpster')).toEqual({ pricing_model: 'flat', per_unit: 'job' })
    expect(pricingShapeFor('junk_removal')).toEqual({ pricing_model: 'flat', per_unit: 'job' })
    expect(pricingShapeFor('laundry')).toEqual({ pricing_model: 'flat', per_unit: 'job' })
    expect(pricingShapeFor('bin_cleaning')).toEqual({ pricing_model: 'flat', per_unit: 'visit' })
    expect(pricingShapeFor('pet_waste')).toEqual({ pricing_model: 'flat', per_unit: 'visit' })
    expect(pricingShapeFor('snow_removal')).toEqual({ pricing_model: 'flat', per_unit: 'visit' })
    expect(pricingShapeFor('fitness')).toEqual({ pricing_model: 'flat', per_unit: 'visit' })
  })

  it('leaves genuinely hourly trades hourly', () => {
    for (const t of ['cleaning', 'plumbing', 'handyman', 'hvac', 'general'] as IndustryKey[]) {
      expect(pricingShapeFor(t)).toEqual({ pricing_model: 'hourly', per_unit: 'hour' })
    }
  })

  it('priceLabel reads by the trade unit', () => {
    expect(priceLabel(59, pricingShapeFor('cleaning'))).toBe('$59/hr')
    expect(priceLabel(350, pricingShapeFor('dumpster'))).toBe('$350 flat')
    expect(priceLabel(20, pricingShapeFor('pet_waste'))).toBe('$20/visit')
  })
})
