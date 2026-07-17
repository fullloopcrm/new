import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/finance/payroll's bookings claim had no period scoping — it
 * unconditionally flipped EVERY completed booking for the team member to
 * 'paid', regardless of the period_start/period_end the caller supplied.
 * Paying one small period silently marked unrelated, never-actually-paid
 * bookings from other periods as settled too, permanently dropping them out
 * of payroll-prep's status='completed' gross-pay window even though the crew
 * was never paid for that work. Fixed by scoping the claim to the booking's
 * start_time falling inside period_start/period_end when both are supplied,
 * mirroring payroll-prep's own from/to windowing (gte/lte on start_time).
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

type BookingRow = { id: string; tenant_id: string; team_member_id: string; status: string; start_time: string }

const bookings: Record<string, BookingRow> = {
  // In the July period being paid.
  'bk-july': { id: 'bk-july', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', start_time: '2026-07-10T10:00:00Z' },
  // Completed but from an unrelated, earlier period — must NOT be swept up.
  'bk-june': { id: 'bk-june', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', start_time: '2026-06-05T10:00:00Z' },
}

let payrollInsertCalls: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'bookings') {
      return {
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let gte: { col: string; val: string } | null = null
          let lte: { col: string; val: string } | null = null
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            gte: (col: string, val: string) => {
              gte = { col, val }
              return chain
            },
            lte: (col: string, val: string) => {
              lte = { col, val }
              return chain
            },
            select: () => {
              const matches = Object.values(bookings).filter((b) => {
                if (!Object.entries(eqs).every(([k, v]) => (b as Record<string, unknown>)[k] === v)) return false
                if (gte && ((b as Record<string, unknown>)[gte.col] as string) < gte.val) return false
                if (lte && ((b as Record<string, unknown>)[lte.col] as string) > lte.val) return false
                return true
              })
              const claimed = matches.map((b) => {
                b.status = payload.status as string
                return { id: b.id, check_in_time: null, check_out_time: null, pay_rate: null, team_member_pay: 5000 }
              })
              return Promise.resolve({ data: claimed, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'team_members') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { pay_rate: 20 }, error: null }),
            }),
          }),
        }),
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

describe('POST /api/finance/payroll — period scoping', () => {
  beforeEach(() => {
    payrollInsertCalls = []
    bookings['bk-july'].status = 'completed'
    bookings['bk-june'].status = 'completed'
    postPayrollToLedger.mockClear()
  })

  it('paying a period only claims bookings inside that period, leaves other periods alone', async () => {
    const res = await POST(req({
      team_member_id: 'tm-1',
      amount: 100,
      method: 'zelle',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
    }))
    expect(res.status).toBe(201)
    expect(bookings['bk-july'].status).toBe('paid')
    expect(bookings['bk-june'].status).toBe('completed') // untouched — different period
  })

  it('a no-period call keeps the prior blanket behavior', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', amount: 100, method: 'zelle' }))
    expect(res.status).toBe(201)
    expect(bookings['bk-july'].status).toBe('paid')
    expect(bookings['bk-june'].status).toBe('paid')
  })
})
