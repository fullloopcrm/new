import { describe, it, expect } from 'vitest'
import {
  defaultFunnelMode,
  PROJECT_LEAD_INDUSTRIES,
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
