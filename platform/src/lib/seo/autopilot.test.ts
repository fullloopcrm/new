import { describe, it, expect } from 'vitest'
import { brandLabel } from './autopilot'

/**
 * brandLabel (2026-08-01, found via live simulation): split('.')[0] grabbed
 * the SUBDOMAIN for domains that have one, producing garbage brand tokens
 * ("brooklyn" from brooklyn.news12.com, "m" from m.yelp.com) that then
 * falsely flagged unrelated words as "naming a competitor."
 */
describe('brandLabel', () => {
  it('takes the label before the TLD for simple domains', () => {
    expect(brandLabel('merrymaids.com')).toBe('merrymaids')
    expect(brandLabel('towing.com')).toBe('towing')
  })

  it('takes the actual site, not the subdomain, for domains with one', () => {
    expect(brandLabel('brooklyn.news12.com')).toBe('news12')
    expect(brandLabel('m.yelp.com')).toBe('yelp')
    expect(brandLabel('magazine.northeast.aaa.com')).toBe('aaa')
  })
})
