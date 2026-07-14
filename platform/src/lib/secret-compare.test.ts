import { describe, it, expect } from 'vitest'
import { safeEqual } from './secret-compare'

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
