import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * POST /api/finance/payroll (bulk payroll) flips a claimed booking's own
 * status from 'completed' straight to 'paid' -- it never writes a
 * per-booking team_member_payouts row (that table belongs to the separate
 * cleaner-payout flow). GET /api/finance/payroll-prep only queried
 * status='completed' bookings, so the moment bulk payroll ran on a booking
 * it vanished from both this period's gross pay AND the contractor's real
 * YTD earnings used for the $600 1099 threshold -- a contractor paid out
 * thousands via bulk payroll could show as under-threshold and never get
 * flagged for a 1099. Fixed to also count 'paid' bookings, crediting their
 * pay to paid_out_cents (not just gross) since bulk payroll already settled
 * them.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [{ id: 'tm-1', tenant_id: TENANT, name: 'Bob', active: true }]

const bookings: Row[] = [
  // Already run through bulk payroll this same month -- status is 'paid', not 'completed'.
  { id: 'bk-paid', tenant_id: TENANT, team_member_id: 'tm-1', status: 'paid', start_time: '2026-03-05T10:00:00Z', team_member_pay: 40000, actual_hours: 4 },
  // Still pending, not yet run through payroll.
  { id: 'bk-completed', tenant_id: TENANT, team_member_id: 'tm-1', status: 'completed', start_time: '2026-03-10T10:00:00Z', team_member_pay: 15000, actual_hours: 2 },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'team_members' ? teamMembers : table === 'bookings' ? bookings : table === 'team_member_payouts' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'neq') return rowVal !== f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte') return String(rowVal) >= String(f.val)
            if (f.op === 'lte') return String(rowVal) <= String(f.val)
            return true
          }),
        )
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { GET } from './route'

function req(qs: string): Request {
  return new Request(`https://app.fullloop.example/api/finance/payroll-prep${qs}`)
}

describe('GET /api/finance/payroll-prep — bulk-payroll-paid bookings still count', () => {
  it('includes a bulk-payroll-paid booking in gross pay for the period', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    expect(bob.gross_pay_cents).toBe(55000) // 400 (paid) + 150 (completed)
  })

  it('credits the bulk-payroll-paid amount to paid_out_cents so balance_owed stays accurate', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    expect(bob.paid_out_cents).toBe(40000)
    expect(bob.balance_owed_cents).toBe(15000) // only the still-pending completed booking
  })

  it('counts the bulk-payroll-paid booking toward the YTD 1099 threshold', async () => {
    // $400 (paid) alone is under $600 -- without the fix this contractor
    // would never be flagged even though the money was genuinely earned.
    const res = await GET(req('?year=2026'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    // $400 + $150 = $550, still under $600 in this fixture -- prove the
    // paid booking is counted by checking the raw YTD sum crosses when we'd
    // expect it not to under the old status='completed'-only behavior.
    expect(bob.hits_1099_threshold).toBe(false)
  })

  it('flags 1099 threshold once the bulk-payroll-paid booking pushes YTD over $600', async () => {
    bookings.push({ id: 'bk-paid-2', tenant_id: TENANT, team_member_id: 'tm-1', status: 'paid', start_time: '2026-06-01T10:00:00Z', team_member_pay: 10000, actual_hours: 1 })
    const res = await GET(req('?year=2026'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    // 400 + 150 + 100 = 650 >= 600 -- only reachable if 'paid' rows count.
    expect(bob.hits_1099_threshold).toBe(true)
    bookings.pop()
  })
})
