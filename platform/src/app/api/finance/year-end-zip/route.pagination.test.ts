import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

/**
 * GET /api/finance/year-end-zip — row-count regression + wrong-tenant probe.
 *
 * FIXED: invoices/expenses/contractor-payouts queries had no `.range()`, so
 * any tenant with more rows than the project's PostgREST default max-rows
 * cap would get a SILENTLY truncated year-end package (no error, missing
 * invoice/expense/payout lines) while `trial_balance.csv` and
 * `general_ledger.csv` (already paginated via `buildTrialBalance` /
 * `buildGeneralLedger`) looked complete — an inconsistent, hard-to-notice
 * failure for a CPA-facing document. `paginateAll` now pages every query.
 *
 * The shared tenant-isolation-harness doesn't model the real max-rows cap
 * (it only slices when `.range()` is chained), so it can't catch this
 * regression. This test uses its own minimal fake that DOES simulate the
 * cap — un-ranged queries get capped, ranged queries are honored exactly —
 * so it would have failed against the pre-fix code.
 *
 * LOCK: seeds more invoices than the cap and asserts every invoice appears
 * in invoices.csv inside the zip.
 * WRONG-TENANT PROBE: a foreign tenant's invoice in the same window must not
 * appear in the export.
 */

const A = 'tid-a'
const B = 'tid-b'
const CAP = 1000 // stand-in for the project's PostgREST default max-rows

type Row = Record<string, unknown>

const holder = vi.hoisted(() => {
  const state: Record<string, Row[]> = { invoices: [], expenses: [], team_member_payouts: [], journal_lines: [] }

  function cappedTable(rows: Row[]) {
    let filtered = rows
    let ranged: [number, number] | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filtered = filtered.filter(r => r[col] === val); return chain },
      gte: (col: string, val: unknown) => { filtered = filtered.filter(r => (r[col] as string) >= (val as string)); return chain },
      lte: (col: string, val: unknown) => { filtered = filtered.filter(r => (r[col] as string) <= (val as string)); return chain },
      in: (col: string, vals: unknown[]) => { filtered = filtered.filter(r => vals.includes(r[col])); return chain },
      order: () => chain,
      limit: () => chain,
      range: (from: number, to: number) => { ranged = [from, to]; return chain },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
        const page = ranged ? filtered.slice(ranged[0], ranged[1] + 1) : filtered.slice(0, 1000)
        return Promise.resolve({ data: page, error: null }).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  function from(table: string) {
    return cappedTable(state[table] || [])
  }

  return { state, from }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: holder.from } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

function makeInvoices(tenantId: string, count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    tenant_id: tenantId,
    invoice_number: `${prefix}-INV-${i}`,
    issued_at: '2026-03-01',
    due_date: '2026-03-15',
    total_cents: 10000,
    amount_paid_cents: 0,
    status: 'sent',
    contact_name: 'Client',
    contact_email: 'client@example.com',
  }))
}

beforeEach(() => {
  holder.state.invoices = []
  holder.state.expenses = []
  holder.state.team_member_payouts = []
  holder.state.journal_lines = []
})

async function invoiceLines(res: Response): Promise<string[]> {
  const buf = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)
  const csv = await zip.file('invoices.csv')!.async('string')
  return csv.split('\n').filter(l => l.includes('-INV-'))
}

describe('finance/year-end-zip GET — pagination + tenant isolation', () => {
  it(`does not truncate the package past the ${CAP}-row PostgREST cap`, async () => {
    holder.state.invoices = [...makeInvoices(A, 1500, 'a'), ...makeInvoices(B, 5, 'b')]
    const res = await GET(new Request('http://t/api/finance/year-end-zip?year=2026'))
    expect(res.status).toBe(200)
    const lines = await invoiceLines(res)
    expect(lines).toHaveLength(1500)
  })

  it("excludes the other tenant's invoices from the package", async () => {
    holder.state.invoices = [...makeInvoices(A, 5, 'a'), ...makeInvoices(B, 5, 'b')]
    const res = await GET(new Request('http://t/api/finance/year-end-zip?year=2026'))
    const lines = await invoiceLines(res)
    expect(lines.some(l => l.includes('b-INV-'))).toBe(false)
  })
})
