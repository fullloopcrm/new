/**
 * POST /api/finance/chart-of-accounts — cross-tenant FK injection on the
 * self-referential parent_id. An unverified parent_id would let a caller
 * nest their new account under another tenant's chart-of-accounts row.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts: vi.fn(async () => []) }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    chart_of_accounts: [
      { id: 'coa-A1', tenant_id: 'tenant-A', code: '1000', name: 'Assets', type: 'asset' },
      { id: 'coa-B1', tenant_id: 'tenant-B', code: '1000', name: 'Assets (secret)', type: 'asset' },
    ],
  }
})

describe('POST /api/finance/chart-of-accounts — cross-tenant FK injection', () => {
  it('rejects a parent_id belonging to another tenant and does not insert an account', async () => {
    const res = await POST(postReq({ code: '1100', name: 'Cash', type: 'asset', parent_id: 'coa-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.chart_of_accounts.length).toBe(2)
  })

  it('creates the account when parent_id genuinely belongs to the caller tenant', async () => {
    const res = await POST(postReq({ code: '1100', name: 'Cash', type: 'asset', parent_id: 'coa-A1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.account.parent_id).toBe('coa-A1')
  })

  it('creates a top-level account when parent_id is omitted', async () => {
    const res = await POST(postReq({ code: '2000', name: 'Liabilities', type: 'liability' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.account.parent_id).toBe(null)
  })
})
