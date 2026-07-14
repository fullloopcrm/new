import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatPhone,
  formatName,
  formatEmail,
  formatAddress,
  formatRelative,
} from './format'

/**
 * Display formatters. Only the timezone-independent formatters are asserted on
 * exact output (phone/name/email/address); formatRelative is tested under a
 * frozen clock so its bucket labels are deterministic. Reverting any transform
 * changes the asserted string.
 */
describe('formatPhone', () => {
  it('formats a 10-digit number', () => {
    expect(formatPhone('2125550199')).toBe('(212) 555-0199')
  })
  it('strips a leading US country code from an 11-digit number', () => {
    expect(formatPhone('12125550199')).toBe('(212) 555-0199')
  })
  it('normalizes already-punctuated 10-digit input', () => {
    expect(formatPhone('212-555-0199')).toBe('(212) 555-0199')
  })
  it('returns unformattable input unchanged', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

describe('formatName', () => {
  it('title-cases each word', () => {
    expect(formatName('john doe')).toBe('John Doe')
    expect(formatName('JANE SMITH')).toBe('Jane Smith')
    expect(formatName('mary')).toBe('Mary')
  })
})

describe('formatEmail', () => {
  it('lowercases and trims', () => {
    expect(formatEmail('  JOHN@Example.COM ')).toBe('john@example.com')
  })
})

describe('formatAddress', () => {
  it('title-cases words but keeps known abbreviations uppercase and numbers intact', () => {
    expect(formatAddress('123 main st')).toBe('123 Main ST')
    expect(formatAddress('45 park ave')).toBe('45 Park AVE')
    expect(formatAddress('brooklyn ny')).toBe('Brooklyn NY')
  })
})

describe('formatRelative', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('labels each relative bucket under a frozen clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    const now = Date.now()

    expect(formatRelative(new Date(now - 30 * 1000))).toBe('just now')      // < 60s
    expect(formatRelative(new Date(now - 5 * 60 * 1000))).toBe('5m ago')    // minutes
    expect(formatRelative(new Date(now - 3 * 60 * 60 * 1000))).toBe('3h ago') // hours
    expect(formatRelative(new Date(now - 2 * 24 * 60 * 60 * 1000))).toBe('2d ago') // days
    expect(formatRelative(new Date(now + 5 * 60 * 1000))).toBe('in 5m')     // future
  })
})
