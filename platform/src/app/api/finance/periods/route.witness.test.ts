/**
 * POST /api/finance/periods — cross-tenant entity_id FK-injection.
 *
 * entity_id was upserted verbatim from the request body with no tenant check.
 * entities carries its own tenant_id, and the on-conflict key (tenant_id,
 * entity_id, year, month) means a foreign id also opens a distinct period
 * row -- GET embeds entities(name), so a foreign entity's identity would
 * surface back to the caller's tenant. Fixed by verifying entity_id belongs
 * to the caller's tenant before upsert (404 on miss).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    accounting_periods: [],
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

describe('POST /api/finance/periods — cross-tenant entity_id FK-injection guard', () => {
  it('LOCK: rejects a foreign entity_id (404), no accounting_periods row created', async () => {
    const res = await POST(postReq({ year: 2026, month: 6, entity_id: 'ent-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('accounting_periods').length).toBe(0)
  })

  it('CONTROL: omitting entity_id upserts with a null entity_id', async () => {
    const res = await POST(postReq({ year: 2026, month: 6 }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.period.entity_id).toBeNull()
  })

  it('CONTROL: explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ year: 2026, month: 6, entity_id: 'ent-A' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.period.entity_id).toBe('ent-A')
  })
})
