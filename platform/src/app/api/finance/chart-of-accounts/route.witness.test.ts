/**
 * POST /api/finance/chart-of-accounts — cross-tenant parent_id FK-injection.
 *
 * parent_id (a self-referencing FK into chart_of_accounts) was inserted
 * verbatim with no tenant-ownership check -- the one FK in this module still
 * missing the guard every sibling already has (coa_id on bank-accounts,
 * entity_id on expenses/periods/cpa-tokens). Fixed by verifying parent_id
 * belongs to the caller's tenant before insert (400 on miss).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    chart_of_accounts: [
      { id: 'coa-A', tenant_id: TENANT_A, code: '1000', name: 'A Assets', type: 'asset' },
      { id: 'coa-B', tenant_id: TENANT_B, code: '1000', name: 'B Assets', type: 'asset' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts: async () => [] }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const base = { code: '1010', name: 'A Cash', type: 'asset' }

describe('POST /api/finance/chart-of-accounts — cross-tenant parent_id FK-injection guard', () => {
  it('LOCK: rejects a foreign parent_id (400), no chart_of_accounts row created beyond seed', async () => {
    const res = await POST(postReq({ ...base, parent_id: 'coa-B' }))
    expect(res.status).toBe(400)
    expect(fake._all('chart_of_accounts').length).toBe(2)
  })

  it('CONTROL: omitting parent_id succeeds', async () => {
    const res = await POST(postReq(base))
    expect(res.status).toBe(200)
  })

  it('CONTROL: explicit own-tenant parent_id passes the ownership check', async () => {
    const res = await POST(postReq({ ...base, parent_id: 'coa-A' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.account.parent_id).toBe('coa-A')
  })
})
