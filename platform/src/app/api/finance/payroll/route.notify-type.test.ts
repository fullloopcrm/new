import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fresh ground (same declared-but-never-fired class as items (63)/(66)/
 * (67)/(68), first applied to finance): notify.ts's own NotificationType
 * union has declared 'payroll_paid' since notify.ts's beginning, and the
 * admin docs' own "Notification Types" reference lists it as supported —
 * but no call site ever fired it. Recording a payroll payment posted to the
 * ledger and marked bookings paid with zero trace in the admin's in-app
 * notifications feed.
 */

const TENANT = 'tenant-A'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/finance/post-labor', () => ({
  postPayrollToLedger: async () => ({ posted: true }),
}))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'tm-1' }, error: null }) }) }) }) }
      }
      if (table === 'payroll_payments') {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => ({ data: { id: 'payroll-1', ...row }, error: null }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return { update: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }) }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { POST } from './route'

function jsonReq(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  notifyMock.mockClear()
})

describe('POST /api/finance/payroll — payroll_paid notification', () => {
  it('fires notify(payroll_paid) with the tenant, amount, and method after recording a payment', async () => {
    const res = await POST(jsonReq({ team_member_id: 'tm-1', amount: 250.5, method: 'direct_deposit', period_start: '2026-07-01', period_end: '2026-07-15' }))
    expect(res.status).toBe(201)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      type: 'payroll_paid',
      tenantId: TENANT,
      recipientType: 'admin',
    })
    expect((notifyMock.mock.calls[0][0] as { message: string }).message).toContain('250.50')
  })
})
