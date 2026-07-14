import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/payment-followup-daily — x-vercel-cron header bypass.
 *
 * This route used to OR an unauthenticated `x-vercel-cron: 1` header around
 * the CRON_SECRET compare. That header is NOT cryptographically signed by
 * Vercel — any external caller can set it — so it was a full auth bypass on
 * a route that sends real client payment-followup SMS. Fixed by routing
 * through the shared fail-closed verifyCronSecret() helper (no header
 * bypass, no query-param path), same as the other ~30 cron routes.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        gte: () => chain,
        not: () => chain,
        is: () => chain,
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { GET } from './route'

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/cron/payment-followup-daily?dry=1', { headers })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('GET /api/cron/payment-followup-daily — auth gate', () => {
  it('rejects a forged x-vercel-cron header with NO Authorization at all (bypass closed)', async () => {
    const res = await GET(req({ 'x-vercel-cron': '1' }) as never)
    expect(res.status).toBe(401)
  })

  it('rejects a WRONG Bearer secret even with x-vercel-cron set (bypass closed)', async () => {
    const res = await GET(req({ 'x-vercel-cron': '1', authorization: 'Bearer wrong-secret' }) as never)
    expect(res.status).toBe(401)
  })

  it('rejects when CRON_SECRET is unset (fail closed, not open)', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(req({ 'x-vercel-cron': '1', authorization: 'Bearer anything' }) as never)
    expect(res.status).toBe(500)
  })

  it('accepts the correct Bearer secret (positive control)', async () => {
    const res = await GET(req({ authorization: 'Bearer test-cron-secret' }) as never)
    expect(res.status).toBe(200)
  })
})
