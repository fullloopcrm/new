/**
 * PUT /api/finance/expenses/:id — mass-assignment / tenant-donation +
 * FK-ownership regression.
 *
 * The route used to spread the raw request body straight into `.update(body)`,
 * scoped only by `.eq('id', id).eq('tenant_id', tenantId)` on the WHERE side.
 * Nothing stopped the SET clause from including `tenant_id` (donating the
 * expense row into another tenant's books) or an `entity_id` belonging to a
 * DIFFERENT tenant's accounting entity. Fixed by allow-listing the editable
 * fields via `pick()` and verifying a caller-supplied `entity_id` belongs to
 * the caller's own tenant before the update runs.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    expenses: [
      { id: 'exp-A1', tenant_id: TENANT_A, category: 'supplies', amount: 1000, entity_id: 'ent-A' },
      { id: 'exp-B1', tenant_id: TENANT_B, category: 'supplies', amount: 1000, entity_id: 'ent-B' },
    ],
    entities: [
      { id: 'ent-A', tenant_id: TENANT_A },
      { id: 'ent-B', tenant_id: TENANT_B },
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/finance/expenses/:id — mass-assignment + FK-ownership guard', () => {
  it('updates an allow-listed field on the caller tenant’s own expense', async () => {
    const res = await PUT(putReq({ category: 'travel' }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.category).toBe('travel')
  })

  it('drops a tenant_id in the body instead of donating the expense to another tenant', async () => {
    const res = await PUT(putReq({ category: 'travel', tenant_id: TENANT_B }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.tenant_id).toBe(TENANT_A)
    expect(fake._all('expenses').find((r) => r.id === 'exp-A1')?.tenant_id).toBe(TENANT_A)
  })

  it('rejects a caller-supplied entity_id belonging to a different tenant', async () => {
    const res = await PUT(putReq({ entity_id: 'ent-B' }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Entity not found')
    expect(fake._all('expenses').find((r) => r.id === 'exp-A1')?.entity_id).toBe('ent-A')
  })

  it("tenant A can never update tenant B's expense", async () => {
    const res = await PUT(putReq({ category: 'hacked' }), params('exp-B1'))

    expect(res.status).toBe(500)
    expect(fake._all('expenses').find((r) => r.id === 'exp-B1')?.category).toBe('supplies')
  })
})
