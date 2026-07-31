import { describe, it, expect, vi } from 'vitest'

/**
 * /api/vendors was gated by 'bookings.view'/'bookings.edit' instead of a
 * finance permission — a tenant member with booking access but no finance
 * access could view/edit vendor records. Proves the fix: every verb checks
 * a finance.* permission, not a bookings.* one.
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
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'v1' }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'v1' }, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: 'v1' }], error: null }) }) }),
    }),
  }),
}))

import { GET, POST, PATCH, DELETE } from './route'

describe('vendors permission gate — finance, not bookings', () => {
  it('GET checks finance.view', async () => {
    await GET()
    expect(h.requirePermission).toHaveBeenCalledWith('finance.view')
  })

  it('POST checks finance.expenses', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Acme' }) }))
    expect(h.requirePermission).toHaveBeenCalledWith('finance.expenses')
  })

  it('PATCH checks finance.expenses', async () => {
    await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ id: 'v1', name: 'Acme' }) }))
    expect(h.requirePermission).toHaveBeenCalledWith('finance.expenses')
  })

  it('DELETE checks finance.expenses', async () => {
    await DELETE(new Request('http://x?id=v1', { method: 'DELETE' }))
    expect(h.requirePermission).toHaveBeenCalledWith('finance.expenses')
  })

  it('never calls h.requirePermission with a bookings.* permission', async () => {
    h.requirePermission.mockClear()
    await GET()
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Acme' }) }))
    await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ id: 'v1' }) }))
    await DELETE(new Request('http://x?id=v1', { method: 'DELETE' }))
    for (const call of h.requirePermission.mock.calls) {
      expect(String(call[0])).not.toMatch(/^bookings\./)
    }
  })
})
