/**
 * Characterization tests for platform-reports.ts — zero coverage before this
 * file despite backing the platform admin Finance page's cross-tenant P&L,
 * monthly trend, and ledger-integrity health check.
 *
 * The harness doesn't do real PostgREST embedding (`journal_entries!inner(...)`,
 * `chart_of_accounts!inner(...)`), so journal_lines rows are seeded with those
 * relations already attached as plain nested objects — the harness returns
 * whatever was seeded verbatim, which is exactly what a real embedded-select
 * response looks like on the wire. That lets these tests exercise the real
 * accounting math (income=credit-positive, expense=debit-positive, cogs vs
 * opex by subtype) without needing a real Postgres join.
 *
 * Locks in:
 *   - isTestTenant matches a "SIM " prefix (case-insensitive), nothing else
 *   - income revenue = credit - debit; expense amount = debit - credit
 *   - expense.subtype='cogs' goes to cogs_cents, everything else to opex_cents
 *     and is bucketed into expense_by_category by chart_of_accounts.name
 *   - gross_profit = revenue - cogs; net_profit = gross_profit - opex
 *   - margin_bps = round(net/revenue * 10000), and is 0 when revenue is 0
 *     (never a divide-by-zero NaN)
 *   - SIM-prefixed tenants are excluded by default from platformProfitAndLoss
 *   - platformLedgerIntegrity reads unposted/future-dated counts + most recent entry
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('../supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { isTestTenant, platformProfitAndLoss, platformLedgerIntegrity } from './platform-reports'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ tenants: [], journal_lines: [], journal_entries: [] })
  holder.from = h.from
})

describe('isTestTenant', () => {
  it.each([
    ['SIM Demo Co', true],
    ['sim lowercase co', true],
    ['SIMulated LLC (no trailing space after SIM)', false],
    ['Acme Cleaning', false],
    ['', false],
  ])('%s => %s', (name, expected) => {
    expect(isTestTenant(name)).toBe(expected)
  })
})

function line(tenantId: string, opts: { debit?: number; credit?: number; type: string; subtype?: string | null; name: string; date: string }) {
  return {
    tenant_id: tenantId,
    debit_cents: opts.debit ?? 0,
    credit_cents: opts.credit ?? 0,
    // The real query filters on `journal_entries.entry_date` (a dotted
    // embedded-relation path) via `.gte`/`.lte`. The harness's filter
    // matcher does a flat `row[col]` lookup, not real relation traversal, so
    // the dotted key is also set at the top level purely so the date-range
    // filter has something to match against — `journal_entries.entry_date`
    // (nested) is what the source code actually reads out of the row.
    'journal_entries.entry_date': opts.date,
    journal_entries: { entry_date: opts.date },
    chart_of_accounts: { type: opts.type, subtype: opts.subtype ?? null, name: opts.name },
  }
}

describe('platformProfitAndLoss — accounting math', () => {
  it('income revenue = credit - debit', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.journal_lines.push(line('t-1', { credit: 10000, debit: 1000, type: 'income', name: 'Revenue', date: '2026-07-15' }))
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.revenue_cents).toBe(9000)
  })

  it('expense subtype=cogs goes to cogs_cents; other expense goes to opex_cents + expense_by_category', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.journal_lines.push(
      line('t-1', { debit: 3000, type: 'expense', subtype: 'cogs', name: 'Supplies', date: '2026-07-15' }),
      line('t-1', { debit: 2000, type: 'expense', subtype: 'opex', name: 'Rent', date: '2026-07-15' }),
    )
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.cogs_cents).toBe(3000)
    expect(result.opex_cents).toBe(2000)
    expect(result.expense_by_category).toEqual([{ category: 'Rent', amount_cents: 2000 }])
  })

  it('gross_profit = revenue - cogs; net_profit = gross_profit - opex; margin_bps rounds net/revenue', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.journal_lines.push(
      line('t-1', { credit: 10000, type: 'income', name: 'Revenue', date: '2026-07-15' }),
      line('t-1', { debit: 2000, type: 'expense', subtype: 'cogs', name: 'Supplies', date: '2026-07-15' }),
      line('t-1', { debit: 3000, type: 'expense', subtype: 'opex', name: 'Rent', date: '2026-07-15' }),
    )
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.gross_profit_cents).toBe(8000) // 10000 - 2000
    expect(result.net_profit_cents).toBe(5000) // 8000 - 3000
    expect(result.margin_bps).toBe(5000) // 5000/10000 * 10000
  })

  it('margin_bps is 0 (not NaN/Infinity) when revenue is 0', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.journal_lines.push(line('t-1', { debit: 500, type: 'expense', subtype: 'opex', name: 'Rent', date: '2026-07-15' }))
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.margin_bps).toBe(0)
    expect(Number.isFinite(result.margin_bps)).toBe(true)
  })

  it('excludes a "SIM " tenant by default; includeTest:true brings it back', async () => {
    h.seed.tenants.push({ id: 't-real', name: 'Acme' }, { id: 't-sim', name: 'SIM Demo' })
    h.seed.journal_lines.push(
      line('t-real', { credit: 1000, type: 'income', name: 'Revenue', date: '2026-07-15' }),
      line('t-sim', { credit: 9000, type: 'income', name: 'Revenue', date: '2026-07-15' }),
    )
    const excluded = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(excluded.revenue_cents).toBe(1000)
    const included = await platformProfitAndLoss('2026-07-01', '2026-07-31', { includeTest: true })
    expect(included.revenue_cents).toBe(10000)
  })

  it('by_tenant is sorted by revenue_cents descending', async () => {
    h.seed.tenants.push({ id: 't-a', name: 'Alpha' }, { id: 't-b', name: 'Beta' })
    h.seed.journal_lines.push(
      line('t-a', { credit: 1000, type: 'income', name: 'Revenue', date: '2026-07-15' }),
      line('t-b', { credit: 9000, type: 'income', name: 'Revenue', date: '2026-07-15' }),
    )
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.by_tenant.map((t) => t.tenant_id)).toEqual(['t-b', 't-a'])
  })

  it('a line with no matching chart_of_accounts embed is skipped, not thrown', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.journal_lines.push({ tenant_id: 't-1', debit_cents: 0, credit_cents: 1000, journal_entries: { entry_date: '2026-07-15' }, chart_of_accounts: null })
    const result = await platformProfitAndLoss('2026-07-01', '2026-07-31')
    expect(result.revenue_cents).toBe(0)
  })
})

describe('platformLedgerIntegrity', () => {
  // NOTE: the harness's `.order()` is a documented no-op (it doesn't actually
  // sort — see tenant-isolation-harness.ts), so `mostRecentEntryAt`'s real
  // `.order('created_at', {ascending:false}).limit(1)` can't be exercised
  // end-to-end here. Rows are seeded already in "most recent first" order to
  // stand in for what a real ORDER BY would hand back, so this still pins
  // the field-selection/shape contract even though it can't prove sorting.
  it('reports unposted count, future-dated count, and most recent entry timestamp', async () => {
    h.seed.journal_entries.push(
      { id: 'e3', posted: true, entry_date: '2026-07-10', created_at: '2026-07-25T00:00:00Z' },
      { id: 'e2', posted: true, entry_date: '2099-01-01', created_at: '2026-07-20T00:00:00Z' },
      { id: 'e1', posted: false, entry_date: '2026-07-01', created_at: '2026-07-01T00:00:00Z' },
    )
    const result = await platformLedgerIntegrity()
    expect(result.unpostedCount).toBe(1)
    expect(result.futureDatedCount).toBe(1)
    expect(result.mostRecentEntryAt).toBe('2026-07-25T00:00:00Z')
  })

  it('reads zero counts and a null timestamp on an empty ledger', async () => {
    const result = await platformLedgerIntegrity()
    expect(result).toEqual({ unpostedCount: 0, futureDatedCount: 0, mostRecentEntryAt: null })
  })
})
