import { describe, it, expect } from 'vitest'
import { parseIdentityFromText } from './WebChatWidget'

describe('parseIdentityFromText', () => {
  it('parses a name + phone reply', () => {
    expect(parseIdentityFromText('Jane Doe, (555) 123-4567')).toEqual({ name: 'Jane Doe', phone: '(555) 123-4567' })
    expect(parseIdentityFromText('Jane 5551234567')).toEqual({ name: 'Jane', phone: '5551234567' })
  })

  it('does not mistake a real question for a name (the reported bug)', () => {
    expect(parseIdentityFromText(
      'I found this on my bed last night, been living there for 2 months, is that a bed bug?',
    )).toBeNull()
  })

  it('returns null when there is no phone number at all', () => {
    expect(parseIdentityFromText('Just wondering what your rates are')).toBeNull()
    expect(parseIdentityFromText('Jane Doe')).toBeNull()
  })

  it('returns null when the leftover text is too long or sentence-like, even with a phone', () => {
    expect(parseIdentityFromText(
      'Hey I have a leak under my sink can someone come out today, my number is 555-123-4567',
    )).toBeNull()
  })

  it('returns null when the leftover text contains a question mark', () => {
    expect(parseIdentityFromText('is 555-123-4567 the right number to text?')).toBeNull()
  })
})
