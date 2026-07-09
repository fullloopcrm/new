/**
 * Cash-flow summary from the ledger (cash-basis). Streams every journal line
 * that hits a cash account (1000 Cash, 1010 Operating Checking, 1020 Savings,
 * 1050 Undeposited Funds) and rolls up cash in (debits to cash) vs cash out
 * (credits to cash), net change, and a by-month series.
 *
 * This is an honest cash-basis summary, not a GAAP Statement of Cash Flows —
 * the package labels it that way. The P&L covers operations and the balance
 * sheet shows the ending cash position; this shows the movement between them.
 */
import { supabaseAdmin } from '../supabase'

const CASH_CODES = new Set(['1000', '1010', '1020', '1050'])

export interface LedgerCashFlow {
  period: { from: string; to: string }
  cash_in_cents: number
  cash_out_cents: number
  net_change_cents: number
  by_month: { month: string; net_cents: number }[]
}

export async function ledgerCashSummary(tenantId: string, from: string, to: string): Promise<LedgerCashFlow> {
  const PAGE = 1000
  let cashIn = 0
  let cashOut = 0
  const monthly = new Map<string, number>()
  let offset = 0

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('journal_lines')
      .select('debit_cents, credit_cents, journal_entries!inner(entry_date), chart_of_accounts!inner(code)')
      .eq('tenant_id', tenantId)
      .gte('journal_entries.entry_date', from)
      .lte('journal_entries.entry_date', to)
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    const rows = (data || []) as unknown as Array<{
      debit_cents: number | null
      credit_cents: number | null
      journal_entries: { entry_date: string } | null
      chart_of_accounts: { code: string } | null
    }>

    for (const r of rows) {
      if (!r.chart_of_accounts || !CASH_CODES.has(r.chart_of_accounts.code)) continue
      const debit = Number(r.debit_cents) || 0
      const credit = Number(r.credit_cents) || 0
      cashIn += debit
      cashOut += credit
      const month = (r.journal_entries?.entry_date || from).slice(0, 7) // YYYY-MM
      monthly.set(month, (monthly.get(month) || 0) + (debit - credit))
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  return {
    period: { from, to },
    cash_in_cents: cashIn,
    cash_out_cents: cashOut,
    net_change_cents: cashIn - cashOut,
    by_month: Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, net_cents]) => ({ month, net_cents })),
  }
}
