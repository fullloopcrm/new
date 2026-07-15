import { describe, it, expect } from 'vitest'
import { safeEqual } from './secret-compare'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('super-secret-key', 'super-secret-key')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(safeEqual('super-secret-key', 'super-secret-kez')).toBe(false)
  })

  it('returns false for different-length strings without throwing', () => {
    expect(() => safeEqual('short', 'a-much-longer-secret')).not.toThrow()
    expect(safeEqual('short', 'a-much-longer-secret')).toBe(false)
  })

  it('returns false when either value is undefined', () => {
    expect(safeEqual(undefined, 'secret')).toBe(false)
    expect(safeEqual('secret', undefined)).toBe(false)
    expect(safeEqual(undefined, undefined)).toBe(false)
  })

  it('returns false when either value is null', () => {
    expect(safeEqual(null, 'secret')).toBe(false)
    expect(safeEqual('secret', null)).toBe(false)
  })

  it('returns false when both values are empty strings (no accidental match on unconfigured secret)', () => {
    expect(safeEqual('', '')).toBe(false)
  })

  it('returns false when the candidate is empty but the expected secret is set', () => {
    expect(safeEqual('', 'configured-secret')).toBe(false)
  })

  it('returns false when expected is empty but the candidate is not', () => {
    expect(safeEqual('anything', '')).toBe(false)
  })
})
