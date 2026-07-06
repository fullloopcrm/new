/**
 * Ledger-sourced financial reports — the keystone that makes the double-entry
 * ledger the single source of truth (instead of recomputing from raw
 * bookings/expenses). Reports read journal_lines ⨝ journal_entries ⨝
 * chart_of_accounts and roll up by account type.
 *
 * Rolled out behind a `?source=ledger` switch first so numbers can be validated
 * against the legacy raw-table reports before the ledger becomes the default.
 *
 * Normal balances: income = credit-positive, expense = debit-positive.
 */
import { supabaseAdmin } from '../supabase'

export interface LedgerPnL {
  period: { from: string; to: string }
  revenue_cents: number
  cost_of_service_cents: number
  gross_profit_cents: number
  expenses_total_cents: number
  net_profit_cents: number
  expense_by_category: { category: string; amount_cents: number }[]
  source: 'ledger'
}

interface LineRow {
  debit_cents: number | null
  credit_cents: number | null
  chart_of_accounts: { type: string; subtype: string | null; code: string; name: string } | null
}

const PAGE = 1000

/**
 * Stream every journal line for a tenant within an optional date window / entity,
 * paginated so the 1000-row cap never truncates. Calls `onRow` per line with its
 * debit/credit and the joined account (type/subtype/code/name).
 */
async function streamLedgerLines(
  tenantId: string,
  opts: { from?: string; to?: string; entityId?: string | null },
  onRow: (debit: number, credit: number, coa: NonNullable<LineRow['chart_of_accounts']>) => void,
): Promise<void> {
  let offset = 0
  for (;;) {
    let q = supabaseAdmin
      .from('journal_lines')
      .select('debit_cents, credit_cents, journal_entries!inner(entry_date, entity_id), chart_of_accounts!inner(type, subtype, code, name)')
      .eq('tenant_id', tenantId)
      .range(offset, offset + PAGE - 1)
    if (opts.from) q = q.gte('journal_entries.entry_date', opts.from)
    if (opts.to) q = q.lte('journal_entries.entry_date', opts.to)
    if (opts.entityId) q = q.eq('journal_entries.entity_id', opts.entityId)

    const { data, error } = await q
    if (error) throw error
    const rows = (data || []) as unknown as LineRow[]
    for (const r of rows) {
      if (!r.chart_of_accounts) continue
      onRow(Number(r.debit_cents) || 0, Number(r.credit_cents) || 0, r.chart_of_accounts)
    }
    if (rows.length < PAGE) break
    offset += PAGE
  }
}

/**
 * Profit & Loss computed from the ledger over [from, to] (by journal entry_date).
 * Paginated so a busy tenant's lines never trip the 1000-row cap.
 */
export async function ledgerProfitAndLoss(
  tenantId: string,
  from: string,
  to: string,
  entityId?: string | null,
): Promise<LedgerPnL> {
  let revenue = 0
  let cogs = 0
  let opex = 0
  const byCategory = new Map<string, number>()

  let offset = 0
  for (;;) {
    let q = supabaseAdmin
      .from('journal_lines')
      .select('debit_cents, credit_cents, journal_entries!inner(entry_date, entity_id), chart_of_accounts!inner(type, subtype, name)')
      .eq('tenant_id', tenantId)
      .gte('journal_entries.entry_date', from)
      .lte('journal_entries.entry_date', to)
      .range(offset, offset + PAGE - 1)
    if (entityId) q = q.eq('journal_entries.entity_id', entityId)

    const { data, error } = await q
    if (error) throw error
    const rows = (data || []) as unknown as LineRow[]

    for (const r of rows) {
      const coa = r.chart_of_accounts
      if (!coa) continue
      const debit = Number(r.debit_cents) || 0
      const credit = Number(r.credit_cents) || 0
      if (coa.type === 'income') {
        revenue += credit - debit
      } else if (coa.type === 'expense') {
        const amt = debit - credit
        if (coa.subtype === 'cogs') cogs += amt
        else opex += amt
        byCategory.set(coa.name, (byCategory.get(coa.name) || 0) + amt)
      }
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  const gross = revenue - cogs
  const net = gross - opex
  return {
    period: { from, to },
    revenue_cents: revenue,
    cost_of_service_cents: cogs,
    gross_profit_cents: gross,
    expenses_total_cents: opex,
    net_profit_cents: net,
    expense_by_category: Array.from(byCategory.entries())
      .map(([category, amount_cents]) => ({ category, amount_cents }))
      .sort((a, b) => b.amount_cents - a.amount_cents),
    source: 'ledger',
  }
}

export interface BalanceSheetLine { code: string; name: string; balance_cents: number }
export interface LedgerBalanceSheet {
  as_of: string
  assets: BalanceSheetLine[]
  liabilities: BalanceSheetLine[]
  equity: BalanceSheetLine[]
  net_income_cents: number
  total_assets_cents: number
  total_liabilities_cents: number
  total_equity_cents: number
  balanced: boolean
  source: 'ledger'
}

/**
 * Balance sheet as of a date. Only the ledger can produce this — it needs
 * double-entry, which the raw booking/expense tables don't have. Current-period
 * net income (income − expense) folds into equity, and assets must equal
 * liabilities + equity (the `balanced` check).
 */
export async function ledgerBalanceSheet(
  tenantId: string,
  asOf: string,
  entityId?: string | null,
): Promise<LedgerBalanceSheet> {
  // Per-account net = Σdebit − Σcredit, plus type/name for classification.
  const net = new Map<string, { code: string; name: string; type: string; amount: number }>()
  await streamLedgerLines(tenantId, { to: asOf, entityId }, (debit, credit, coa) => {
    const key = coa.code
    const cur = net.get(key) || { code: coa.code, name: coa.name, type: coa.type, amount: 0 }
    cur.amount += debit - credit
    net.set(key, cur)
  })

  const assets: BalanceSheetLine[] = []
  const liabilities: BalanceSheetLine[] = []
  const equity: BalanceSheetLine[] = []
  let incomeNet = 0
  let expenseNet = 0

  for (const a of net.values()) {
    if (a.type === 'asset') {
      if (a.amount !== 0) assets.push({ code: a.code, name: a.name, balance_cents: a.amount })
    } else if (a.type === 'liability') {
      if (a.amount !== 0) liabilities.push({ code: a.code, name: a.name, balance_cents: -a.amount })
    } else if (a.type === 'equity') {
      if (a.amount !== 0) equity.push({ code: a.code, name: a.name, balance_cents: -a.amount })
    } else if (a.type === 'income') {
      incomeNet += a.amount
    } else if (a.type === 'expense') {
      expenseNet += a.amount
    }
  }

  // Net income = income (credit-natural) − expense (debit-natural).
  const netIncome = -incomeNet - expenseNet
  const totalAssets = assets.reduce((s, x) => s + x.balance_cents, 0)
  const totalLiabilities = liabilities.reduce((s, x) => s + x.balance_cents, 0)
  const totalEquity = equity.reduce((s, x) => s + x.balance_cents, 0) + netIncome

  const sortByCode = (a: BalanceSheetLine, b: BalanceSheetLine) => a.code.localeCompare(b.code)
  return {
    as_of: asOf,
    assets: assets.sort(sortByCode),
    liabilities: liabilities.sort(sortByCode),
    equity: equity.sort(sortByCode),
    net_income_cents: netIncome,
    total_assets_cents: totalAssets,
    total_liabilities_cents: totalLiabilities,
    total_equity_cents: totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
    source: 'ledger',
  }
}

export interface TrialBalanceRow { code: string; name: string; debit_cents: number; credit_cents: number }
export interface LedgerTrialBalance {
  period: { from: string; to: string }
  rows: TrialBalanceRow[]
  total_debits_cents: number
  total_credits_cents: number
  balanced: boolean
  source: 'ledger'
}

/**
 * Trial balance over [from, to] — every account's total debits and credits.
 * The accountant's workhorse, and a proof the books balance (Σdebits = Σcredits).
 */
export async function ledgerTrialBalance(
  tenantId: string,
  from: string,
  to: string,
  entityId?: string | null,
): Promise<LedgerTrialBalance> {
  const acc = new Map<string, TrialBalanceRow>()
  await streamLedgerLines(tenantId, { from, to, entityId }, (debit, credit, coa) => {
    const row = acc.get(coa.code) || { code: coa.code, name: coa.name, debit_cents: 0, credit_cents: 0 }
    row.debit_cents += debit
    row.credit_cents += credit
    acc.set(coa.code, row)
  })

  const rows = Array.from(acc.values())
    .filter(r => r.debit_cents !== 0 || r.credit_cents !== 0)
    .sort((a, b) => a.code.localeCompare(b.code))
  const totalDebits = rows.reduce((s, r) => s + r.debit_cents, 0)
  const totalCredits = rows.reduce((s, r) => s + r.credit_cents, 0)
  return {
    period: { from, to },
    rows,
    total_debits_cents: totalDebits,
    total_credits_cents: totalCredits,
    balanced: totalDebits === totalCredits,
    source: 'ledger',
  }
}
