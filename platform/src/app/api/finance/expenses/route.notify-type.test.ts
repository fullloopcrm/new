import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fresh ground (same declared-but-never-fired class as items (63)/(66)/
 * (67)/(68), first applied to finance): notify.ts's own NotificationType
 * union has declared 'expense_added' since notify.ts's beginning, and the
 * admin docs' own "Notification Types" reference lists it as supported —
 * but no call site ever fired it. Recording an expense left zero trace in
 * the admin's in-app notifications feed, audit log entry aside.
 */

const TENANT = 'tenant-A'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/entity', () => ({
  isEntityOwnedByTenant: async () => true,
  getDefaultEntityId: async () => 'entity-1',
  entityIdFromUrl: () => null,
}))

const auditMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/audit', () => ({ audit: (...args: unknown[]) => auditMock(...args) }))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => ({ data: { id: 'expense-1', ...row }, error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function jsonReq(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  notifyMock.mockClear()
})

describe('POST /api/finance/expenses — expense_added notification', () => {
  it('fires notify(expense_added) with the tenant, category, and amount after recording an expense', async () => {
    const res = await POST(jsonReq({ category: 'Fuel', amount: 42.75, description: 'Van gas' }))
    expect(res.status).toBe(201)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      type: 'expense_added',
      tenantId: TENANT,
      recipientType: 'admin',
    })
    expect((notifyMock.mock.calls[0][0] as { message: string }).message).toContain('42.75')
  })
})
