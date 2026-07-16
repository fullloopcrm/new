import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/finance/payroll used to insert a payroll_payments row (and post
 * it to the ledger) BEFORE flipping the team member's completed bookings to
 * 'paid' — and never checked the outcome of that later update. The bookings
 * flip is naturally idempotent (its own `eq('status','completed')` filter
 * excludes rows already paid), but nothing stopped a double-click on "Run
 * Payroll" or a retried request from inserting a SECOND payroll_payments row
 * + a second ledger post for the exact same completed-but-unpaid work —
 * duplicating a real wage payment. Fixed by claiming the bookings FIRST
 * (atomic conditional UPDATE) and only recording the payment if this call
 * actually won the claim.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-1' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const { postPayrollToLedger } = vi.hoisted(() => ({ postPayrollToLedger: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayrollToLedger }))

const bookings: Record<string, { id: string; tenant_id: string; team_member_id: string; status: string }> = {
  'bk-1': { id: 'bk-1', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed' },
  'bk-2': { id: 'bk-2', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed' },
}

let payrollInsertCalls: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'bookings') {
      return {
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            select: () => {
              const matches = Object.values(bookings).filter((b) =>
                Object.entries(eqs).every(([k, v]) => (b as Record<string, unknown>)[k] === v),
              )
              const claimed = matches.map((b) => {
                b.status = payload.status as string
                return { id: b.id }
              })
              return Promise.resolve({ data: claimed, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'payroll_payments') {
      return {
        insert: (payload: Record<string, unknown>) => {
          payrollInsertCalls.push(payload)
          return {
            select: () => ({
              single: async () => ({ data: { id: `pp-${payrollInsertCalls.length}`, ...payload }, error: null }),
            }),
          }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/finance/payroll', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/finance/payroll — double-submit race', () => {
  beforeEach(() => {
    payrollInsertCalls = []
    bookings['bk-1'].status = 'completed'
    bookings['bk-2'].status = 'completed'
    postPayrollToLedger.mockClear()
  })

  it('records payroll and flips completed bookings to paid', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.payment).toBeTruthy()
    expect(payrollInsertCalls).toHaveLength(1)
    expect(bookings['bk-1'].status).toBe('paid')
    expect(bookings['bk-2'].status).toBe('paid')
  })

  it('rejects a second run for a team member with no outstanding completed bookings', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' }))
    expect(res.status).toBe(201)

    const res2 = await POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' }))
    const json2 = await res2.json()
    expect(res2.status).toBe(409)
    expect(json2.error).toMatch(/no pending/i)
    expect(payrollInsertCalls).toHaveLength(1)
  })

  it('does not record a duplicate payroll payment when two runs race for the same team member', async () => {
    const [r1, r2] = await Promise.all([
      POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' })),
      POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' })),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([201, 409])
    expect(payrollInsertCalls).toHaveLength(1)
    expect(postPayrollToLedger).toHaveBeenCalledTimes(1)
  })
})
