import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { safeEqual, signWithSecret } from './secret-compare'

describe('safeEqual', () => {
  it('returns true for equal non-empty strings', () => {
    expect(safeEqual('sekret-123', 'sekret-123')).toBe(true)
  })

  it('returns false for different strings', () => {
    expect(safeEqual('sekret-123', 'sekret-124')).toBe(false)
  })

  it('returns false for different-length strings', () => {
    expect(safeEqual('short', 'much-longer-value')).toBe(false)
  })

  it('returns false when the provided value is empty, even if expected is also empty', () => {
    // Guards the "unset env var -> empty expected -> empty submitted value
    // matches" bypass class.
    expect(safeEqual('', '')).toBe(false)
  })

  it('returns false when expected is empty', () => {
    expect(safeEqual('anything', '')).toBe(false)
  })

  it('returns false when provided is empty but expected is not', () => {
    expect(safeEqual('', 'real-secret')).toBe(false)
  })
})

describe('signWithSecret', () => {
  it('throws when secret is undefined instead of signing with an empty key', () => {
    expect(() => signWithSecret('payload', undefined)).toThrow()
  })

  it('throws when secret is an empty string', () => {
    expect(() => signWithSecret('payload', '')).toThrow()
  })

  it('produces the same HMAC-SHA256 a caller would compute directly', () => {
    const expected = createHmac('sha256', 'a-real-secret').update('payload').digest('hex')
    expect(signWithSecret('payload', 'a-real-secret')).toBe(expected)
  })

  it('is deterministic for the same payload+secret', () => {
    expect(signWithSecret('payload', 'secret')).toBe(signWithSecret('payload', 'secret'))
  })
})
