/**
 * Ledger register — the read model behind the Bookkeeping (Books) UI.
 *
 * The double-entry ledger (journal_entries ⨝ journal_lines ⨝ chart_of_accounts)
 * is the source of truth. This module turns each balanced journal entry into a
 * single register row a business owner can read (date, description, category,
 * amount, source), and computes accurate period totals over the FULL range
 * (not just the loaded page).
 *
 * Every entry in journal_entries is already posted (double-entry, balanced by
 * DB trigger), so there is no "needs posting" state here — that queue lives in
 * bank_transactions (categorize → post), which is a separate surface.
 *
 * Global per the platform rule: every query is tenant-scoped.
 */
import { supabaseAdmin } from '../supabase'

/** Payroll/labor expense accounts — used to split COGS payroll out of other expense. */
const PAYROLL_CODES = new Set(['5000', '5010'])

export type LedgerDisplayType = 'revenue' | 'payroll' | 'expense' | 'transfer'

export interface LedgerLine {
  coa_id: string
  code: string
  name: string
  type: string
  subtype: string | null
  debit_cents: number
  credit_cents: number
  memo: string | null
}

export interface LedgerEntry {
  id: string
  entry_date: string
  memo: string | null
  source: string | null
  source_id: string | null
  posted: boolean
  period_locked: boolean
  lines: LedgerLine[]
  // Register summary (one readable row per entry):
  display_type: LedgerDisplayType
  account_code: string | null
  account_name: string | null
  /** Signed for display: revenue positive, payroll/expense negative, transfer per net asset move. */
  amount_cents: number
}

export interface LedgerTotals {
  revenue_cents: number
  payroll_cents: number
  expense_cents: number
  net_cents: number
  entries_count: number
}

interface RawLine {
  coa_id: string
  debit_cents: number | null
  credit_cents: number | null
  memo: string | null
  chart_of_accounts: { code: string; name: string; type: string; subtype: string | null } | null
}

interface RawEntry {
  id: string
  entry_date: string
  memo: string | null
  source: string | null
  source_id: string | null
  posted: boolean
  period_locked: boolean
  journal_lines: RawLine[] | null
}

function toLine(r: RawLine): LedgerLine {
  const coa = r.chart_of_accounts
  return {
    coa_id: r.coa_id,
    code: coa?.code || '',
    name: coa?.name || 'Unmapped',
    type: coa?.type || '',
    subtype: coa?.subtype || null,
    debit_cents: Number(r.debit_cents) || 0,
    credit_cents: Number(r.credit_cents) || 0,
    memo: r.memo,
  }
}

/**
 * Summarize a balanced entry into a single register row. Priority for the
 * "what is this" account: income → the revenue account; else expense → the
 * cost account (payroll if 5000/5010, otherwise expense); else the largest
 * asset/liability move (transfer, e.g. a customer deposit or bank move).
 */
function summarize(lines: LedgerLine[]): Pick<LedgerEntry, 'display_type' | 'account_code' | 'account_name' | 'amount_cents'> {
  const income = lines.filter((l) => l.type === 'income')
  const expense = lines.filter((l) => l.type === 'expense')

  if (income.length > 0) {
    const amount = income.reduce((s, l) => s + (l.credit_cents - l.debit_cents), 0)
    const primary = income.slice().sort((a, b) => (b.credit_cents - b.debit_cents) - (a.credit_cents - a.debit_cents))[0]
    return { display_type: 'revenue', account_code: primary.code, account_name: primary.name, amount_cents: amount }
  }

  if (expense.length > 0) {
    const amount = expense.reduce((s, l) => s + (l.debit_cents - l.credit_cents), 0)
    const primary = expense.slice().sort((a, b) => (b.debit_cents - b.credit_cents) - (a.debit_cents - a.credit_cents))[0]
    const isPayroll = expense.some((l) => PAYROLL_CODES.has(l.code))
    return { display_type: isPayroll ? 'payroll' : 'expense', account_code: primary.code, account_name: primary.name, amount_cents: -amount }
  }

  // No P&L line: an asset/liability/equity move (deposit, transfer). Show the
  // largest-magnitude line as the "account", amount = its net debit.
  const primary = lines.slice().sort((a, b) =>
    Math.abs(b.debit_cents - b.credit_cents) - Math.abs(a.debit_cents - a.credit_cents))[0]
  const net = primary ? primary.debit_cents - primary.credit_cents : 0
  return { display_type: 'transfer', account_code: primary?.code || null, account_name: primary?.name || null, amount_cents: net }
}

export interface ListLedgerOpts {
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/**
 * List a tenant's most recent journal entries as register rows, plus the total
 * entry count for the range. The UI filters the returned page client-side
 * (by type/search), matching the existing Books UX; totals come from
 * ledgerTotals so they stay accurate across the whole range.
 */
export async function listLedgerEntries(
  tenantId: string,
  opts: ListLedgerOpts = {},
): Promise<{ entries: LedgerEntry[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 1000)
  const offset = Math.max(opts.offset ?? 0, 0)

  let listQ = supabaseAdmin
    .from('journal_entries')
    .select('id, entry_date, memo, source, source_id, posted, period_locked, journal_lines(coa_id, debit_cents, credit_cents, memo, chart_of_accounts(code, name, type, subtype))')
    .eq('tenant_id', tenantId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  let countQ = supabaseAdmin
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (opts.from) { listQ = listQ.gte('entry_date', opts.from); countQ = countQ.gte('entry_date', opts.from) }
  if (opts.to) { listQ = listQ.lte('entry_date', opts.to); countQ = countQ.lte('entry_date', opts.to) }

  const [{ data, error }, { count }] = await Promise.all([listQ, countQ])
  if (error) throw error

  const entries = ((data || []) as unknown as RawEntry[]).map((e): LedgerEntry => {
    const lines = (e.journal_lines || []).map(toLine)
    return {
      id: e.id,
      entry_date: e.entry_date,
      memo: e.memo,
      source: e.source,
      source_id: e.source_id,
      posted: e.posted,
      period_locked: e.period_locked,
      lines,
      ...summarize(lines),
    }
  })

  return { entries, total: count || 0 }
}

/**
 * Accurate period totals over the FULL date range (streams all lines, paginated
 * so the 1000-row cap never truncates). Revenue = income credit-natural;
 * payroll = accounts 5000/5010 debit-natural; expense = other expense
 * debit-natural; net = revenue − payroll − expense.
 */
export async function ledgerTotals(
  tenantId: string,
  opts: { from?: string; to?: string } = {},
): Promise<LedgerTotals> {
  const PAGE = 1000
  let revenue = 0
  let payroll = 0
  let expense = 0
  let offset = 0

  for (;;) {
    let q = supabaseAdmin
      .from('journal_lines')
      .select('debit_cents, credit_cents, journal_entries!inner(entry_date), chart_of_accounts!inner(code, type)')
      .eq('tenant_id', tenantId)
      .range(offset, offset + PAGE - 1)
    if (opts.from) q = q.gte('journal_entries.entry_date', opts.from)
    if (opts.to) q = q.lte('journal_entries.entry_date', opts.to)

    const { data, error } = await q
    if (error) throw error
    const rows = (data || []) as unknown as Array<{
      debit_cents: number | null
      credit_cents: number | null
      chart_of_accounts: { code: string; type: string } | null
    }>

    for (const r of rows) {
      const coa = r.chart_of_accounts
      if (!coa) continue
      const debit = Number(r.debit_cents) || 0
      const credit = Number(r.credit_cents) || 0
      if (coa.type === 'income') revenue += credit - debit
      else if (coa.type === 'expense') {
        if (PAYROLL_CODES.has(coa.code)) payroll += debit - credit
        else expense += debit - credit
      }
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  const { count } = await supabaseAdmin
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', opts.from || '0001-01-01')
    .lte('entry_date', opts.to || '9999-12-31')

  return {
    revenue_cents: revenue,
    payroll_cents: payroll,
    expense_cents: expense,
    net_cents: revenue - payroll - expense,
    entries_count: count || 0,
  }
}
