import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/payroll used to always compute pending_pay as
 * hours × rate, ignoring bookings.team_member_pay — the flat per-job cents
 * amount that team-portal/earnings and payroll-prep already treat as the
 * source of truth for flat-fee/per-unit comp (dumpster, junk removal,
 * moving labor). A per-job worker with no check-in/check-out on a job (or a
 * flat rate that differs from hours × rate) showed $0 or the wrong amount
 * pending here. This brings payroll/route.ts's GET in line with that model.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [{ id: 'tm-1', tenant_id: TENANT, name: 'Bob', pay_rate: 20, status: 'active' }]

const bookings: Row[] = [
  {
    id: 'bk-flat-no-checkin',
    tenant_id: TENANT,
    team_member_id: 'tm-1',
    status: 'completed',
    team_member_paid: false,
    check_in_time: null,
    check_out_time: null,
    pay_rate: 20,
    team_member_pay: 15000, // $150 flat, no check-in/out recorded
  },
  {
    id: 'bk-flat-overrides-hours',
    tenant_id: TENANT,
    team_member_id: 'tm-1',
    status: 'completed',
    team_member_paid: false,
    check_in_time: '2026-07-01T10:00:00Z',
    check_out_time: '2026-07-01T12:00:00Z', // 2h, would be $40 at $20/hr
    pay_rate: 20,
    team_member_pay: 20000, // $200 flat wins over hours × rate
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

describe('GET /api/finance/payroll — flat per-job pay (bookings.team_member_pay)', () => {
  it('counts flat pay even with no check-in/check-out recorded', async () => {
    const res = await GET()
    const json = await res.json()
    const bob = json.payroll.find((p: Row) => p.id === 'tm-1')
    // $150 (no hours) + $200 (flat overrides the 2h × $20 = $40 hourly calc) = $350.
    // Pre-fix this would have been $40 (only the hourly booking counted).
    expect(bob.pending_pay).toBe(350)
    expect(bob.pending_hours).toBe(2) // hours still tracked/displayed from the one booking with check-in/out
    expect(bob.jobs).toBe(2)
  })
})
