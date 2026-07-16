/**
 * GET /api/cpa/[token]/year-end-zip is unauthenticated by design (token-auth,
 * no session) and, on every call, does DB lookups + rebuilds a trial
 * balance/general ledger + generates a ZIP -- unlike its sibling public
 * financial-document routes (quotes/invoices/documents public/[token]) this
 * session already rate-limited at 30/min/IP, it had no cap at all. A known
 * or leaked token could be hammered for unbounded DB reads + zip generation.
 * Fixed by applying the same rateLimitDb bucket pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
const supabaseRpc = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => supabaseFrom(...args),
    rpc: (...args: unknown[]) => supabaseRpc(...args),
  },
}))
vi.mock('@/lib/finance-export', () => ({
  toCsv: vi.fn(() => ''),
  buildTrialBalance: vi.fn(async () => []),
  buildGeneralLedger: vi.fn(async () => []),
}))

function fakeRequest(ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    url: 'https://example.com/api/cpa/tok123/year-end-zip',
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
  supabaseRpc.mockReset()
})

describe('GET /api/cpa/[token]/year-end-zip — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('cpa-year-end-zip:1.2.3.4'),
      30,
      60 * 1000
    )
  })

  it('passes through to the DB lookup when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 29 })
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    })
    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('cpa_access_tokens')
  })
})
