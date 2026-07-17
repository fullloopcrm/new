import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/finance/payroll used to insert whatever `amount` the caller sent
 * in the request body directly into payroll_payments — the number GET
 * displays as pending_pay, computed client-side, but never re-verified
 * server-side against the bookings actually being claimed. That row is what
 * postPayrollToLedger posts to the ledger verbatim (src/lib/finance/
 * post-labor.ts), so anyone holding finance.payroll could submit an
 * arbitrary `amount` — $1 or $100,000 — completely decoupled from the real
 * work recorded on the claimed bookings, and have it land in the books.
 * Fixed by computing the paid amount server-side from the claimed bookings'
 * own team_member_pay / hours×pay_rate, mirroring GET's exact formula, and
 * ignoring whatever `amount` the client sends entirely.
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

type BookingRow = {
  id: string
  tenant_id: string
  team_member_id: string
  status: string
  check_in_time: string | null
  check_out_time: string | null
  pay_rate: number | null
  team_member_pay: number | null
}

const bookings: Record<string, BookingRow> = {
  // Flat per-job pay: $75.00 (7500 cents).
  'bk-flat': { id: 'bk-flat', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', check_in_time: null, check_out_time: null, pay_rate: null, team_member_pay: 7500 },
  // Hourly: 2h at booking's own $20/hr = $40.00.
  'bk-hourly': { id: 'bk-hourly', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T10:00:00Z', check_out_time: '2026-07-01T12:00:00Z', pay_rate: 20, team_member_pay: null },
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
                return {
                  id: b.id,
                  check_in_time: b.check_in_time,
                  check_out_time: b.check_out_time,
                  pay_rate: b.pay_rate,
                  team_member_pay: b.team_member_pay,
                }
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
              // Member's own rate — should only be used as a fallback, never
              // for bk-flat (has team_member_pay) or bk-hourly (has its own pay_rate).
              maybeSingle: async () => ({ data: { pay_rate: 999 }, error: null }),
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

describe('POST /api/finance/payroll — amount is computed server-side, never trusted from the client', () => {
  beforeEach(() => {
    payrollInsertCalls = []
    bookings['bk-flat'].status = 'completed'
    bookings['bk-hourly'].status = 'completed'
    postPayrollToLedger.mockClear()
  })

  it('ignores a wildly spoofed `amount` and records the real computed total instead', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', amount: 999999, method: 'zelle' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    // $75.00 flat + $40.00 (2h × $20/hr) = $115.00 = 11500 cents. NOT the
    // spoofed 99999900 cents the client tried to send.
    expect(json.payment.amount).toBe(11500)
    expect(payrollInsertCalls).toHaveLength(1)
    expect(payrollInsertCalls[0].amount).toBe(11500)
  })

  it('computes the same total even when `amount` is omitted entirely', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', method: 'zelle' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.payment.amount).toBe(11500)
  })
})
