import { describe, it, expect } from 'vitest'
import { safeEqual } from './timing-safe-equal'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('super-secret-123', 'super-secret-123')).toBe(true)
  })

  it('returns false for a same-length wrong value', () => {
    expect(safeEqual('super-secret-123', 'super-secret-124')).toBe(false)
  })

  it('returns false for a wrong-length value without throwing', () => {
    expect(() => safeEqual('short', 'a-much-longer-secret-value')).not.toThrow()
    expect(safeEqual('short', 'a-much-longer-secret-value')).toBe(false)
  })

  it('returns false for an empty candidate against a real secret', () => {
    expect(safeEqual('', 'super-secret-123')).toBe(false)
  })

  it('returns true for two empty strings', () => {
    expect(safeEqual('', '')).toBe(true)
  })

  it('is case-sensitive', () => {
    expect(safeEqual('Secret', 'secret')).toBe(false)
  })
})
