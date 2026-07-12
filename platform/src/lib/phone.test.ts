import { describe, it, expect } from 'vitest'
import { formatPhone, stripPhone } from './phone'

/**
 * Progressive phone formatting as the user types. These assertions pin the
 * exact grouping at each digit-count boundary, so they fail if the slice
 * indices, the 10-digit cap, or the paren/dash template are altered.
 */
describe('formatPhone', () => {
  it('returns empty string for no digits', () => {
    expect(formatPhone('')).toBe('')
    expect(formatPhone('abc')).toBe('')
  })

  it('wraps 1-3 digits in an open paren only', () => {
    expect(formatPhone('5')).toBe('(5')
    expect(formatPhone('55')).toBe('(55')
    expect(formatPhone('555')).toBe('(555')
  })

  it('adds close-paren + space for 4-6 digits', () => {
    expect(formatPhone('5551')).toBe('(555) 1')
    expect(formatPhone('555123')).toBe('(555) 123')
  })

  it('adds the dash group for 7-10 digits', () => {
    expect(formatPhone('5551234')).toBe('(555) 123-4')
    expect(formatPhone('5551234567')).toBe('(555) 123-4567')
  })

  it('caps at 10 digits (drops the leading 1 overflow)', () => {
    // 11 digits -> sliced to first 10 -> '1555123456'
    expect(formatPhone('15551234567')).toBe('(155) 512-3456')
  })

  it('ignores non-digit characters in the input', () => {
    expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567')
    expect(formatPhone('555.123.4567 ext 9')).toBe('(555) 123-4567')
  })
})

describe('stripPhone', () => {
  it('reduces a formatted number to digits only', () => {
    expect(stripPhone('(555) 123-4567')).toBe('5551234567')
  })

  it('returns empty string when there are no digits', () => {
    expect(stripPhone('abc-def')).toBe('')
  })

  it('keeps every digit, including overflow beyond 10', () => {
    expect(stripPhone('+1 (555) 123-4567')).toBe('15551234567')
  })
})
