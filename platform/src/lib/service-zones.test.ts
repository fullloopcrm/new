import { describe, it, expect } from 'vitest'
import { guessZoneFromAddress } from './service-zones'

describe('guessZoneFromAddress — Brooklyn/Queens ZIP collision', () => {
  it('routes a Brooklyn ZIP-only address to brooklyn (not queens)', () => {
    // 112xx is Brooklyn. Before the fix, Queens (11[1-4]xx, checked first) stole it.
    expect(guessZoneFromAddress('123 Court St, 11201')).toBe('brooklyn')
    expect(guessZoneFromAddress('55 Bedford Ave, 11211')).toBe('brooklyn')
    expect(guessZoneFromAddress('900 Ocean Ave, 11226')).toBe('brooklyn')
  })

  it('still routes Queens ZIPs to queens', () => {
    expect(guessZoneFromAddress('47-01 Vernon Blvd, 11101')).toBe('queens') // LIC
    expect(guessZoneFromAddress('108-22 Queens Blvd, 11375')).toBe('queens') // Forest Hills
    expect(guessZoneFromAddress('90-15 Roosevelt Ave, 11372')).toBe('queens') // Jackson Heights
  })

  it('keyword addresses still resolve correctly', () => {
    expect(guessZoneFromAddress('Williamsburg, Brooklyn')).toBe('brooklyn')
    expect(guessZoneFromAddress('Astoria, Queens')).toBe('queens')
  })
})
