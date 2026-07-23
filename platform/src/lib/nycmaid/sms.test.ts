import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * sendSMS()'s Telnyx fetch had NO timeout — a slow (not even erroring)
 * response could hang indefinitely. Nested inside this function's own
 * 3-attempt retry loop AND a caller's own outer retry loop (e.g.
 * team-portal/30min-alert's 2-attempt loop with a 60s sleep between), that
 * silently exhausted the whole request's maxDuration budget and got the
 * function hard-killed by the platform mid-fetch — before any exception was
 * thrown, any .catch() ran, or any log was written. Real production
 * incident, 2026-07-23: a client's payment-request text never sent, zero
 * trace anywhere (no sms_logs row, no comms_fail row, not even the route's
 * own follow-up admin SMS) — root-caused via DB archaeology, not logs,
 * because there were none.
 *
 * Fix: AbortSignal.timeout(12_000) on the fetch. These tests prove a
 * hang now fails fast (via the same abort path a real 12s timeout
 * produces) instead of hanging forever, and that the failure flows through
 * the EXISTING catch/retry/logSMSFailure path unchanged — same
 * {success:false, error} shape as every other failure mode.
 */

vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-telnyx-key'
})

const inserts: { table: string; row: Record<string, unknown> }[] = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row })
        return Promise.resolve({ data: null, error: null })
      },
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

import { sendSMS } from './sms'

beforeEach(() => {
  inserts.length = 0
  vi.unstubAllGlobals()
})

describe("sendSMS — Telnyx fetch timeout (2026-07-23 silent-hang incident)", () => {
  it('wires an AbortSignal onto every fetch attempt, so a real timeout can actually cut it off', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => ({ data: { id: 'msg-1' } }) }))
    vi.stubGlobal('fetch', fetchMock)

    await sendSMS('9253893636', 'hi', { skipConsent: true, smsType: 'test' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('a hung request that then aborts fails FAST with the same {success:false} shape as any other fetch failure — does not hang, does not throw', async () => {
    // Simulates exactly what a real AbortSignal.timeout(12_000) firing on a
    // hung request produces: fetch's own promise rejects with an
    // AbortError. Rejecting immediately (rather than actually waiting 12
    // real seconds per retry, or trying to manually trigger the production
    // signal's internal abort) keeps the test fast — what's under test is
    // that the code CORRECTLY HANDLES that rejection, not the literal timer.
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      // Confirms the call was actually made abortable (real timeout could
      // have cut it off) before simulating the abort firing.
      expect(init.signal).toBeInstanceOf(AbortSignal)
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendSMS('9253893636', 'hi', { skipConsent: true, smsType: 'test', skipCircuit: true })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    // Same failure-logging path every other fetch failure uses (comms_fail row).
    expect(inserts.some((i) => i.table === 'notifications' && (i.row as { type?: string }).type === 'comms_fail')).toBe(true)
  }, 20_000)
})
