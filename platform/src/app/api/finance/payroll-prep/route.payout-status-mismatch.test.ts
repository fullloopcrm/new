import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * GET /api/finance/payroll-prep only credited a team_member_payouts row to
 * paid_out_cents when its `status` was 'paid', 'succeeded', or 'completed'.
 * No real write path ever stamps those values: webhooks/stripe/route.ts and
 * payment-processor.ts both write status='transferred' for an automated
 * Stripe Connect payout, and admin/bookings/[id]/cleaner-payout/route.ts
 * writes the payout METHOD ('zelle'/'venmo'/'cashapp'/'cash'/'other') for a
 * manual payout. Every payout row ever recorded was silently excluded, so
 * balance_owed_cents permanently overstated what a contractor was still
 * owed by the full amount already paid out to them. Fixed to count every
 * payout row unconditionally, matching finance/summary's own unfiltered sum.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [{ id: 'tm-1', tenant_id: TENANT, name: 'Bob', active: true }]

const bookings: Row[] = [
  { id: 'bk-1', tenant_id: TENANT, team_member_id: 'tm-1', status: 'completed', start_time: '2026-03-05T10:00:00Z', team_member_pay: 40000, actual_hours: 4 },
]

const payouts: Row[] = [
  // Automated Stripe Connect transfer — real status value used in production.
  { tenant_id: TENANT, team_member_id: 'tm-1', amount_cents: 25000, status: 'transferred', created_at: '2026-03-06T10:00:00Z' },
  // Manual Zelle payout — status holds the payment method, not a completion state.
  { tenant_id: TENANT, team_member_id: 'tm-1', amount_cents: 15000, status: 'zelle', created_at: '2026-03-07T10:00:00Z' },
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
        const source = table === 'team_members' ? teamMembers : table === 'bookings' ? bookings : table === 'team_member_payouts' ? payouts : []
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

describe('GET /api/finance/payroll-prep — real payout statuses must count toward paid_out_cents', () => {
  it('credits a Stripe Connect "transferred" payout to paid_out_cents', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    expect(bob.paid_out_cents).toBe(40000) // 250 (transferred) + 150 (zelle)
  })

  it('does not leave a paid-out contractor showing a balance still owed', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    expect(bob.gross_pay_cents).toBe(40000)
    expect(bob.balance_owed_cents).toBe(0)
  })
})
