import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * Admin decrypt path for a Sales Partner's W-9. Gated on
 * sales_partners.payout — probes: no permission -> 403 before any decrypt,
 * cross-tenant partner id -> 404 (not found, not leaked), and a successful
 * GET returns the decrypted fields while PUT records who verified it.
 */

const VALID_KEY = 'a'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

let w9Row: Record<string, unknown> | null
let updateCalls: Array<Record<string, unknown>>
let lastEqCalls: Array<[string, unknown]>

function w9Builder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { lastEqCalls.push([col, val]); return chain },
    maybeSingle: async () => ({ data: w9Row, error: null }),
    update: (fields: Record<string, unknown>) => {
      updateCalls.push(fields)
      return chain
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'sales_partner_w9') return w9Builder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

const requirePermissionMock = vi.fn()
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (perm: string) => requirePermissionMock(perm),
}))

import { GET, PUT } from './route'
import { encryptW9Data } from '@/lib/w9-crypto'

const DECRYPTED = {
  legal_name: 'Jordan Rivera', business_name: null, address_line1: '123 Main St',
  address_line2: null, city: 'Brooklyn', state: 'NY', zip: '11201', tin: '123456789',
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  updateCalls = []
  lastEqCalls = []
  requirePermissionMock.mockReset()
  process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
  w9Row = {
    sales_partner_id: 'sp_1',
    tax_classification: 'individual',
    tin_type: 'ssn',
    tin_last4: '6789',
    encrypted_data: encryptW9Data(DECRYPTED),
    status: 'submitted',
    submitted_at: '2026-07-19T00:00:00Z',
    verified_at: null,
    verified_by: null,
    rejected_reason: null,
  }
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('GET /api/admin/sales-partners/[id]/w9 — permission gate', () => {
  it('rejects without sales_partners.payout permission, before any decrypt', async () => {
    requirePermissionMock.mockResolvedValue({
      tenant: null,
      error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }),
    })
    const res = await GET(new Request('https://x/w9'), params('sp_1'))
    expect(res.status).toBe(403)
    expect(requirePermissionMock).toHaveBeenCalledWith('sales_partners.payout')
  })
})

describe('GET /api/admin/sales-partners/[id]/w9 — decrypt', () => {
  beforeEach(() => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: 'tenant_1', userId: 'user_1' }, error: null })
  })

  it('returns the decrypted W-9 fields plus status metadata, scoped to the caller tenant', async () => {
    const res = await GET(new Request('https://x/w9'), params('sp_1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.legal_name).toBe('Jordan Rivera')
    expect(body.tin).toBe('123456789')
    expect(body.tin_last4).toBe('6789')
    expect(lastEqCalls).toContainEqual(['tenant_id', 'tenant_1'])
    expect(lastEqCalls).toContainEqual(['sales_partner_id', 'sp_1'])
  })

  it('returns 404 (not leaked as 403/500) when no W-9 exists for this tenant+partner', async () => {
    w9Row = null
    const res = await GET(new Request('https://x/w9'), params('sp_1'))
    expect(res.status).toBe(404)
  })

  it('returns 500 rather than corrupted data when the envelope fails to decrypt', async () => {
    w9Row!.encrypted_data = 'v1:garbage:garbage:garbage'
    const res = await GET(new Request('https://x/w9'), params('sp_1'))
    expect(res.status).toBe(500)
  })
})

describe('PUT /api/admin/sales-partners/[id]/w9 — verify/reject', () => {
  beforeEach(() => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: 'tenant_1', userId: 'admin_user_1' }, error: null })
  })

  it('rejects an invalid status value', async () => {
    const res = await PUT(
      new Request('https://x/w9', { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }),
      params('sp_1'),
    )
    expect(res.status).toBe(400)
    expect(updateCalls).toHaveLength(0)
  })

  it('marking verified stamps verified_at + verified_by from the admin session', async () => {
    const res = await PUT(
      new Request('https://x/w9', { method: 'PUT', body: JSON.stringify({ status: 'verified' }) }),
      params('sp_1'),
    )
    expect(res.status).toBe(200)
    expect(updateCalls[0].status).toBe('verified')
    expect(updateCalls[0].verified_by).toBe('admin_user_1')
    expect(updateCalls[0].verified_at).not.toBeNull()
  })

  it('marking rejected clears verification fields and stores the reason', async () => {
    const res = await PUT(
      new Request('https://x/w9', { method: 'PUT', body: JSON.stringify({ status: 'rejected', rejected_reason: 'illegible' }) }),
      params('sp_1'),
    )
    expect(res.status).toBe(200)
    expect(updateCalls[0].status).toBe('rejected')
    expect(updateCalls[0].verified_by).toBeNull()
    expect(updateCalls[0].rejected_reason).toBe('illegible')
  })
})
