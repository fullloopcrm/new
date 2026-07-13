/**
 * Ledger-sourced financial reports (O13 sweep, per LEADER order —
 * ledger-reports.ts / reconcile.ts / smart-schedule.ts). ledgerProfitAndLoss /
 * ledgerBalanceSheet / ledgerTrialBalance are the keystone that makes the
 * double-entry ledger the tenant's source of truth for P&L, balance sheet, and
 * trial balance — read by /api/finance/{pnl,balance-sheet,trial-balance,revenue,
 * summary}. Zero direct tests before this file.
 *
 * Run against the REAL ledger-reports.ts with a minimal in-memory Supabase fake
 * written for this file's query shape: `journal_lines` rows joined to
 * `journal_entries!inner(entry_date, entity_id)` and
 * `chart_of_accounts!inner(type, subtype, code, name)`, filtered by dot-path
 * columns (`journal_entries.entry_date`) exactly as the real .gte/.lte calls
 * target the joined table. The shared fakes (supabase-fake.ts,
 * ledger-supabase-fake.ts) don't model joined-column dot-path filters or real
 * .range() pagination, so this file gets its own — same "real .range()"
 * requirement as reconcile.test.ts, since ledgerProfitAndLoss carries its own
 * independent pagination loop (not routed through streamLedgerLines).
 *
 * Pinned:
 *   - P&L: revenue = credit − debit on income; cogs vs opex split by
 *     chart_of_accounts.subtype==='cogs'; expense_by_category aggregates by
 *     name and sorts descending; gross = revenue − cogs; net = gross − opex
 *   - P&L period window: entry_date outside [from, to] is excluded
 *   - P&L entityId filter narrows to one entity's lines
 *   - P&L pagination past PAGE=1000 rows sums correctly (no-op .range() would hang)
 *   - Balance sheet: assets net debit-positive; liabilities/equity net
 *     credit-positive (sign-flipped); zero-balance accounts are dropped;
 *     net income (income − expense) folds into equity; `balanced` checks
 *     assets === liabilities + equity; rows sorted by code
 *   - Balance sheet as_of is a `to`-only filter (no lower bound — cumulative since inception)
 *   - Trial balance: per-account Σdebit/Σcredit over the period, zero rows
 *     dropped, `balanced` when total debits === total credits
 *   - Tenant isolation on all three reports
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ store: {} as Record<string, Array<Record<string, unknown>>> }))

type Filters = {
  eqs: Record<string, unknown>
  gtes: Array<{ col: string; val: unknown }>
  ltes: Array<{ col: string; val: unknown }>
}

function getPath(row: Record<string, unknown>, path: string): unknown {
  let cur: unknown = row
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function rowMatches(row: Record<string, unknown>, f: Filters): boolean {
  if (!Object.entries(f.eqs).every(([k, v]) => getPath(row, k) === v)) return false
  for (const g of f.gtes) if (!(String(getPath(row, g.col)) >= String(g.val))) return false
  for (const l of f.ltes) if (!(String(getPath(row, l.col)) <= String(l.val))) return false
  return true
}

function makeReportsFake(getStore: () => Record<string, Array<Record<string, unknown>>>) {
  return {
    from(table: string) {
      const f: Filters = { eqs: {}, gtes: [], ltes: [] }
      let range: [number, number] | null = null
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => { f.eqs[col] = val; return chain },
        gte: (col: string, val: unknown) => { f.gtes.push({ col, val }); return chain },
        lte: (col: string, val: unknown) => { f.ltes.push({ col, val }); return chain },
        range: (from: number, to: number) => { range = [from, to]; return chain },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          let rows = (getStore()[table] || []).filter((r) => rowMatches(r, f))
          if (range) rows = rows.slice(range[0], range[1] + 1)
          return Promise.resolve({ data: rows, error: null }).then(res, rej)
        },
      }
      return chain
    },
  }
}

vi.mock('../supabase', () => ({ supabaseAdmin: makeReportsFake(() => h.store) }))

import { ledgerProfitAndLoss, ledgerBalanceSheet, ledgerTrialBalance } from './ledger-reports'

const A = 'tenant-A'
const B = 'tenant-B'

function seedLine(
  tenantId: string,
  opts: {
    debit?: number
    credit?: number
    entryDate: string
    entityId?: string | null
    type: string
    subtype?: string | null
    code: string
    name: string
  },
) {
  ;(h.store.journal_lines ||= []).push({
    tenant_id: tenantId,
    debit_cents: opts.debit ?? 0,
    credit_cents: opts.credit ?? 0,
    journal_entries: { entry_date: opts.entryDate, entity_id: opts.entityId ?? null },
    chart_of_accounts: { type: opts.type, subtype: opts.subtype ?? null, code: opts.code, name: opts.name },
  })
}

beforeEach(() => {
  h.store = { journal_lines: [] }
})

describe('ledgerProfitAndLoss', () => {
  it('revenue = credit − debit on income accounts', async () => {
    seedLine(A, { credit: 10000, entryDate: '2026-07-05', type: 'income', code: '4000', name: 'Service Revenue' })
    seedLine(A, { debit: 500, entryDate: '2026-07-06', type: 'income', code: '4000', name: 'Service Revenue' }) // e.g. a refund line against income
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31')
    expect(r.revenue_cents).toBe(9500)
  })

  it('splits expense into cogs vs opex by subtype, and aggregates expense_by_category sorted descending', async () => {
    seedLine(A, { credit: 20000, entryDate: '2026-07-05', type: 'income', code: '4000', name: 'Service Revenue' })
    seedLine(A, { debit: 3000, entryDate: '2026-07-05', type: 'expense', subtype: 'cogs', code: '5000', name: 'Contractor Pay' })
    seedLine(A, { debit: 1000, entryDate: '2026-07-06', type: 'expense', subtype: 'operating', code: '6000', name: 'Rent' })
    seedLine(A, { debit: 2000, entryDate: '2026-07-07', type: 'expense', subtype: 'operating', code: '6030', name: 'Software' })
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31')
    expect(r.cost_of_service_cents).toBe(3000)
    expect(r.expenses_total_cents).toBe(3000) // opex only: rent + software
    expect(r.gross_profit_cents).toBe(17000) // 20000 - 3000
    expect(r.net_profit_cents).toBe(14000) // 17000 - 3000
    // expense_by_category aggregates every expense line (cogs AND opex), not just opex.
    expect(r.expense_by_category).toEqual([
      { category: 'Contractor Pay', amount_cents: 3000 },
      { category: 'Software', amount_cents: 2000 },
      { category: 'Rent', amount_cents: 1000 },
    ])
  })

  it('excludes entries outside the [from, to] period window', async () => {
    seedLine(A, { credit: 5000, entryDate: '2026-06-30', type: 'income', code: '4000', name: 'Service Revenue' }) // before window
    seedLine(A, { credit: 7000, entryDate: '2026-07-15', type: 'income', code: '4000', name: 'Service Revenue' }) // in window
    seedLine(A, { credit: 9000, entryDate: '2026-08-01', type: 'income', code: '4000', name: 'Service Revenue' }) // after window
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31')
    expect(r.revenue_cents).toBe(7000)
  })

  it('narrows to one entity when entityId is passed', async () => {
    seedLine(A, { credit: 1000, entryDate: '2026-07-05', entityId: 'ent-1', type: 'income', code: '4000', name: 'Service Revenue' })
    seedLine(A, { credit: 5000, entryDate: '2026-07-05', entityId: 'ent-2', type: 'income', code: '4000', name: 'Service Revenue' })
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31', 'ent-1')
    expect(r.revenue_cents).toBe(1000)
  })

  it('paginates past PAGE=1000 rows and sums correctly (no-op .range() would hang)', async () => {
    for (let i = 0; i < 1500; i++) {
      seedLine(A, { credit: 100, entryDate: '2026-07-10', type: 'income', code: '4000', name: 'Service Revenue' })
    }
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31')
    expect(r.revenue_cents).toBe(150000)
  }, 10000)

  it('never mixes another tenant\'s lines into the P&L', async () => {
    seedLine(A, { credit: 1000, entryDate: '2026-07-05', type: 'income', code: '4000', name: 'Service Revenue' })
    seedLine(B, { credit: 99999, entryDate: '2026-07-05', type: 'income', code: '4000', name: 'Service Revenue' })
    const r = await ledgerProfitAndLoss(A, '2026-07-01', '2026-07-31')
    expect(r.revenue_cents).toBe(1000)
  })
})

describe('ledgerBalanceSheet', () => {
  it('nets assets debit-positive and liabilities/equity credit-positive (sign-flipped), balances, and folds net income into equity', async () => {
    // Cash in (DR 1000 asset) funded by revenue (CR 4000 income) -> net income folds into equity.
    seedLine(A, { debit: 8000, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(A, { credit: 8000, entryDate: '2026-07-01', type: 'income', code: '4000', name: 'Service Revenue' })
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.assets).toEqual([{ code: '1000', name: 'Cash', balance_cents: 8000 }])
    expect(r.net_income_cents).toBe(8000)
    expect(r.total_equity_cents).toBe(8000)
    expect(r.total_assets_cents).toBe(8000)
    expect(r.total_liabilities_cents).toBe(0)
    expect(r.balanced).toBe(true)
  })

  it('drops zero-balance accounts', async () => {
    seedLine(A, { debit: 500, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(A, { credit: 500, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' }) // nets to zero
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.assets).toEqual([])
  })

  it('sorts assets/liabilities/equity rows by account code', async () => {
    seedLine(A, { debit: 100, entryDate: '2026-07-01', type: 'asset', code: '1500', name: 'Equipment' })
    seedLine(A, { debit: 200, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' })
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.assets.map((a) => a.code)).toEqual(['1000', '1500'])
  })

  it('as_of applies only an upper bound (cumulative since inception, no lower bound)', async () => {
    seedLine(A, { debit: 100, entryDate: '2020-01-01', type: 'asset', code: '1000', name: 'Cash' }) // years before as_of
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.total_assets_cents).toBe(100)
  })

  it('excludes entries after as_of', async () => {
    seedLine(A, { debit: 100, entryDate: '2026-08-01', type: 'asset', code: '1000', name: 'Cash' })
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.total_assets_cents).toBe(0)
  })

  it('never mixes another tenant\'s lines into the balance sheet', async () => {
    seedLine(A, { debit: 100, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(B, { debit: 99999, entryDate: '2026-07-01', type: 'asset', code: '1000', name: 'Cash' })
    const r = await ledgerBalanceSheet(A, '2026-07-31')
    expect(r.total_assets_cents).toBe(100)
  })
})

describe('ledgerTrialBalance', () => {
  it('accumulates Σdebit/Σcredit per account over the period and reports balanced when equal', async () => {
    seedLine(A, { debit: 5000, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(A, { credit: 5000, entryDate: '2026-07-05', type: 'income', code: '4000', name: 'Service Revenue' })
    const r = await ledgerTrialBalance(A, '2026-07-01', '2026-07-31')
    expect(r.rows).toEqual([
      { code: '1000', name: 'Cash', debit_cents: 5000, credit_cents: 0 },
      { code: '4000', name: 'Service Revenue', debit_cents: 0, credit_cents: 5000 },
    ])
    expect(r.total_debits_cents).toBe(5000)
    expect(r.total_credits_cents).toBe(5000)
    expect(r.balanced).toBe(true)
  })

  it('keeps an account whose debit and credit sums net to zero (still real activity)', async () => {
    seedLine(A, { debit: 5000, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(A, { debit: 100, entryDate: '2026-07-05', type: 'asset', code: '1500', name: 'Equipment' })
    seedLine(A, { credit: 100, entryDate: '2026-07-05', type: 'asset', code: '1500', name: 'Equipment' }) // sums net to zero, but both sides had real activity
    const r = await ledgerTrialBalance(A, '2026-07-01', '2026-07-31')
    expect(r.rows.find((x) => x.code === '1500')).toEqual({ code: '1500', name: 'Equipment', debit_cents: 100, credit_cents: 100 })
  })

  it('drops an account with a zero-amount line touching it (no debit, no credit)', async () => {
    seedLine(A, { debit: 5000, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(A, { debit: 0, credit: 0, entryDate: '2026-07-05', type: 'asset', code: '1500', name: 'Equipment' })
    const r = await ledgerTrialBalance(A, '2026-07-01', '2026-07-31')
    expect(r.rows.find((x) => x.code === '1500')).toBeUndefined()
  })

  it('flags unbalanced when total debits != total credits', async () => {
    seedLine(A, { debit: 5000, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    const r = await ledgerTrialBalance(A, '2026-07-01', '2026-07-31')
    expect(r.balanced).toBe(false)
  })

  it('never mixes another tenant\'s lines into the trial balance', async () => {
    seedLine(A, { debit: 100, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    seedLine(B, { debit: 99999, entryDate: '2026-07-05', type: 'asset', code: '1000', name: 'Cash' })
    const r = await ledgerTrialBalance(A, '2026-07-01', '2026-07-31')
    expect(r.rows.find((x) => x.code === '1000')?.debit_cents).toBe(100)
  })
})
