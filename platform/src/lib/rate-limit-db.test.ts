import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

// Toggles what the atomic RPC resolves to. Defaults to "not migrated yet" so
// the existing legacy-path tests below exercise the fallback unchanged.
let rpcResult: { data: unknown; error: { message: string } | null } = {
  data: null,
  error: { message: 'Could not find the function public.rate_limit_check_and_record(...) in the schema cache' },
}

function defaultFrom() {
  return {
    select: () => ({
      eq: () => ({
        gte: async () => countResult,
      }),
    }),
    insert: async () => insertResult,
  }
}
async function defaultRpc() {
  return rpcResult
}

vi.mock('./supabase', () => {
  return { supabaseAdmin: { from: defaultFrom, rpc: defaultRpc } }
})

import { rateLimitDb } from './rate-limit-db'
import { supabaseAdmin } from './supabase'

beforeEach(() => {
  countResult = { count: 0, error: null }
  insertResult = { error: null }
  rpcResult = {
    data: null,
    error: { message: 'Could not find the function public.rate_limit_check_and_record(...) in the schema cache' },
  }
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
})

/**
 * TOCTOU race: the legacy count-then-insert path (still used as a fallback
 * until the atomic RPC migration lands) does its count() read and insert()
 * write as two independent round trips. Concurrent calls to the SAME
 * bucket_key can each run count() before any sibling's insert() has landed,
 * so each sees the same pre-race count and each is allowed — the throttle
 * that gates every login/OTP/PIN endpoint in the platform (admin login,
 * client login, team-portal login, portal/referrer OTP, PIN reset) can be
 * blown past by firing concurrent guesses instead of sequential ones. This
 * describe block proves the race is real (documents the shape being fixed)
 * and proves the new atomic RPC path closes it.
 */
describe('rateLimitDb concurrency', () => {
  afterEach(() => {
    supabaseAdmin.from = defaultFrom as unknown as typeof supabaseAdmin.from
    supabaseAdmin.rpc = defaultRpc as unknown as typeof supabaseAdmin.rpc
  })

  it('LEGACY PATH (fallback only): concurrent calls to the same bucket can all pass, exceeding maxRequests', async () => {
    // Force the RPC to look unmigrated so every call falls through to the
    // legacy count-then-insert path exercised by the rest of this file.
    rpcResult = { data: null, error: { message: 'Could not find the function ... in the schema cache' } }

    const events: string[] = []
    supabaseAdmin.from = (() => ({
      select: () => ({
        eq: () => ({
          // Real round trip: yields control (awaits a microtask) before
          // resolving, exactly like a real network call to Postgres would —
          // this is what lets concurrent callers interleave.
          gte: async () => {
            await Promise.resolve()
            return { count: events.length, error: null }
          },
        }),
      }),
      insert: async () => {
        await Promise.resolve()
        events.push('x')
        return { error: null }
      },
    })) as unknown as typeof supabaseAdmin.from

    const maxRequests = 5
    const results = await Promise.all(
      Array.from({ length: 20 }, () => rateLimitDb('race:legacy', maxRequests, 60000, { failClosed: true }))
    )

    const allowedCount = results.filter((r) => r.allowed).length
    // This is the bug: with no locking, far more than maxRequests get
    // allowed when fired concurrently. Asserting ">" (not a fixed number)
    // keeps this robust to microtask-scheduling variance while still
    // proving the cap was blown through.
    expect(allowedCount).toBeGreaterThan(maxRequests)
  })

  it('ATOMIC RPC PATH: concurrent calls to the same bucket never exceed maxRequests', async () => {
    // Model what pg_advisory_xact_lock guarantees: the whole check-and-record
    // for a given bucket_key runs as one indivisible unit relative to other
    // concurrent callers of the same key. A synchronous (no internal await)
    // JS block faithfully reproduces that guarantee here since JS itself is
    // single-threaded and cannot be interrupted mid-synchronous-block.
    const counts = new Map<string, number>()
    supabaseAdmin.rpc = (async (
      _fn: string,
      params: { p_bucket_key: string; p_max_requests: number; p_window_ms: number }
    ) => {
      const current = counts.get(params.p_bucket_key) ?? 0
      if (current >= params.p_max_requests) {
        return { data: [{ allowed: false, remaining: 0 }], error: null }
      }
      counts.set(params.p_bucket_key, current + 1)
      return { data: [{ allowed: true, remaining: params.p_max_requests - current - 1 }], error: null }
    }) as unknown as typeof supabaseAdmin.rpc

    const maxRequests = 5
    const results = await Promise.all(
      Array.from({ length: 20 }, () => rateLimitDb('race:atomic', maxRequests, 60000, { failClosed: true }))
    )

    const allowedCount = results.filter((r) => r.allowed).length
    expect(allowedCount).toBe(maxRequests)
  })
})
