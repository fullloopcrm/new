import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * GET /api/finance/payroll's "pending pay" list already excludes bookings
 * already settled out-of-band via team_member_paid (a manual Zelle/cash
 * payout recorded via POST /api/admin/bookings/[id]/cleaner-payout) -- see
 * route.double-payout.test.ts. But POST's actual bookings claim (the query
 * that flips status and decides what payroll_payments records) never
 * applied that same exclusion, only `eq('status', 'completed')`.
 * cleaner-payout never touches a booking's `status` column, so a manually
 * paid booking stayed 'completed' and fully re-claimable: run payroll for
 * that team member/period and the already-paid booking gets flipped to
 * 'paid' and its amount recorded a SECOND time in payroll_payments -- a real
 * double payment reachable through completely normal, sequential staff
 * action (pay via Zelle first, run payroll for the period later), not a
 * race. Fixed by mirroring GET's `.or('team_member_paid.is.null,
 * team_member_paid.eq.false')` onto the POST claim query.
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
  team_member_paid: boolean | null
  team_member_pay: number
}

const bookings: Record<string, BookingRow> = {
  // Already Zelle'd out-of-band via cleaner-payout -- status stays
  // 'completed' (cleaner-payout never touches it), but team_member_paid is
  // true.
  'bk-manually-paid': { id: 'bk-manually-paid', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', team_member_paid: true, team_member_pay: 5000 },
  // Genuinely still owed.
  'bk-unpaid': { id: 'bk-unpaid', tenant_id: 'tenant-1', team_member_id: 'tm-1', status: 'completed', team_member_paid: false, team_member_pay: 3000 },
}

let payrollInsertCalls: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'bookings') {
      return {
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let excludeTeamMemberPaid = false
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            or: (clause: string) => {
              if (clause.includes('team_member_paid')) excludeTeamMemberPaid = true
              return chain
            },
            select: () => {
              const matches = Object.values(bookings).filter((b) => {
                if (!Object.entries(eqs).every(([k, v]) => (b as Record<string, unknown>)[k] === v)) return false
                if (excludeTeamMemberPaid && b.team_member_paid === true) return false
                return true
              })
              const claimed = matches.map((b) => {
                b.status = payload.status as string
                return { id: b.id, check_in_time: null, check_out_time: null, pay_rate: null, team_member_pay: b.team_member_pay }
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

describe('POST /api/finance/payroll — claim excludes bookings already paid out-of-band', () => {
  beforeEach(() => {
    payrollInsertCalls = []
    bookings['bk-manually-paid'].status = 'completed'
    bookings['bk-unpaid'].status = 'completed'
    postPayrollToLedger.mockClear()
  })

  it('does not re-claim or re-pay a booking already settled via manual cleaner-payout', async () => {
    const res = await POST(req({ team_member_id: 'tm-1', method: 'zelle' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    // Only the genuinely-unpaid $30 booking should be claimed and recorded.
    expect(json.payment.amount).toBe(3000)
    expect(payrollInsertCalls[0].amount).toBe(3000)
    // The manually-paid booking must NOT flip to 'paid' a second time via
    // this route -- it stays exactly as cleaner-payout left it.
    expect(bookings['bk-manually-paid'].status).toBe('completed')
    expect(bookings['bk-unpaid'].status).toBe('paid')
  })

  it('rejects the run entirely when every completed booking was already paid out-of-band', async () => {
    bookings['bk-unpaid'].team_member_paid = true
    const res = await POST(req({ team_member_id: 'tm-1', method: 'zelle' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/no pending/i)
    expect(payrollInsertCalls).toHaveLength(0)
    bookings['bk-unpaid'].team_member_paid = false
  })
})
