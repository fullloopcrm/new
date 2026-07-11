import { describe, it, expect } from 'vitest'
import { sanitizePostgrestValue } from './postgrest-safe'

describe('sanitizePostgrestValue', () => {
  it('strips a comma-based filter-injection payload', () => {
    // Attacker tries to OR-in an extra condition via the search box.
    const payload = 'x%,notes.ilike.%secret%'
    const out = sanitizePostgrestValue(payload)
    expect(out).not.toContain(',')
    expect(out).toBe('x% notes.ilike.%secret%')
  })

  it('strips parentheses used to open/close logic trees', () => {
    const out = sanitizePostgrestValue('a,or(id.eq.1)')
    expect(out).not.toMatch(/[(),]/)
  })

  it('strips double-quotes and backslashes', () => {
    expect(sanitizePostgrestValue('a"b\\c')).toBe('a b c')
  })

  it('preserves legitimate email search terms (dots kept)', () => {
    expect(sanitizePostgrestValue('john.doe@example.com')).toBe('john.doe@example.com')
  })

  it('preserves names, phones and existing % wildcards', () => {
    expect(sanitizePostgrestValue('Jane Doe')).toBe('Jane Doe')
    expect(sanitizePostgrestValue('+1-212-555-0000')).toBe('+1-212-555-0000')
    expect(sanitizePostgrestValue('%partial%')).toBe('%partial%')
  })

  it('collapses whitespace left behind by stripped characters', () => {
    expect(sanitizePostgrestValue('a , b')).toBe('a b')
  })

  it('returns empty string for null/undefined', () => {
    expect(sanitizePostgrestValue(null)).toBe('')
    expect(sanitizePostgrestValue(undefined)).toBe('')
  })
})
