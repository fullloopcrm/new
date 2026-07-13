/**
 * PATCH /api/finance/bank-accounts/[id] — cross-tenant FK injection on coa_id
 * (P10 register, same class W2 found on p1-w2/p1-w3). coa_id passed through
 * an allowlist with only `.eq('tenant_id', tenantId)` on the WHERE clause --
 * nothing verified the FK VALUE itself belonged to the caller's tenant, so a
 * caller could reassign their own bank account to another tenant's
 * chart-of-accounts row and exfiltrate its code/name/type via the
 * chart_of_accounts() join on GET /api/finance/bank-accounts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { PATCH } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bank_accounts: [{ id: 'bank-1', tenant_id: TENANT_A, name: 'Checking', coa_id: 'coa-A1' }],
    chart_of_accounts: [
      { id: 'coa-A1', tenant_id: TENANT_A, code: '1000', name: 'Cash' },
      { id: 'coa-B1', tenant_id: TENANT_B, code: '9999', name: 'Other tenant secret account' },
    ],
  }
})

describe('PATCH /api/finance/bank-accounts/[id] — cross-tenant FK injection', () => {
  it("rejects a coa_id belonging to another tenant instead of writing it", async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-B1' }), params('bank-1'))

    expect(res.status).toBe(400)
    expect(h.store.bank_accounts[0].coa_id).toBe('coa-A1')
  })

  it('still updates the bank account when coa_id genuinely belongs to the caller tenant', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-A1', name: 'Checking (renamed)' }), params('bank-1'))

    expect(res.status).toBe(200)
    expect(h.store.bank_accounts[0].name).toBe('Checking (renamed)')
  })
})
