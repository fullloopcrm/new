import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * GET /api/finance/year-end-zip's contractor_payouts.csv (the accountant's
 * year-end 1099 summary) only included a team_member_payouts row when its
 * `status` was 'paid', 'succeeded', or 'completed'. No real write path ever
 * stamps those values -- every payout row is inserted only after the money
 * already moved and stamps `status` with the MECHANISM ('transferred' for
 * Stripe Connect, or the payout method 'zelle'/'venmo'/'cashapp'/'cash'/
 * 'other' for a manual payout). The allow-list matched none of them, so
 * every real contractor payout was silently dropped from the accountant's
 * year-end package. Same bug as payroll-prep/route.ts, fixed the same way:
 * count every payout row in the window unconditionally.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const payouts: Row[] = [
  { tenant_id: TENANT, created_at: '2026-03-06T10:00:00Z', amount_cents: 25000, status: 'transferred', team_members: { name: 'Bob' } },
  { tenant_id: TENANT, created_at: '2026-03-07T10:00:00Z', amount_cents: 15000, status: 'zelle', team_members: { name: 'Bob' } },
]

const zipFiles = new Map<string, string>()

vi.mock('jszip', () => {
  return {
    default: class JSZip {
      file(name: string, content: string) {
        zipFiles.set(name, content)
      }
      async generateAsync() {
        return new ArrayBuffer(0)
      }
    },
  }
})

vi.mock('@/lib/finance-export', () => ({
  toCsv: (rows: Row[]) => rows.map(r => Object.values(r).join(',')).join('\n'),
  buildTrialBalance: async () => [],
  buildGeneralLedger: async () => [],
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'team_member_payouts' ? payouts : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
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
vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
}))

import { GET } from './route'

describe('GET /api/finance/year-end-zip — real payout statuses must appear in contractor_payouts.csv', () => {
  it('includes both a Stripe "transferred" payout and a manual "zelle" payout', async () => {
    await GET(new Request('https://app.fullloop.example/api/finance/year-end-zip?year=2026'))
    const csv = zipFiles.get('contractor_payouts.csv') || ''
    expect(csv).toContain('250.00')
    expect(csv).toContain('150.00')
  })
})
