import { describe, it, expect } from 'vitest'
import { isPlausibleName, extractPhone } from './WebChatWidget'

describe('isPlausibleName', () => {
  it('accepts short, name-like replies', () => {
    expect(isPlausibleName('Jane Doe')).toBe(true)
    expect(isPlausibleName('Jane')).toBe(true)
  })

  it('rejects a real question typed in reply to the name prompt (the reported bug)', () => {
    expect(isPlausibleName(
      'I found this on my bed last night, been living there for 2 months, is that a bed bug?',
    )).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isPlausibleName('')).toBe(false)
    expect(isPlausibleName('   ')).toBe(false)
  })

  it('rejects long or sentence-like replies even without a question mark', () => {
    expect(isPlausibleName('Hey I have a leak under my sink can someone come out today')).toBe(false)
  })
})

describe('extractPhone', () => {
  it('extracts a phone number in common formats', () => {
    expect(extractPhone('(555) 123-4567')).toBe('(555) 123-4567')
    expect(extractPhone('5551234567')).toBe('5551234567')
    expect(extractPhone('My number is 555-123-4567, thanks')).toBe('555-123-4567')
  })

  it('returns null when the reply has no phone number', () => {
    expect(extractPhone('is that the right number to text?')).toBeNull()
    expect(extractPhone('I found this on my bed last night, is that a bed bug?')).toBeNull()
  })
})
