/**
 * POST /api/documents/public/[token]/sign is unauthenticated (per-signer
 * token-auth) and is the heaviest route in this family -- PDF generation via
 * pdf-lib, a storage upload, and on-completion email/SMS -- yet had no rate
 * limiting at all. Fixed with the same rateLimitDb bucket pattern used on
 * the sibling public document routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/documents', () => ({
  canSignerAct: vi.fn(),
  documentSignedPath: vi.fn(),
  DOCUMENTS_BUCKET: 'documents',
  isTerminalStatus: vi.fn(),
  logDocEvent: vi.fn(),
  sha256Hex: vi.fn(),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'secret') }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(), tenantSender: vi.fn() }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

function fakeRequest(body: Record<string, unknown> = {}, ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
})

describe('POST /api/documents/public/[token]/sign — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('document-sign:1.2.3.4'),
      10,
      60 * 1000
    )
  })

  it('passes through to the DB lookup when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    })
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest({ signature_png: 'data:image/png;base64,' + 'a'.repeat(100), signature_name: 'Alex' }),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('document_signers')
  })
})
