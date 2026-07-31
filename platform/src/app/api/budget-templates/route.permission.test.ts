import { describe, it, expect, vi } from 'vitest'

/**
 * /api/budget-templates was gated by 'sales.view'/'sales.edit' instead of a
 * finance permission, even though templates carry cost/pricing line items
 * used for job costing. Proves the fix: finance.*, not sales.*.
 */

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(async (..._args: unknown[]) => ({
    tenant: { tenantId: 'tenant-A' },
    error: null,
  })),
}))

vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))
vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 't1' }, error: null }) }) }),
    }),
  }),
}))

import { GET, POST } from './route'

describe('budget-templates permission gate — finance, not sales', () => {
  it('GET checks finance.view', async () => {
    await GET()
    expect(h.requirePermission).toHaveBeenCalledWith('finance.view')
  })

  it('POST checks finance.expenses', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Standard' }) }))
    expect(h.requirePermission).toHaveBeenCalledWith('finance.expenses')
  })

  it('never calls requirePermission with a sales.* permission', async () => {
    h.requirePermission.mockClear()
    await GET()
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Standard' }) }))
    for (const call of h.requirePermission.mock.calls) {
      expect(String(call[0])).not.toMatch(/^sales\./)
    }
  })
})
