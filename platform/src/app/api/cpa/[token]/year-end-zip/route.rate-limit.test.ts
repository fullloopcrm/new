import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/cpa/[token]/year-end-zip pages through up to 200k journal lines
 * and zips a trial balance + general ledger on every hit -- the most
 * expensive of the public-token routes, yet previously had no rate limit at
 * all (unlike the invoice-checkout / deposit-checkout siblings). Now capped
 * at 20 requests / 10 minutes per public token (same rateLimitDb convention
 * used elsewhere in this branch).
 */

const { rateLimitAllowed, bumpUsage } = vi.hoisted(() => ({
  rateLimitAllowed: { value: true },
  bumpUsage: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/finance-export', () => ({
  toCsv: () => 'header\nrow',
  buildTrialBalance: async () => [],
  buildGeneralLedger: async () => [],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: {
            tenant_id: 'tenant-A',
            entity_id: null,
            expires_at: null,
            revoked_at: null,
          },
          error: null,
        }),
      }
      return chain
    },
    rpc: bumpUsage,
  },
}))

import { GET } from './route'

function req() {
  return new Request('https://app.example/api/cpa/tok_A/year-end-zip?year=2025')
}
const ctx = { params: Promise.resolve({ token: 'tok_A' }) }

describe('GET /api/cpa/[token]/year-end-zip — rate limit', () => {
  it('429s once the per-token rate limit is exhausted, without touching the token row', async () => {
    rateLimitAllowed.value = false
    const res = await GET(req(), ctx)
    expect(res.status).toBe(429)
    expect(bumpUsage).not.toHaveBeenCalled()
  })

  it('allows a normal request through and returns the zip', async () => {
    rateLimitAllowed.value = true
    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
  })
})
