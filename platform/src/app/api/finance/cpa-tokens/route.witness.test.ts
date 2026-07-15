/**
 * POST /api/finance/cpa-tokens — cross-tenant entity_id FK-injection regression.
 *
 * The route inserted body.entity_id verbatim into cpa_access_tokens with no
 * tenant-ownership check, same class as the already-fixed bank-accounts/
 * expenses/periods entity_id leaks. A foreign entity_id would mint a
 * CPA-access token against another tenant's accounting entity, and GET
 * /api/finance/cpa-tokens embeds entities(name) unscoped, surfacing the
 * foreign entity's name back to the attacker's tenant. Fixed by verifying
 * entity_id belongs to the caller's tenant before insert (404 on miss),
 * matching the bank-accounts pattern.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    cpa_access_tokens: [],
    entities: [
      { id: 'ent-A', tenant_id: TENANT_A, name: 'A-Entity' },
      { id: 'ent-B', tenant_id: TENANT_B, name: 'B-Entity' },
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

describe('POST /api/finance/cpa-tokens — cross-tenant entity_id FK-injection guard', () => {
  it('LOCK: rejects a foreign entity_id (404), no cpa_access_tokens row created', async () => {
    const res = await POST(postReq({ entity_id: 'ent-B', cpa_name: 'Attacker CPA' }))

    expect(res.status).toBe(404)
    expect(fake._all('cpa_access_tokens').length).toBe(0)
  })

  it('CONTROL: omitting entity_id stamps a null entity_id (safe path)', async () => {
    const res = await POST(postReq({ cpa_name: 'Our CPA' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.token.tenant_id).toBe(TENANT_A)
    expect(json.token.entity_id).toBeNull()
  })

  it('CONTROL: explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ entity_id: 'ent-A', cpa_name: 'Our CPA' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.token.tenant_id).toBe(TENANT_A)
    expect(json.token.entity_id).toBe('ent-A')
  })
})
