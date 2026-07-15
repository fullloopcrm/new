import { describe, it, expect } from 'vitest'
import {
  defaultFunnelMode,
  PROJECT_LEAD_INDUSTRIES,
  pricingShapeFor,
  priceLabel,
  mapIndustry,
  type IndustryKey,
} from './industry-presets'

describe('mapIndustry', () => {
  it('returns "general" for empty, null, undefined, or whitespace', () => {
    expect(mapIndustry('')).toBe('general')
    expect(mapIndustry(null)).toBe('general')
    expect(mapIndustry(undefined)).toBe('general')
    expect(mapIndustry('   ')).toBe('general')
  })

  it('returns "general" for an unrecognized trade', () => {
    expect(mapIndustry('unicorn wrangling')).toBe('general')
  })

  it('is case-insensitive', () => {
    expect(mapIndustry('HOUSE CLEANING')).toBe('cleaning')
    expect(mapIndustry('HVAC Repair')).toBe('hvac')
  })

  it('maps core home-service verticals', () => {
    expect(mapIndustry('house cleaning')).toBe('cleaning')
    expect(mapIndustry('plumbing services')).toBe('plumbing')
    expect(mapIndustry('electrician / ev charger')).toBe('electrical')
    expect(mapIndustry('roofing contractor')).toBe('roofing')
    expect(mapIndustry('lawn care & mowing')).toBe('lawn_care')
  })

  it('honors precedence: restoration wins over plumbing for "water damage"', () => {
    // "water damage" must resolve to restoration, not plumbing's broad "water" match
    expect(mapIndustry('water damage restoration')).toBe('restoration')
    // but a water heater is genuinely plumbing
    expect(mapIndustry('water heater repair')).toBe('plumbing')
  })

  it('honors precedence: specific cleaning trades win over generic "cleaning"', () => {
    expect(mapIndustry('window cleaning')).toBe('window_cleaning')
    expect(mapIndustry('carpet cleaning')).toBe('carpet_cleaning')
    expect(mapIndustry('post-construction cleaning')).toBe('post_construction')
  })

  it('honors precedence: pet trades resolve before hauling', () => {
    expect(mapIndustry('dog grooming')).toBe('pet_grooming')
    expect(mapIndustry('dog waste removal')).toBe('pet_waste')
    expect(mapIndustry('junk removal')).toBe('junk_removal')
  })
})

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
