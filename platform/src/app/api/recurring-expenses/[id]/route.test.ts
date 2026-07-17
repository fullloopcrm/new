import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH/DELETE /api/recurring-expenses/[id] — first route-level regression
 * test (P1/W1 recurring archetype fresh-ground sweep). Zero prior coverage.
 * PATCH had no enum guard on `frequency` -- same gap as the sibling POST,
 * fixed alongside it.
 */

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

import { PATCH, DELETE } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    recurring_expenses: [
      { id: 'exp-A1', tenant_id: 'tenant-A', label: 'Rent', frequency: 'monthly', active: true },
      { id: 'exp-B1', tenant_id: 'tenant-B', label: 'Rent B', frequency: 'monthly', active: true },
    ],
  }
})

describe('PATCH /api/recurring-expenses/[id] — validation', () => {
  it('rejects an invalid frequency and leaves the row unchanged', async () => {
    const res = await PATCH(patchReq({ frequency: 'annual' }), params('exp-A1'))
    expect(res.status).toBe(400)
    expect(h.store.recurring_expenses.find((e) => e.id === 'exp-A1')?.frequency).toBe('monthly')
  })

  it('accepts a valid frequency change', async () => {
    const res = await PATCH(patchReq({ frequency: 'quarterly' }), params('exp-A1'))
    expect(res.status).toBe(200)
    expect(h.store.recurring_expenses.find((e) => e.id === 'exp-A1')?.frequency).toBe('quarterly')
  })

  it('allows other-field updates that omit frequency entirely', async () => {
    const res = await PATCH(patchReq({ label: 'Rent (updated)' }), params('exp-A1'))
    expect(res.status).toBe(200)
    expect(h.store.recurring_expenses.find((e) => e.id === 'exp-A1')?.label).toBe('Rent (updated)')
  })
})

describe('PATCH/DELETE /api/recurring-expenses/[id] — tenant isolation', () => {
  it("tenant A cannot patch tenant B's recurring expense by guessing its id", async () => {
    const res = await PATCH(patchReq({ label: 'hijacked' }), params('exp-B1'))
    expect(res.status).toBe(500)
    expect(h.store.recurring_expenses.find((e) => e.id === 'exp-B1')?.label).toBe('Rent B')
  })

  it("tenant A cannot delete tenant B's recurring expense by guessing its id", async () => {
    await DELETE(new Request('http://x', { method: 'DELETE' }), params('exp-B1'))
    expect(h.store.recurring_expenses.find((e) => e.id === 'exp-B1')).toBeDefined()
  })
})
