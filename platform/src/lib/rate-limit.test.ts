import { describe, it, expect } from 'vitest'
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
})
