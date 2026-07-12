import { describe, it, expect, afterEach, vi } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-${Date.now()}`
    const result = rateLimit(key, 5, 60000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('tracks remaining requests', () => {
    const key = `test-remaining-${Date.now()}`
    rateLimit(key, 3, 60000)
    rateLimit(key, 3, 60000)
    const result = rateLimit(key, 3, 60000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocks when limit exceeded', () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60000)
    }
    const result = rateLimit(key, 5, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('keeps remaining clamped at 0 once well past the cap (never goes negative)', () => {
    const key = `test-clamp-${Date.now()}`
    // Hammer far past the cap of 3.
    for (let i = 0; i < 10; i++) rateLimit(key, 3, 60000)
    const result = rateLimit(key, 3, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0) // Math.max(0, ...) floor, not 3 - 12
  })

  it('isolates buckets — exhausting one key does not throttle another', () => {
    const hot = `test-iso-hot-${Date.now()}`
    const cold = `test-iso-cold-${Date.now()}`
    for (let i = 0; i < 5; i++) rateLimit(hot, 5, 60000)
    expect(rateLimit(hot, 5, 60000).allowed).toBe(false) // hot bucket is blocked
    // A different key is a separate window and must still be allowed.
    const other = rateLimit(cold, 5, 60000)
    expect(other.allowed).toBe(true)
    expect(other.remaining).toBe(4)
  })

  it('defaults to a 60-request window when no cap is supplied', () => {
    const key = `test-default-${Date.now()}`
    const result = rateLimit(key)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(59) // default maxRequests = 60
  })

  it('starts a fresh window once the previous one has expired', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-11T00:00:00.000Z'))
      const key = 'test-reset-fixed'
      for (let i = 0; i < 5; i++) rateLimit(key, 5, 60000)
      expect(rateLimit(key, 5, 60000).allowed).toBe(false) // window is full

      // Jump the clock past the 60s window WITHOUT firing pending timers
      // (setSystemTime advances the clock; it does not run the cleanup interval).
      vi.setSystemTime(new Date('2026-07-11T00:02:00.000Z'))

      const afterReset = rateLimit(key, 5, 60000)
      expect(afterReset.allowed).toBe(true) // expired entry → brand-new window
      expect(afterReset.remaining).toBe(4)
    } finally {
      vi.useRealTimers()
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
})
