import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/payroll used to sum check_in_time/check_out_time hours
 * for EVERY 'completed' booking, with no exclusion for bookings already
 * settled out-of-band via bookings.team_member_paid (the flag set by
 * POST /api/admin/bookings/[id]/cleaner-payout when an admin records a
 * manual Zelle/Venmo/cash/other payout). So a booking manually paid out
 * still showed up in pending_pay here, and running payroll for that
 * "pending" amount paid the team member a second time for the same hours.
 * Every other reader of bookings for "still owed to the team member"
 * (finance/pending/route.ts) already excludes team_member_paid rows the
 * same way — this brings payroll/route.ts's GET in line with that pattern.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [{ id: 'tm-1', tenant_id: TENANT, name: 'Alice', pay_rate: 20, status: 'active' }]

const bookings: Row[] = [
  {
    id: 'bk-unpaid',
    tenant_id: TENANT,
    team_member_id: 'tm-1',
    status: 'completed',
    team_member_paid: false,
    check_in_time: '2026-07-01T10:00:00Z',
    check_out_time: '2026-07-01T12:00:00Z', // 2h
    pay_rate: 20,
  },
  {
    id: 'bk-manually-paid',
    tenant_id: TENANT,
    team_member_id: 'tm-1',
    status: 'completed',
    team_member_paid: true, // already Zelle'd via cleaner-payout
    check_in_time: '2026-07-02T10:00:00Z',
    check_out_time: '2026-07-02T13:00:00Z', // 3h
    pay_rate: 20,
  },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; val: unknown }> = []
    const orClauses: string[] = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, val: vals }); return c },
      or: (clause: string) => { orClauses.push(clause); return c },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'team_members' ? teamMembers : table === 'bookings' ? bookings : []
        let rows = source.filter((row) =>
          filters.every((f) => (Array.isArray(f.val) ? f.val.includes(row[f.col]) : row[f.col] === f.val)),
        )
        // Emulate the exact OR clause payroll/route.ts sends: rows are kept
        // if team_member_paid is null/missing OR explicitly false.
        if (orClauses.some((cl) => cl.includes('team_member_paid'))) {
          rows = rows.filter((row) => row.team_member_paid == null || row.team_member_paid === false)
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabase: client, supabaseAdmin: client }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'

describe('GET /api/finance/payroll — excludes already-paid bookings from pending pay', () => {
  it('does not double-count a booking already settled via manual cleaner-payout', async () => {
    const res = await GET()
    const json = await res.json()
    const alice = json.payroll.find((p: Row) => p.id === 'tm-1')
    // Only the 2h unpaid booking should count. If bk-manually-paid (3h,
    // team_member_paid: true) leaked in, this would be 5h / $100.
    expect(alice.pending_hours).toBe(2)
    expect(alice.pending_pay).toBe(40)
    expect(alice.jobs).toBe(1)
  })
})
