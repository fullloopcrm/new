import { describe, it, expect } from 'vitest'
import { mapIndustry } from './industry-presets'

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
