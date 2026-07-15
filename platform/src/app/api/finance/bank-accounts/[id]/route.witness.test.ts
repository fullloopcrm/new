/**
 * PATCH /api/finance/bank-accounts/[id] — cross-tenant coa_id FK-injection.
 *
 * coa_id is allow-listed as an assignable column but was never verified to
 * belong to the acting tenant. GET /api/finance/bank-accounts embeds
 * chart_of_accounts(code, name, type) off the row, so a caller could repoint
 * their own bank account at another tenant's GL account and read its name
 * back on the next fetch. Fixed by verifying coa_id ownership before update.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    bank_accounts: [{ id: 'bank-1', tenant_id: TENANT_A, name: 'Ops', coa_id: null }],
    chart_of_accounts: [
      { id: 'coa-A', tenant_id: TENANT_A, code: '1000', name: 'A Cash' },
      { id: 'coa-B', tenant_id: TENANT_B, code: '1000', name: 'B Cash' },
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

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: 'bank-1' })

describe('PATCH /api/finance/bank-accounts/[id] — cross-tenant coa_id guard', () => {
  it('LOCK: rejects a foreign coa_id (404), row left unchanged', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-B' }), { params })
    expect(res.status).toBe(404)
    expect(fake._all('bank_accounts')[0].coa_id).toBeNull()
  })

  it('CONTROL: explicit own-tenant coa_id passes the ownership check', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-A' }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bank_account.coa_id).toBe('coa-A')
  })
})
