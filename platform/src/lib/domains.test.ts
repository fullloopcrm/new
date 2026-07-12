import { describe, it, expect } from 'vitest'
import { extractZip } from './domains'

// extractZip is the one pure function in domains.ts (the rest hit supabaseAdmin).
// It feeds tenant_domains zip -> neighborhood routing, so its parsing behavior is
// load-bearing for lead attribution. These lock in the ACTUAL behavior so a
// refactor of the regexes can't silently change what a given address resolves to.
describe('extractZip', () => {
  it('extracts a 5-digit zip at the end of an address', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201')).toBe('11201')
  })

  it('returns the 5-digit base when the address ends in ZIP+4', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201-1234')).toBe('11201')
  })

  it('tolerates trailing whitespace after the zip', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201   ')).toBe('11201')
  })

  it('prefers the trailing zip over an earlier 5-digit house number', () => {
    // House number 12345 appears first, but the real zip 10001 is at the end.
    expect(extractZip('12345 Broadway, New York, NY 10001')).toBe('10001')
  })

  it('falls back to a 5-digit run anywhere when none is at the end', () => {
    expect(extractZip('11201 Somewhere Rd, Apt 4B')).toBe('11201')
  })

  it('returns null when there is no zip', () => {
    expect(extractZip('123 Main St, Brooklyn, NY')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractZip('')).toBeNull()
  })

  it('does not treat a 4-digit number as a zip', () => {
    expect(extractZip('Suite 1200, Some Building')).toBeNull()
  })

  it('does not extract 5 digits out of a longer contiguous digit run (e.g. a phone number)', () => {
    // \b(\d{5})\b cannot match inside "5551234567" — no word boundary between digits.
    expect(extractZip('Call us at 5551234567')).toBeNull()
  })

  it('KNOWN LIMITATION: a bare 5-digit house number with no real zip is read as the zip', () => {
    // Documents current fallback behavior — the second regex has no way to tell a
    // standalone house number from a zip. Asserting it so a future fix is a
    // deliberate, visible change, not an accident.
    expect(extractZip('12345 Broadway')).toBe('12345')
  })
})
