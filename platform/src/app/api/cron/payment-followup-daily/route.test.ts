import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * payment-followup-daily cron — auth gate.
 *
 * This route sends real customer-facing SMS (payment reminders, up to 100
 * per tenant per hit) across every tenant with Telnyx configured. It used to
 * accept an unauthenticated request as long as it carried an
 * `x-vercel-cron: 1` header — a header Vercel does not strip or verify on
 * inbound requests, so any external caller could set it themselves and
 * trigger a mass-SMS run with no secret at all. CRON_SECRET is now the only
 * gate.
 */

// Mock chain matches the route's actual query shape: .select().not().not() —
// no .eq(), since 715733df (this session, W2) moved status filtering from
// .eq('status','active') to tenantServesSite() in JS so 'setup'/'pending'
// tenants aren't silently excluded. The old .eq()-shaped mock never got
// updated, so `.not is not a function` threw on the one test that reaches
// this query (the 200 case) — the other 3 tests 401 before touching it.
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        not: () => ({
          not: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))

import { GET } from './route'

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('payment-followup-daily cron — auth', () => {
  it('rejects a request with no auth at all', async () => {
    const res = await GET(new Request('http://t/api/cron/payment-followup-daily'))
    expect(res.status).toBe(401)
  })

  it('rejects a spoofed x-vercel-cron header with no valid secret (regression: this used to bypass auth entirely)', async () => {
    const res = await GET(new Request('http://t/api/cron/payment-followup-daily', {
      headers: { 'x-vercel-cron': '1' },
    }))
    expect(res.status).toBe(401)
  })

  it('rejects a wrong bearer secret even with the spoofed header present', async () => {
    const res = await GET(new Request('http://t/api/cron/payment-followup-daily', {
      headers: { authorization: 'Bearer wrong-secret', 'x-vercel-cron': '1' },
    }))
    expect(res.status).toBe(401)
  })

  it('accepts the correct CRON_SECRET bearer token', async () => {
    const res = await GET(new Request('http://t/api/cron/payment-followup-daily', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }))
    expect(res.status).toBe(200)
  })
})
