import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/pending only queried bookings.status='completed', but a
 * booking already flipped to status='paid' by POST /api/finance/payroll
 * (bulk payroll) means the TEAM MEMBER got paid -- it says nothing about
 * whether the CLIENT paid (payment_status). The route's own `or` clause
 * exists specifically to surface "client still owes" independent of
 * team-pay state, but the outer status filter silently dropped every
 * bulk-payroll-paid booking before that `or` ever got a chance to run.
 * Same root cause fixed this session in ar-aging/route.ts and
 * payroll-prep/route.ts.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Team paid via bulk payroll (status='paid'), client still owes.
  { id: 'bk-team-paid-client-owes', tenant_id: TENANT, status: 'paid', price: 20000, team_member_pay: 8000, payment_status: 'unpaid', team_member_paid: false, start_time: '2026-06-01T10:00:00Z', clients: { name: 'Alice' } },
  // Fully settled both sides -- correctly excluded.
  { id: 'bk-fully-settled', tenant_id: TENANT, status: 'paid', price: 15000, team_member_pay: 6000, payment_status: 'paid', team_member_paid: true, start_time: '2026-06-02T10:00:00Z', clients: { name: 'Bob' } },
]

vi.mock('@/lib/supabase', () => {
  function chain() {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    let orClause: string | null = null
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      or: (clause: string) => { orClause = clause; return c },
      order: () => c,
      limit: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        let rows = bookings.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            return true
          }),
        )
        if (orClause) {
          rows = rows.filter((row) => row.payment_status !== 'paid' || row.team_member_paid == null || row.team_member_paid === false)
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: () => chain() }
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

describe('GET /api/finance/pending — status/payment_status are independent', () => {
  it('still surfaces a booking whose team pay is settled but the client still owes money', async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.map((r: Row) => r.id)
    expect(ids).toContain('bk-team-paid-client-owes')
    expect(ids).not.toContain('bk-fully-settled')
  })
})
