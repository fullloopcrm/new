/**
 * GET /api/cpa/[token]/year-end-zip is unauthenticated (token-auth, no
 * session) and builds a full trial balance + general ledger for the year
 * then zips it on every call -- had no rate limiting, unlike the sibling
 * quotes/invoices/documents public/[token] routes hardened earlier this
 * session (that pass missed this route). Fixed with the same rateLimitDb
 * per-IP bucket pattern.
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
  buildTrialBalance: vi.fn(async () => ({ truncated: false })),
  buildGeneralLedger: vi.fn(async () => ({ truncated: false })),
}))

function fakeRequest(ip = '1.2.3.4') {
  return {
    url: 'https://app.example.com/api/cpa/tok123/year-end-zip',
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
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
      10,
      60 * 1000
    )
  })

  it('passes through to the token lookup when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    })
    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('cpa_access_tokens')
  })
})
