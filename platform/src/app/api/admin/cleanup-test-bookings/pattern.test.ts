import { describe, it, expect } from 'vitest'
import { TEST_EMAIL_PATTERN } from './route'

describe('TEST_EMAIL_PATTERN', () => {
  it('matches actual test emails', () => {
    expect(TEST_EMAIL_PATTERN.test('test@example.com')).toBe(true)
    expect(TEST_EMAIL_PATTERN.test('test123@example.com')).toBe(true)
    expect(TEST_EMAIL_PATTERN.test('real.name@e.com')).toBe(true)
  })

  it('does not false-positive-match real emails containing "test" as a substring', () => {
    expect(TEST_EMAIL_PATTERN.test('latest@gmail.com')).toBe(false)
    expect(TEST_EMAIL_PATTERN.test('protest@example.com')).toBe(false)
    expect(TEST_EMAIL_PATTERN.test('contest@example.com')).toBe(false)
    expect(TEST_EMAIL_PATTERN.test('clientest@example.com')).toBe(false)
    expect(TEST_EMAIL_PATTERN.test('attest@example.com')).toBe(false)
  })
})
