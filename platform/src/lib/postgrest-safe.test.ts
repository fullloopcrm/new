import { describe, it, expect } from 'vitest'
import { sanitizePostgrestValue, escapeLikeValue } from './postgrest-safe'

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

describe('escapeLikeValue', () => {
  it('escapes % so an exact-match ilike() cannot become a match-everything wildcard', () => {
    expect(escapeLikeValue('%')).toBe('\\%')
    expect(escapeLikeValue('%@gmail.com')).toBe('\\%@gmail.com')
  })

  it('escapes _ (single-char wildcard) too', () => {
    expect(escapeLikeValue('a_b')).toBe('a\\_b')
  })

  it('escapes a literal backslash so it cannot be used to un-escape a later char', () => {
    expect(escapeLikeValue('a\\%b')).toBe('a\\\\\\%b')
  })

  it('leaves an ordinary email untouched in content (only escape chars are inserted)', () => {
    expect(escapeLikeValue('john.doe@example.com')).toBe('john.doe@example.com')
  })

  it('returns empty string for null/undefined', () => {
    expect(escapeLikeValue(null)).toBe('')
    expect(escapeLikeValue(undefined)).toBe('')
  })
})
