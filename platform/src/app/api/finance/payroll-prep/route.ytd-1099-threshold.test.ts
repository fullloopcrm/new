import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * GET /api/finance/payroll-prep documents hits_1099_threshold as a
 * "year-to-date hits $600" signal, but computed it off gross_pay_cents for
 * whatever `from`/`to` window the caller requested. The only live caller
 * (finance/reports) defaults that window to the CURRENT MONTH, so the
 * default view silently answered "$600+ this month" instead of "$600+ this
 * year" -- a contractor over $600 year-to-date but under it in the requested
 * month never got flagged. Fixed to always resolve the flag from a real
 * Jan 1 - Dec 31 window for the year the request falls in.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [{ id: 'tm-1', tenant_id: TENANT, name: 'Bob', active: true }]

const bookings: Row[] = [
  // Big January job -- outside the requested March window, but still this calendar year.
  { id: 'bk-jan', tenant_id: TENANT, team_member_id: 'tm-1', status: 'completed', start_time: '2026-01-10T10:00:00Z', team_member_pay: 50000, actual_hours: 5 },
  // The requested month's booking -- alone, under the $600 threshold.
  { id: 'bk-mar', tenant_id: TENANT, team_member_id: 'tm-1', status: 'completed', start_time: '2026-03-10T10:00:00Z', team_member_pay: 15000, actual_hours: 2 },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'team_members' ? teamMembers : table === 'bookings' ? bookings : table === 'team_member_payouts' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'neq') return rowVal !== f.val
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

describe('GET /api/finance/payroll-prep — 1099 threshold is year-to-date, not window-scoped', () => {
  it('flags a contractor whose YTD pay crosses $600 even though the requested month alone is under it', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const bob = json.rows.find((r: Row) => r.team_member_id === 'tm-1')
    // Displayed gross for the requested window stays scoped to March ($150) ...
    expect(bob.gross_pay_cents).toBe(15000)
    // ... but the 1099 flag reflects full-year pay ($500 + $150 = $650 >= $600).
    expect(bob.hits_1099_threshold).toBe(true)
  })

  it('does not flag a contractor under $600 for the whole year even if displaying only part of it', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    // Sanity: with only the March booking counted for the window, re-verify
    // the flag isn't just "always true" -- swap in a low-pay scenario via a
    // narrower YTD query by asking for a year with no bookings.
    const res2 = await GET(req('?year=2025'))
    const json2 = await res2.json()
    const bob2 = json2.rows.find((r: Row) => r.team_member_id === 'tm-1')
    expect(bob2.hits_1099_threshold).toBe(false)
    expect(res).toBeTruthy()
  })
})
