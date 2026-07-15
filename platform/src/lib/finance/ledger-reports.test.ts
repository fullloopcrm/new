import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Ledger-sourced financial reports — the keystone that makes the double-entry
 * ledger the reporting source of truth. 5 routes depend on these three
 * functions (pnl, balance-sheet, trial-balance, revenue, summary) and every
 * existing route test mocks this module away, so the actual arithmetic
 * (revenue/cogs/opex classification, balance-sheet sign flips + balanced
 * check, trial-balance sums, cross-tenant filtering, >1000-row pagination)
 * has never been exercised. This suite drives the real functions against an
 * in-memory Postgrest-like query builder.
 */

type JournalLineRow = {
  tenant_id: string
  debit_cents: number
  credit_cents: number
  journal_entries: { entry_date: string; entity_id: string | null }
  chart_of_accounts: { type: string; subtype: string | null; code: string; name: string }
}

let rows: JournalLineRow[]

function matches(row: JournalLineRow, filters: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(filters)) {
    if (key === 'tenant_id') {
      if (row.tenant_id !== val) return false
    } else if (key === 'journal_entries.entry_date__gte') {
      if (row.journal_entries.entry_date < (val as string)) return false
    } else if (key === 'journal_entries.entry_date__lte') {
      if (row.journal_entries.entry_date > (val as string)) return false
    } else if (key === 'journal_entries.entity_id') {
      if (row.journal_entries.entity_id !== val) return false
    }
  }
  return true
}

// Mimics Postgrest's PostgrestFilterBuilder: every filter method returns the
// same chain object (so callers can reassign `q = q.gte(...)` after `.range()`
// was already applied — that's the exact call order in streamLedgerLines),
// and the chain itself is thenable so a bare `await q` triggers execution.
function journalLinesBuilder() {
  const filters: Record<string, unknown> = {}
  let rangeArgs: [number, number] | null = null
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { filters[col] = val; return chain },
    gte: (col: string, val: unknown) => { filters[`${col}__gte`] = val; return chain },
    lte: (col: string, val: unknown) => { filters[`${col}__lte`] = val; return chain },
    range: (start: number, end: number) => { rangeArgs = [start, end]; return chain },
    then: (resolve: (v: { data: JournalLineRow[]; error: null }) => void) => {
      let out = rows.filter(r => matches(r, filters))
      if (rangeArgs) out = out.slice(rangeArgs[0], rangeArgs[1] + 1)
      resolve({ data: out, error: null })
    },
  }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'journal_lines') return journalLinesBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { ledgerProfitAndLoss, ledgerBalanceSheet, ledgerTrialBalance } from './ledger-reports'

const TENANT_A = 'tenant_A'
const TENANT_B = 'tenant_B'

function line(
  tenant: string,
  entryDate: string,
  coa: { type: string; subtype?: string | null; code: string; name: string },
  amounts: { debit?: number; credit?: number },
  entityId: string | null = null,
): JournalLineRow {
  return {
    tenant_id: tenant,
    debit_cents: amounts.debit ?? 0,
    credit_cents: amounts.credit ?? 0,
    journal_entries: { entry_date: entryDate, entity_id: entityId },
    chart_of_accounts: { type: coa.type, subtype: coa.subtype ?? null, code: coa.code, name: coa.name },
  }
}

beforeEach(() => {
  rows = []
})

describe('ledgerProfitAndLoss', () => {
  it('classifies income (credit-positive) and expense (debit-positive), splitting cogs vs opex by subtype', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Service Revenue' }, { credit: 100000 }),
      line(TENANT_A, '2026-07-05', { type: 'expense', subtype: 'cogs', code: '5000', name: 'Cleaner Payroll' }, { debit: 40000 }),
      line(TENANT_A, '2026-07-05', { type: 'expense', subtype: null, code: '6000', name: 'Software' }, { debit: 15000 }),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.revenue_cents).toBe(100000)
    expect(pnl.cost_of_service_cents).toBe(40000)
    expect(pnl.gross_profit_cents).toBe(60000)
    expect(pnl.expenses_total_cents).toBe(15000)
    expect(pnl.net_profit_cents).toBe(45000)
  })

  it('nets debit/credit on the same account (e.g. a revenue refund credit-reversal)', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Service Revenue' }, { credit: 100000 }),
      line(TENANT_A, '2026-07-06', { type: 'income', code: '4000', name: 'Service Revenue' }, { debit: 20000 }),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.revenue_cents).toBe(80000)
  })

  it('aggregates expense_by_category across duplicate account codes and sorts descending by amount', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'expense', code: '6100', name: 'Supplies' }, { debit: 5000 }),
      line(TENANT_A, '2026-07-06', { type: 'expense', code: '6100', name: 'Supplies' }, { debit: 3000 }),
      line(TENANT_A, '2026-07-06', { type: 'expense', code: '6200', name: 'Insurance' }, { debit: 12000 }),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.expense_by_category).toEqual([
      { category: 'Insurance', amount_cents: 12000 },
      { category: 'Supplies', amount_cents: 8000 },
    ])
  })

  it('excludes lines outside the [from, to] window', async () => {
    rows = [
      line(TENANT_A, '2026-06-30', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 50000 }),
      line(TENANT_A, '2026-07-15', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 70000 }),
      line(TENANT_A, '2026-08-01', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 90000 }),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.revenue_cents).toBe(70000)
  })

  it('entityId filter narrows to one entity under a multi-entity tenant', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 40000 }, 'entity_1'),
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 90000 }, 'entity_2'),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31', 'entity_1')
    expect(pnl.revenue_cents).toBe(40000)
  })

  it('wrong-tenant probe: never mixes another tenant\'s lines into the total', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 40000 }),
      line(TENANT_B, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 999999 }),
    ]
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.revenue_cents).toBe(40000)
  })

  it('paginates past the 1000-row page size without truncating', async () => {
    rows = Array.from({ length: 1500 }, () =>
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 100 }),
    )
    const pnl = await ledgerProfitAndLoss(TENANT_A, '2026-07-01', '2026-07-31')
    expect(pnl.revenue_cents).toBe(150000)
  })
})

describe('ledgerBalanceSheet', () => {
  it('classifies assets debit-positive and liabilities/equity credit-positive (sign-flipped)', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 200000 }),
      line(TENANT_A, '2026-06-01', { type: 'liability', code: '2000', name: 'Payable' }, { credit: 50000 }),
      line(TENANT_A, '2026-06-01', { type: 'equity', code: '3000', name: 'Owner Equity' }, { credit: 150000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.assets).toEqual([{ code: '1000', name: 'Cash', balance_cents: 200000 }])
    expect(bs.liabilities).toEqual([{ code: '2000', name: 'Payable', balance_cents: 50000 }])
    expect(bs.equity).toEqual([{ code: '3000', name: 'Owner Equity', balance_cents: 150000 }])
    expect(bs.balanced).toBe(true)
  })

  it('folds current-period net income into equity and flags unbalanced books', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 100000 }),
      line(TENANT_A, '2026-06-01', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 100000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.net_income_cents).toBe(100000)
    expect(bs.total_assets_cents).toBe(100000)
    expect(bs.total_equity_cents).toBe(100000)
    expect(bs.balanced).toBe(true)
  })

  it('flags balanced=false when assets do not equal liabilities+equity', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 500000 }),
      line(TENANT_A, '2026-06-01', { type: 'liability', code: '2000', name: 'Payable' }, { credit: 50000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.balanced).toBe(false)
  })

  it('excludes zero-balance accounts from the report', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 5000 }),
      line(TENANT_A, '2026-06-02', { type: 'asset', code: '1000', name: 'Cash' }, { credit: 5000 }),
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1100', name: 'Bank' }, { debit: 3000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.assets).toEqual([{ code: '1100', name: 'Bank', balance_cents: 3000 }])
  })

  it('only counts lines up to the as-of date (excludes future-dated entries)', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 10000 }),
      line(TENANT_A, '2026-08-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 500000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.assets).toEqual([{ code: '1000', name: 'Cash', balance_cents: 10000 }])
  })

  it('wrong-tenant probe: another tenant\'s balances never leak into totals', async () => {
    rows = [
      line(TENANT_A, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 10000 }),
      line(TENANT_B, '2026-06-01', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 9000000 }),
    ]
    const bs = await ledgerBalanceSheet(TENANT_A, '2026-07-31')
    expect(bs.total_assets_cents).toBe(10000)
  })
})

describe('ledgerTrialBalance', () => {
  it('sums debits and credits per account and reports balanced when equal', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 50000 }),
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 50000 }),
    ]
    const tb = await ledgerTrialBalance(TENANT_A, '2026-07-01', '2026-07-31')
    expect(tb.rows).toEqual([
      { code: '1000', name: 'Cash', debit_cents: 50000, credit_cents: 0 },
      { code: '4000', name: 'Revenue', debit_cents: 0, credit_cents: 50000 },
    ])
    expect(tb.total_debits_cents).toBe(50000)
    expect(tb.total_credits_cents).toBe(50000)
    expect(tb.balanced).toBe(true)
  })

  it('flags balanced=false when total debits and credits diverge', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 70000 }),
      line(TENANT_A, '2026-07-05', { type: 'income', code: '4000', name: 'Revenue' }, { credit: 50000 }),
    ]
    const tb = await ledgerTrialBalance(TENANT_A, '2026-07-01', '2026-07-31')
    expect(tb.balanced).toBe(false)
  })

  it('excludes accounts with no debit or credit activity at all, and sorts remaining rows by account code', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '2000', name: 'Untouched' }, {}),
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 500 }),
    ]
    const tb = await ledgerTrialBalance(TENANT_A, '2026-07-01', '2026-07-31')
    expect(tb.rows.map(r => r.code)).toEqual(['1000'])
  })

  it('shows gross debit AND credit on an account with offsetting activity (does not net to zero and disappear)', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '2000', name: 'Clearing' }, { debit: 100 }),
      line(TENANT_A, '2026-07-06', { type: 'asset', code: '2000', name: 'Clearing' }, { credit: 100 }),
    ]
    const tb = await ledgerTrialBalance(TENANT_A, '2026-07-01', '2026-07-31')
    expect(tb.rows).toEqual([{ code: '2000', name: 'Clearing', debit_cents: 100, credit_cents: 100 }])
  })

  it('wrong-tenant probe: another tenant\'s debits/credits never mix into this tenant\'s account rows or totals', async () => {
    rows = [
      line(TENANT_A, '2026-07-05', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 500 }),
      line(TENANT_B, '2026-07-05', { type: 'asset', code: '1000', name: 'Cash' }, { debit: 9000000 }),
    ]
    const tb = await ledgerTrialBalance(TENANT_A, '2026-07-01', '2026-07-31')
    expect(tb.rows).toEqual([{ code: '1000', name: 'Cash', debit_cents: 500, credit_cents: 0 }])
    expect(tb.total_debits_cents).toBe(500)
  })
})
