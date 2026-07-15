/**
 * POST /api/finance/expenses — cross-tenant entity_id FK-injection.
 *
 * entity_id was inserted verbatim from the request body with no tenant check.
 * entities carries its own tenant_id, so a foreign id attached tenant A's
 * expense to tenant B's accounting entity -- surfaced back via finance reads
 * that embed entities(name). Fixed by verifying entity_id belongs to the
 * caller's tenant before insert (404 on miss).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    expenses: [],
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

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const base = { category: 'Supplies', amount: 42 }

describe('POST /api/finance/expenses — cross-tenant entity_id FK-injection guard', () => {
  it('LOCK: rejects a foreign entity_id (404), no expenses row created', async () => {
    const res = await POST(postReq({ ...base, entity_id: 'ent-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('expenses').length).toBe(0)
  })

  it('CONTROL: omitting entity_id resolves to the caller\'s own default entity', async () => {
    const res = await POST(postReq(base))
    expect(res.status).toBe(201)
  })

  it('CONTROL: explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ ...base, entity_id: 'ent-A' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.expense.entity_id).toBe('ent-A')
  })
})
