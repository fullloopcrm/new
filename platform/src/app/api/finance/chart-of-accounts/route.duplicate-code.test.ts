import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/finance/chart-of-accounts — idx_coa_tenant_code (tenant_id, code)
 * collision. `code` is a caller-chosen identifier (same class as invoices'
 * invoice_number / quotes' quote_number). Pre-fix, a duplicate code fell
 * through to `throw error` and surfaced as a bare 500 "Failed" -- no
 * indication to the finance user that the actual problem was a taken code.
 */

const h = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() { return h.fake },
  get supabase() { return h.fake },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts: vi.fn(async () => []) }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }))
  h.fake = createFakeSupabase({
    chart_of_accounts: [
      { id: 'coa-A1', tenant_id: 'tenant-A', code: '1000', name: 'Assets', type: 'asset' },
    ],
  })
  h.fake._addUniqueConstraint('chart_of_accounts', 'code')
})

describe('POST /api/finance/chart-of-accounts — duplicate code', () => {
  it('returns a clean 409 (not a bare 500) when the code is already taken', async () => {
    const res = await POST(postReq({ code: '1000', name: 'Assets Again', type: 'asset' }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already in use/i)
    // No duplicate row landed.
    expect(h.fake._all('chart_of_accounts')).toHaveLength(1)
  })

  it('still creates the account when the code is unique', async () => {
    const res = await POST(postReq({ code: '2000', name: 'Liabilities', type: 'liability' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.account.code).toBe('2000')
    expect(h.fake._all('chart_of_accounts')).toHaveLength(2)
  })
})
