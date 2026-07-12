import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Persistent DB-backed rate limiter. The security-relevant behavior is what
 * happens when the count query FAILS: auth-critical callers pass
 * { failClosed: true } and must be DENIED (else a DB outage disables brute-force
 * throttling), while the default stays fail-open so a transient blip doesn't
 * 429 public forms. We mock the Supabase client so the count query's result —
 * including its error — is controllable per test.
 */

let countResult: { count: number | null; error: unknown }

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: async () => countResult,
        }),
      }),
      insert: async () => ({ error: null }),
    }),
  }),
}))

import { rateLimitDb } from './rate-limit-db'

describe('rateLimitDb', () => {
  beforeEach(() => {
    countResult = { count: 0, error: null }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('allows and reports remaining when under the limit', async () => {
    countResult = { count: 2, error: null }
    const rl = await rateLimitDb('k', 5, 60_000)
    expect(rl.allowed).toBe(true)
    expect(rl.remaining).toBe(2) // 5 - 2 - 1
  })

  it('denies when the count is at/over the limit', async () => {
    countResult = { count: 5, error: null }
    const rl = await rateLimitDb('k', 5, 60_000)
    expect(rl).toEqual({ allowed: false, remaining: 0 })
  })

  it('fails CLOSED on a DB error when failClosed is set (auth-critical)', async () => {
    countResult = { count: null, error: { message: 'db down' } }
    const rl = await rateLimitDb('k', 5, 60_000, { failClosed: true })
    expect(rl).toEqual({ allowed: false, remaining: 0 })
  })

  it('fails OPEN on a DB error by default (public callers)', async () => {
    countResult = { count: null, error: { message: 'db down' } }
    const rl = await rateLimitDb('k', 5, 60_000)
    expect(rl.allowed).toBe(true)
  })

  it('logs loudly on a DB error regardless of mode', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    countResult = { count: null, error: { message: 'db down' } }
    await rateLimitDb('k', 5, 60_000, { failClosed: true })
    expect(spy).toHaveBeenCalled()
  })
})
