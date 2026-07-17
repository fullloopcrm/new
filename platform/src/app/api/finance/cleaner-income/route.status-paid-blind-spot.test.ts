import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET /api/finance/cleaner-income (the cleaner-facing "how much have I
 * earned / been paid" report) filtered bookings.status='completed' only.
 * POST /api/finance/payroll (bulk payroll) flips a booking's `status`
 * straight to 'paid' once claimed, but never sets `team_member_paid`. So a
 * bulk-paid booking used to vanish from this report entirely the instant
 * payroll ran on it -- a cleaner's own pay history going dark, or (if the
 * status filter were naively widened without also fixing the paid/unpaid
 * split) showing up as still UNPAID even though it was already paid.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Bulk-paid via payroll: status='paid', team_member_paid never set.
  { id: 'bk-bulk-paid', tenant_id: TENANT, status: 'paid', team_member_id: 'tm-1', team_member_pay: 8000, team_member_paid: false, actual_hours: 4, start_time: '2026-06-01T10:00:00Z', clients: { name: 'Alice' }, team_members: { name: 'Cleo' } },
  // Manually paid via cleaner-payout: status stays 'completed', team_member_paid=true.
  { id: 'bk-manual-paid', tenant_id: TENANT, status: 'completed', team_member_id: 'tm-1', team_member_pay: 6000, team_member_paid: true, actual_hours: 3, start_time: '2026-06-02T10:00:00Z', clients: { name: 'Bob' }, team_members: { name: 'Cleo' } },
  // Still genuinely unpaid.
  { id: 'bk-pending', tenant_id: TENANT, status: 'completed', team_member_id: 'tm-1', team_member_pay: 4000, team_member_paid: false, actual_hours: 2, start_time: '2026-06-03T10:00:00Z', clients: { name: 'Cara' }, team_members: { name: 'Cleo' } },
]

vi.mock('@/lib/supabase', () => {
  function chain() {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      not: (col: string, _op: string, val: unknown) => { filters.push({ col, op: 'not-is', val }); return c },
      gte: () => c,
      lte: () => c,
      order: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const rows = bookings.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'not-is') return rowVal !== f.val
            return true
          }),
        )
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

describe('GET /api/finance/cleaner-income — status=paid (bulk payroll) vs team_member_paid', () => {
  it('includes the bulk-paid booking in the report', async () => {
    const res = await GET(new NextRequest('https://app.fullloop.example/api/finance/cleaner-income'))
    const json = await res.json()
    const ids = json.bookings.map((b: Row) => b.id)
    expect(ids).toContain('bk-bulk-paid')
  })

  it('marks the bulk-paid booking as paid, not unpaid', async () => {
    const res = await GET(new NextRequest('https://app.fullloop.example/api/finance/cleaner-income'))
    const json = await res.json()
    const row = json.bookings.find((b: Row) => b.id === 'bk-bulk-paid')
    expect(row.paid).toBe(true)
  })

  it('rolls the bulk-paid booking into paidTotal, not unpaidTotal', async () => {
    const res = await GET(new NextRequest('https://app.fullloop.example/api/finance/cleaner-income'))
    const json = await res.json()
    const summary = json.cleanerSummaries.find((s: Row) => s.team_member_id === 'tm-1')
    expect(summary.paidTotal).toBe(14000) // bulk-paid (8000) + manual-paid (6000)
    expect(summary.unpaidTotal).toBe(4000) // pending only
  })

  it('?paid_status=unpaid excludes the bulk-paid booking', async () => {
    const res = await GET(new NextRequest('https://app.fullloop.example/api/finance/cleaner-income?paid_status=unpaid'))
    const json = await res.json()
    const ids = json.bookings.map((b: Row) => b.id)
    expect(ids).not.toContain('bk-bulk-paid')
    expect(ids).toContain('bk-pending')
  })
})
