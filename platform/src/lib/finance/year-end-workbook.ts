/**
 * Year-end workbook — the "accompanying Excel workbook" for the accountant.
 *
 * A zip of CSVs (each opens as an Excel sheet): summary, trial balance, full
 * general ledger, and the 1099-NEC contractor detail. Built from the same
 * ledger the PDF package reads, so the numbers tie out. Uses JSZip (already a
 * dependency) — no new package, honoring "reuse over reinvent".
 */
import JSZip from 'jszip'
import { toCsv, buildGeneralLedger } from '../finance-export'
import type { YearEndData } from './year-end'

const dollars = (c: number) => (c / 100).toFixed(2)

export async function buildYearEndWorkbook(tenantId: string, data: YearEndData): Promise<Buffer> {
  const year = data.year
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const zip = new JSZip()

  // 1. Summary — the headline numbers.
  const summary = [
    { metric: 'Revenue', amount: dollars(data.pnl.revenue_cents) },
    { metric: 'Cost of services', amount: dollars(data.pnl.cost_of_service_cents) },
    { metric: 'Gross profit', amount: dollars(data.pnl.gross_profit_cents) },
    { metric: 'Operating expenses', amount: dollars(data.pnl.expenses_total_cents) },
    { metric: 'Net profit', amount: dollars(data.pnl.net_profit_cents) },
    { metric: 'Cash in', amount: dollars(data.cashFlow.cash_in_cents) },
    { metric: 'Cash out', amount: dollars(data.cashFlow.cash_out_cents) },
    { metric: 'Net change in cash', amount: dollars(data.cashFlow.net_change_cents) },
    { metric: 'Contractors paid', amount: String(data.contractors.rows.length) },
    { metric: 'Contractors requiring 1099-NEC', amount: String(data.contractors.reportable_count) },
    { metric: 'W-2 employees on file', amount: String(data.employeesW2.length) },
    { metric: 'Books balance (assets = L+E)', amount: data.balanceSheet.balanced ? 'YES' : 'NO — review' },
  ]
  zip.file(`${year}_summary.csv`, toCsv(summary))

  // 2. Trial balance.
  zip.file(`${year}_trial_balance.csv`, toCsv(
    data.trialBalance.rows.map((r) => ({ code: r.code, account: r.name, debits: dollars(r.debit_cents), credits: dollars(r.credit_cents) })),
  ))

  // 3. Full general ledger (streams up to 50k lines — more complete than the PDF excerpt).
  const gl = await buildGeneralLedger(tenantId, null, from, to)
  zip.file(`${year}_general_ledger.csv`, toCsv(gl))

  // 4. 1099-NEC contractor detail.
  zip.file(`${year}_contractors_1099.csv`, toCsv(
    data.contractors.rows.map((r) => ({
      contractor: r.name, email: r.email || '', jobs: r.jobs, paid: dollars(r.paid_cents), requires_1099: r.meets_threshold ? 'YES' : 'no',
    })),
  ))

  return zip.generateAsync({ type: 'nodebuffer' })
}
