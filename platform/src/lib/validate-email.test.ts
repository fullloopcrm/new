import { describe, it, expect } from 'vitest'
import { validateEmail } from './validate-email'

describe('validateEmail', () => {
  it('requires a non-empty email', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' })
  })

  it('rejects a string with no @', () => {
    expect(validateEmail('joeexample.com')).toEqual({ valid: false, error: 'Please enter a valid email' })
  })

  it('rejects an empty local or domain part', () => {
    expect(validateEmail('@example.com')).toEqual({ valid: false, error: 'Please enter a valid email' })
    expect(validateEmail('joe@')).toEqual({ valid: false, error: 'Please enter a valid email' })
  })

  it('rejects a domain with no dot', () => {
    expect(validateEmail('joe@localhost')).toEqual({ valid: false, error: 'Please enter a valid email' })
  })

  it('accepts a well-formed address', () => {
    expect(validateEmail('joe@example.com')).toEqual({ valid: true })
  })

  it('suggests the corrected domain for a known provider typo', () => {
    expect(validateEmail('joe@gmal.com')).toEqual({ valid: false, suggestion: 'joe@gmail.com' })
    expect(validateEmail('sue@yaho.com')).toEqual({ valid: false, suggestion: 'sue@yahoo.com' })
  })

  it('suggests the corrected TLD for a generic TLD typo', () => {
    // ".con" -> ".com" via TYPO_MAP, domain not in the provider table
    expect(validateEmail('joe@acme.con')).toEqual({ valid: false, suggestion: 'joe@acme.com' })
  })

  it('lowercases and trims before evaluating (so suggestions are normalized)', () => {
    expect(validateEmail('  Joe@Gmal.COM ')).toEqual({ valid: false, suggestion: 'joe@gmail.com' })
  })

  it('flags a TLD that is too short as an invalid ending', () => {
    const r = validateEmail('joe@acme.x')
    expect(r.valid).toBe(false)
    expect(r.error).toBe('".x" doesn\'t look like a valid email ending')
  })

  it('flags a TLD that is too long as an invalid ending', () => {
    const r = validateEmail('joe@acme.toolongtld')
    expect(r.valid).toBe(false)
    expect(r.error).toBe('".toolongtld" doesn\'t look like a valid email ending')
  })

  it('accepts an unrecognized-but-plausible-length TLD (3-6 chars)', () => {
    // not in VALID_TLDS, but length 4 -> passes the ending heuristic
    expect(validateEmail('joe@acme.zzzz')).toEqual({ valid: true })
  })
})
