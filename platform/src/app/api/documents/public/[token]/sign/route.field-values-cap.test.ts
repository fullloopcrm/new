/**
 * POST /api/documents/public/[token]/sign accepts a caller-supplied
 * `field_values` array on an UNAUTHENTICATED public endpoint. The route was
 * rate-limited by request COUNT (route.rate-limit.test.ts) but had no cap on
 * request SIZE: an arbitrarily long array (each entry driving its own
 * sequential document_fields UPDATE) or an arbitrarily long per-item `value`
 * string (unbounded TEXT column, also stamped onto the finalized PDF) could
 * both pass through unchecked. Same class as the chat/yinez/public-form
 * message-length caps; this is the array-cardinality + per-item version.
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

const VALID_SIGNER = {
  id: 'signer-1',
  document_id: 'doc-1',
  status: 'sent',
  consent_accepted_at: '2026-07-18T00:00:00.000Z',
  order_index: 0,
}

function fakeRequest(body: Record<string, unknown> = {}, ip = '9.9.9.9') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

function validBody(extra: Record<string, unknown> = {}) {
  return {
    signature_png: 'data:image/png;base64,' + 'a'.repeat(100),
    signature_name: 'Alex Signer',
    ...extra,
  }
}

// Table-aware fake: document_signers lookup returns a valid, actionable
// signer; any further table access (documents, ...) is tracked so tests can
// assert whether the route got past the field_values validation.
function mockSupabaseUpToSigner() {
  supabaseFrom.mockImplementation((table: string) => {
    if (table === 'document_signers') {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: VALID_SIGNER }) }) }) }
    }
    // documents (or anything past the signer lookup) — return nothing so the
    // route stops at its own 404 rather than needing full happy-path mocks.
    return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
  })
}

beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
  supabaseFrom.mockReset()
})

describe('POST /api/documents/public/[token]/sign — field_values cap', () => {
  it('rejects with 400 when field_values has more than 200 entries, before querying documents', async () => {
    mockSupabaseUpToSigner()
    const oversized = Array.from({ length: 201 }, (_, i) => ({ field_id: `f${i}`, value: 'x' }))
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest(validBody({ field_values: oversized })),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/too many/i)
    expect(supabaseFrom).not.toHaveBeenCalledWith('documents')
  })

  it('rejects with 400 when a single field value exceeds 5000 characters, before querying documents', async () => {
    mockSupabaseUpToSigner()
    const oversizedValue = [{ field_id: 'f1', value: 'x'.repeat(5001) }]
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest(validBody({ field_values: oversizedValue })),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalledWith('documents')
  })

  it('allows a normal-size field_values array through to the documents lookup', async () => {
    mockSupabaseUpToSigner()
    const normal = [{ field_id: 'f1', value: 'John Doe' }, { field_id: 'f2', value: '123 Main St' }]
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest(validBody({ field_values: normal })),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    // Route proceeds past validation and hits its own 404 (doc not found in this fake) — the
    // point under test is that it got there, not the terminal status.
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('documents')
  })

  it('treats a non-array field_values as empty instead of throwing', async () => {
    mockSupabaseUpToSigner()
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest(validBody({ field_values: 'not-an-array' })),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('documents')
  })
})
