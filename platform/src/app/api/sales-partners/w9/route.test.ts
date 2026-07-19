import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * POST/GET /api/sales-partners/w9 — a partner's own tax-form submission.
 * Bearer-token-gated (own data only). Probes: unauthenticated callers never
 * reach the DB, a token for a different tenant is rejected even if the
 * partner id matches (cross-tenant), and a successful submission is stored
 * encrypted with only last-4 in the clear.
 */

const VALID_KEY = 'a'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

let upsertCalls: Array<Record<string, unknown>>
let salesPartnersSelectCalled: boolean
let partnerExists: boolean
let w9StatusRow: Record<string, unknown> | null

function salesPartnersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => { salesPartnersSelectCalled = true; return chain },
    eq: () => chain,
    maybeSingle: async () => ({ data: partnerExists ? { id: 'sp_1' } : null, error: null }),
  }
  return chain
}

function w9Builder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: w9StatusRow, error: null }),
    upsert: (row: Record<string, unknown>) => { upsertCalls.push(row); return { error: null } },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'sales_partners') return salesPartnersBuilder()
      if (table === 'sales_partner_w9') return w9Builder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

const getSalesPartnerAuthMock = vi.fn()
vi.mock('@/lib/sales-partner-portal-auth', () => ({
  getSalesPartnerAuth: (req: Request) => getSalesPartnerAuthMock(req),
}))

import { GET, POST } from './route'

const VALID_BODY = {
  legal_name: 'Jordan Rivera',
  business_name: null,
  address_line1: '123 Main St',
  address_line2: null,
  city: 'Brooklyn',
  state: 'NY',
  zip: '11201',
  tax_classification: 'individual',
  tin_type: 'ssn',
  tin: '123456789',
}

function req(body?: unknown): Request {
  return new Request('https://example.com/api/sales-partners/w9', {
    method: 'POST',
    headers: { authorization: 'Bearer sometoken' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  upsertCalls = []
  salesPartnersSelectCalled = false
  partnerExists = true
  w9StatusRow = null
  getSalesPartnerAuthMock.mockReset()
  process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('POST /api/sales-partners/w9 — auth gate', () => {
  it('rejects an unauthenticated submission with 401 and never touches the DB', async () => {
    getSalesPartnerAuthMock.mockReturnValue(null)
    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(401)
    expect(upsertCalls).toHaveLength(0)
    expect(salesPartnersSelectCalled).toBe(false)
  })

  it('rejects when the token partner id no longer belongs to the token tenant (cross-tenant)', async () => {
    getSalesPartnerAuthMock.mockReturnValue({ pid: 'sp_1', tid: 'tenant_1' })
    partnerExists = false // the .eq(tenant_id) recheck finds nothing
    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(403)
    expect(upsertCalls).toHaveLength(0)
  })
})

describe('POST /api/sales-partners/w9 — validation', () => {
  beforeEach(() => {
    getSalesPartnerAuthMock.mockReturnValue({ pid: 'sp_1', tid: 'tenant_1' })
  })

  it('rejects a missing required field before any write', async () => {
    const { legal_name, ...rest } = VALID_BODY
    const res = await POST(req(rest))
    expect(res.status).toBe(400)
    expect(upsertCalls).toHaveLength(0)
  })

  it('rejects an invalid TIN length before any write', async () => {
    const res = await POST(req({ ...VALID_BODY, tin: '123' }))
    expect(res.status).toBe(400)
    expect(upsertCalls).toHaveLength(0)
  })
})

describe('POST /api/sales-partners/w9 — successful submission', () => {
  beforeEach(() => {
    getSalesPartnerAuthMock.mockReturnValue({ pid: 'sp_1', tid: 'tenant_1' })
  })

  it('stores an encrypted envelope + last-4 only, scoped to the token tenant/partner', async () => {
    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(200)
    expect(upsertCalls).toHaveLength(1)
    const row = upsertCalls[0]
    expect(row.tenant_id).toBe('tenant_1')
    expect(row.sales_partner_id).toBe('sp_1')
    expect(row.tin_last4).toBe('6789')
    expect(row.status).toBe('submitted')
    // The full TIN and legal name must never appear in the clear on the row.
    expect(JSON.stringify(row)).not.toContain('123456789')
    expect(JSON.stringify(row)).not.toContain('Jordan Rivera')
    expect(typeof row.encrypted_data).toBe('string')
  })

  it('fails closed (503) instead of writing plaintext when no encryption key is configured', async () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(503)
    expect(upsertCalls).toHaveLength(0)
  })
})

describe('GET /api/sales-partners/w9 — status only, no PII', () => {
  it('rejects an unauthenticated status check', async () => {
    getSalesPartnerAuthMock.mockReturnValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns status metadata without any decrypted PII fields', async () => {
    getSalesPartnerAuthMock.mockReturnValue({ pid: 'sp_1', tid: 'tenant_1' })
    w9StatusRow = { tax_classification: 'individual', tin_type: 'ssn', tin_last4: '6789', status: 'submitted', submitted_at: '2026-07-19', verified_at: null, rejected_reason: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.w9.tin_last4).toBe('6789')
    expect(body.w9).not.toHaveProperty('tin')
    expect(body.w9).not.toHaveProperty('legal_name')
    expect(body.w9).not.toHaveProperty('encrypted_data')
  })

  it('returns null when no W-9 has been submitted yet', async () => {
    getSalesPartnerAuthMock.mockReturnValue({ pid: 'sp_1', tid: 'tenant_1' })
    w9StatusRow = null
    const res = await GET(req())
    const body = await res.json()
    expect(body.w9).toBeNull()
  })
})
