import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fail-closed regression (P3-3 x P0-2 merge reconciliation). The DB-backed
 * limiter must DENY on a count error when the caller opts into failClosed, so
 * an auth-verify path (OTP/PIN) can't be brute-forced while the limiter is
 * blind to a DB outage. The default stays fail-open so a transient blip doesn't
 * 429 legitimate public traffic.
 */

// Toggles what the count query resolves to for the current test.
let countResult: { count: number | null; error: { message: string } | null } = {
  count: 0,
  error: null,
}

// Toggles what the insert (attempt-record write) resolves to for the current test.
let insertResult: { error: { message: string } | null } = { error: null }

vi.mock('./supabase', () => {
  const from = () => ({
    select: () => ({
      eq: () => ({
        gte: async () => countResult,
      }),
    }),
    insert: async () => insertResult,
  })
  return { supabaseAdmin: { from } }
})

import { rateLimitDb } from './rate-limit-db'

beforeEach(() => {
  countResult = { count: 0, error: null }
  insertResult = { error: null }
})

describe('rateLimitDb failClosed', () => {
  it('DENIES on a DB count error when failClosed is set', async () => {
    countResult = { count: null, error: { message: 'db down' } }
    const res = await rateLimitDb('portal_verify:+15551230000', 5, 60000, { failClosed: true })
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
  })

  it('fails OPEN by default on a DB count error (public traffic not locked out)', async () => {
    countResult = { count: null, error: { message: 'db down' } }
    const res = await rateLimitDb('public_form:1.2.3.4', 5, 60000)
    expect(res.allowed).toBe(true)
  })

  it('allows within the limit when the DB is healthy', async () => {
    countResult = { count: 0, error: null }
    const res = await rateLimitDb('portal_verify:+15551230000', 5, 60000, { failClosed: true })
    expect(res.allowed).toBe(true)
  })

  it('blocks once the window count reaches the cap', async () => {
    countResult = { count: 5, error: null }
    const res = await rateLimitDb('portal_verify:+15551230000', 5, 60000, { failClosed: true })
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
  })

  // MED-1 regression: a failed attempt-record write (insert error) leaves the
  // attempt uncounted. For failClosed callers that must DENY, otherwise the
  // throttle is silently disabled on every write failure (same bypass class as
  // the count error above).
  it('DENIES on a DB insert error when failClosed is set', async () => {
    countResult = { count: 0, error: null }
    insertResult = { error: { message: 'insert failed' } }
    const res = await rateLimitDb('portal_verify:+15551230000', 5, 60000, { failClosed: true })
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
  })

  it('fails OPEN by default on a DB insert error (public traffic not locked out)', async () => {
    countResult = { count: 0, error: null }
    insertResult = { error: { message: 'insert failed' } }
    const res = await rateLimitDb('public_form:1.2.3.4', 5, 60000)
    expect(res.allowed).toBe(true)
  })

  it('logs loudly on a DB count error regardless of mode', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    countResult = { count: null, error: { message: 'db down' } }
    await rateLimitDb('portal_verify:+15551230000', 5, 60000, { failClosed: true })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
