/**
 * POST /api/finance/bank-accounts — cross-tenant entity_id/coa_id FK-injection.
 *
 * entity_id and coa_id were inserted verbatim from the request body with no
 * tenant-ownership check. Both entities and chart_of_accounts carry their own
 * tenant_id, and GET embeds entities(id, name)/chart_of_accounts(code, name,
 * type) off the row -- a foreign id would surface another tenant's identity
 * back on the next read. Fixed by verifying both FKs belong to the caller's
 * tenant before insert (404 on miss).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    bank_accounts: [],
    entities: [
      { id: 'ent-A', tenant_id: TENANT_A, name: 'A-Entity' },
      { id: 'ent-B', tenant_id: TENANT_B, name: 'B-Entity' },
    ],
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
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/finance/bank-accounts — cross-tenant FK-injection guard', () => {
  it('LOCK: rejects a foreign entity_id (404), no bank_accounts row created', async () => {
    const res = await POST(postReq({ name: 'Ops', entity_id: 'ent-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('bank_accounts').length).toBe(0)
  })

  it('LOCK: rejects a foreign coa_id (404), no bank_accounts row created', async () => {
    const res = await POST(postReq({ name: 'Ops', coa_id: 'coa-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('bank_accounts').length).toBe(0)
  })

  it('CONTROL: omitting both FKs succeeds', async () => {
    const res = await POST(postReq({ name: 'Ops' }))
    expect(res.status).toBe(200)
  })

  it('CONTROL: explicit own-tenant entity_id + coa_id pass the ownership checks', async () => {
    const res = await POST(postReq({ name: 'Ops', entity_id: 'ent-A', coa_id: 'coa-A' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bank_account.entity_id).toBe('ent-A')
    expect(json.bank_account.coa_id).toBe('coa-A')
  })
})
