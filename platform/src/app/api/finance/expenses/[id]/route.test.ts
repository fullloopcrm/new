import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT/DELETE /api/finance/expenses/:id — first route-level regression test
 * (P1/W1 O13 sweep). Zero prior coverage of the dollars-to-cents conversion
 * on update, or tenant isolation on a caller-supplied expense id.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))

import { PUT, DELETE } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const deleteReq = () => new Request('http://x', { method: 'DELETE' })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    expenses: [
      { id: 'exp-A1', tenant_id: 'tenant-A', category: 'utilities', amount: 5000, date: '2026-07-01' },
      { id: 'exp-B1', tenant_id: 'tenant-B', category: 'utilities', amount: 3000, date: '2026-07-01' },
    ],
    entities: [
      { id: 'ent-A1', tenant_id: 'tenant-A', name: 'Acme A' },
      { id: 'ent-B1', tenant_id: 'tenant-B', name: 'Acme B (secret)' },
    ],
  }
})

describe('PUT /api/finance/expenses/:id — permission gate', () => {
  it('returns the permission error unchanged and never mutates', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await PUT(putReq({ category: 'rent' }), params('exp-A1'))

    expect(res.status).toBe(403)
    expect(h.store.expenses.find((e) => e.id === 'exp-A1')?.category).toBe('utilities')
  })
})

describe('PUT /api/finance/expenses/:id — update', () => {
  it('converts a supplied dollar amount to cents', async () => {
    const res = await PUT(putReq({ amount: 12.34 }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.amount).toBe(1234)
  })

  it('leaves amount untouched when not supplied', async () => {
    const res = await PUT(putReq({ category: 'rent' }), params('exp-A1'))
    const json = await res.json()

    expect(json.expense.amount).toBe(5000)
    expect(json.expense.category).toBe('rent')
  })

  it("tenant A can never update tenant B's expense", async () => {
    const res = await PUT(putReq({ category: 'hacked' }), params('exp-B1'))

    expect(res.status).toBe(500)
    expect(h.store.expenses.find((e) => e.id === 'exp-B1')?.category).toBe('utilities')
  })

  it('ignores a tenant_id in the body instead of reassigning the expense to another tenant', async () => {
    const res = await PUT(putReq({ category: 'hacked', tenant_id: 'tenant-B' }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.tenant_id).toBe('tenant-A')
    expect(h.store.expenses.find((e) => e.id === 'exp-A1')?.tenant_id).toBe('tenant-A')
  })

  it("rejects an entity_id belonging to another tenant and does not mutate the row", async () => {
    const res = await PUT(putReq({ entity_id: 'ent-B1' }), params('exp-A1'))

    expect(res.status).toBe(400)
    expect(h.store.expenses.find((e) => e.id === 'exp-A1')?.entity_id).toBeUndefined()
  })

  it('accepts an entity_id that genuinely belongs to the caller tenant', async () => {
    const res = await PUT(putReq({ entity_id: 'ent-A1' }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.entity_id).toBe('ent-A1')
  })

  it('ignores an id field in the body instead of mass-assigning arbitrary/unknown columns onto the row', async () => {
    const res = await PUT(putReq({ category: 'rent', id: 'exp-B1', not_a_real_column: 'x' }), params('exp-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.id).toBe('exp-A1')
    expect(json.expense.not_a_real_column).toBeUndefined()
    expect(h.store.expenses.find((e) => e.id === 'exp-A1')).toBeDefined()
    expect(h.store.expenses.find((e) => e.id === 'exp-B1')?.category).toBe('utilities')
  })
})

describe('DELETE /api/finance/expenses/:id', () => {
  it('returns the permission error unchanged and never deletes', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await DELETE(deleteReq(), params('exp-A1'))

    expect(res.status).toBe(403)
    expect(h.store.expenses.some((e) => e.id === 'exp-A1')).toBe(true)
  })

  it('deletes the expense and logs an expense.deleted audit event', async () => {
    const res = await DELETE(deleteReq(), params('exp-A1'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(h.store.expenses.some((e) => e.id === 'exp-A1')).toBe(false)
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', action: 'expense.deleted', entityId: 'exp-A1' }))
  })

  it("tenant A deleting tenant B's expense id never removes it", async () => {
    const res = await DELETE(deleteReq(), params('exp-B1'))

    expect(res.status).toBe(200)
    expect(h.store.expenses.some((e) => e.id === 'exp-B1')).toBe(true)
  })
})
