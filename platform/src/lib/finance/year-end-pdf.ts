/**
 * Year-End Package PDF (pdf-lib). One document the tenant's accountant opens and
 * immediately understands: cover + Yinez memo, P&L, balance sheet, trial
 * balance, 1099-NEC contractor summary, W-2 roster, and full general-ledger
 * detail. Prepared by Full Loop — NOT a filing.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { YearEndData } from './year-end'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 54
const LINE = 13
const usd = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export async function buildYearEndPdf(d: YearEndData, memo: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(0.05, 0.58, 0.53)
  const ink = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.32, 0.37, 0.44)
  const hair = rgb(0.85, 0.87, 0.9)
  const maxW = PAGE_W - MARGIN * 2

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const footer = (p: PDFPage) => {
    p.drawText(`${d.tenant.name} · Year-End Package ${d.year} · Prepared by Full Loop CRM (not a tax filing)`, { x: MARGIN, y: 30, size: 7, font, color: gray })
  }
  footer(page)
  const addPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; footer(page) }
  const ensure = (need: number) => { if (y - need < MARGIN + 20) addPage() }

  const wrap = (text: string, f: PDFFont, size: number, w: number): string[] => {
    const out: string[] = []
    for (const para of text.split('\n')) {
      const words = para.split(/\s+/)
      let cur = ''
      for (const wd of words) {
        const test = cur ? `${cur} ${wd}` : wd
        if (f.widthOfTextAtSize(test, size) > w && cur) { out.push(cur); cur = wd } else cur = test
      }
      out.push(cur)
    }
    return out
  }
  const write = (s: string, size: number, f: PDFFont, color = ink, x = MARGIN) => {
    for (const ln of wrap(s, f, size, maxW - (x - MARGIN))) { ensure(LINE); page.drawText(ln, { x, y, size, font: f, color }); y -= LINE }
  }
  const gap = (h: number) => { y -= h }
  const heading = (s: string) => { ensure(LINE * 2 + 10); gap(10); write(s, 13, bold, teal); gap(2); page.drawLine({ start: { x: MARGIN, y: y + 3 }, end: { x: PAGE_W - MARGIN, y: y + 3 }, thickness: 0.75, color: hair }); gap(6) }
  const row2 = (label: string, amount: string, strong = false) => {
    ensure(LINE); const f = strong ? bold : font
    page.drawText(label, { x: MARGIN + (strong ? 0 : 8), y, size: 9.5, font: f, color: strong ? ink : gray })
    const w = f.widthOfTextAtSize(amount, 9.5)
    page.drawText(amount, { x: PAGE_W - MARGIN - w, y, size: 9.5, font: f, color: ink }); y -= LINE
  }
  const rule = () => { ensure(6); page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_W - MARGIN, y: y + 2 }, thickness: 0.5, color: hair }); y -= 6 }

  // Generic right-aligned table with a header + N number columns.
  const table = (cols: { label: string; x: number; right?: boolean }[], rows: string[][]) => {
    ensure(LINE * 2)
    for (const c of cols) {
      const tx = c.right ? c.x - font.widthOfTextAtSize(c.label, 8) : c.x
      page.drawText(c.label, { x: tx, y, size: 8, font: bold, color: gray })
    }
    y -= LINE; rule()
    for (const r of rows) {
      ensure(LINE)
      r.forEach((cell, i) => {
        const c = cols[i]; const tx = c.right ? c.x - font.widthOfTextAtSize(cell, 8.5) : c.x
        page.drawText(cell.slice(0, 60), { x: tx, y, size: 8.5, font, color: ink })
      })
      y -= LINE
    }
  }

  // ── Cover ──
  page.drawText('FULL LOOP CRM', { x: MARGIN, y, size: 10, font: bold, color: teal }); y -= 26
  write(`${d.year} Year-End Package`, 26, bold); gap(4)
  write(d.tenant.name, 15, bold, gray); gap(10)
  write(`Prepared by Full Loop from ${d.tenant.name}'s operating records. This package is a bookkeeping handoff for your accountant — it is not a tax return and Full Loop does not file taxes.`, 10, font, gray)
  gap(8)
  write('Contents', 11, bold); gap(2)
  for (const c of ['Cover memo (summary & open questions)', 'Profit & Loss', 'Balance Sheet', 'Cash Flow Summary', 'Trial Balance', '1099-NEC contractor summary', 'W-2 employee roster', 'General ledger detail']) write(`•  ${c}`, 9.5, font, gray)
  gap(6)
  if (d.accountant?.email) write(`Accountant on file: ${d.accountant.name || d.accountant.email} (${d.accountant.email})`, 9, font, gray)

  // ── Cover memo ──
  heading('Cover Memo')
  write(memo, 9.5, font, gray)

  // ── P&L ──
  heading(`Profit & Loss — ${d.year}`)
  row2('Revenue', usd(d.pnl.revenue_cents))
  row2('Cost of services', usd(d.pnl.cost_of_service_cents))
  rule(); row2('Gross profit', usd(d.pnl.gross_profit_cents), true)
  row2('Operating expenses', usd(d.pnl.expenses_total_cents))
  rule(); row2('Net profit', usd(d.pnl.net_profit_cents), true)
  if (d.pnl.expense_by_category.length) {
    gap(6); write('Expenses by category', 9.5, bold); gap(2)
    for (const e of d.pnl.expense_by_category) row2(e.category, usd(e.amount_cents))
  }

  // ── Balance sheet ──
  heading(`Balance Sheet — as of ${d.year}-12-31`)
  write('Assets', 9.5, bold, ink)
  for (const a of d.balanceSheet.assets) row2(`${a.code} ${a.name}`, usd(a.balance_cents))
  rule(); row2('Total assets', usd(d.balanceSheet.total_assets_cents), true); gap(4)
  write('Liabilities', 9.5, bold, ink)
  for (const l of d.balanceSheet.liabilities) row2(`${l.code} ${l.name}`, usd(l.balance_cents))
  rule(); row2('Total liabilities', usd(d.balanceSheet.total_liabilities_cents), true); gap(4)
  write('Equity', 9.5, bold, ink)
  for (const eq of d.balanceSheet.equity) row2(`${eq.code} ${eq.name}`, usd(eq.balance_cents))
  row2('Net income (current year)', usd(d.balanceSheet.net_income_cents))
  rule(); row2('Total equity', usd(d.balanceSheet.total_equity_cents), true)
  gap(4); write(d.balanceSheet.balanced ? '✓ Assets = Liabilities + Equity (books balance).' : '⚠ Assets do not equal Liabilities + Equity — review before filing.', 9, font, d.balanceSheet.balanced ? teal : rgb(0.55, 0.1, 0.1))

  // ── Cash flow ──
  heading(`Cash Flow Summary — ${d.year}`)
  write('Cash-basis movement across cash & bank accounts (not a GAAP statement of cash flows).', 8.5, font, gray); gap(2)
  row2('Cash in', usd(d.cashFlow.cash_in_cents))
  row2('Cash out', usd(d.cashFlow.cash_out_cents))
  rule(); row2('Net change in cash', usd(d.cashFlow.net_change_cents), true)

  // ── Trial balance ──
  heading(`Trial Balance — ${d.year}`)
  table(
    [{ label: 'Account', x: MARGIN }, { label: 'Debits', x: PAGE_W - MARGIN - 90, right: true }, { label: 'Credits', x: PAGE_W - MARGIN, right: true }],
    d.trialBalance.rows.map((r) => [`${r.code} ${r.name}`, usd(r.debit_cents), usd(r.credit_cents)]),
  )
  rule(); row2('Totals', `${usd(d.trialBalance.total_debits_cents)}  /  ${usd(d.trialBalance.total_credits_cents)}`, true)

  // ── 1099-NEC summary ──
  heading('1099-NEC Contractor Summary')
  write(`Contractors are those classified 1099 in Full Loop. The IRS 1099-NEC threshold is $600. Amounts reflect contractor pay marked paid in ${d.year}.`, 8.5, font, gray); gap(4)
  if (d.contractors.rows.length === 0) {
    write('No contractor payments recorded for the year.', 9, font, gray)
  } else {
    table(
      [{ label: 'Contractor', x: MARGIN }, { label: 'Jobs', x: MARGIN + 300 }, { label: 'Paid', x: PAGE_W - MARGIN - 70, right: true }, { label: '1099?', x: PAGE_W - MARGIN, right: true }],
      d.contractors.rows.map((r) => [r.name, String(r.jobs), usd(r.paid_cents), r.meets_threshold ? 'YES' : '—']),
    )
    gap(2); write(`${d.contractors.reportable_count} contractor(s) require a 1099-NEC.`, 9, bold)
  }

  // ── W-2 roster ──
  heading('W-2 Employees')
  if (d.employeesW2.length === 0) write('No W-2 employees on file.', 9, font, gray)
  else {
    for (const e of d.employeesW2) write(`•  ${e.name}${e.email ? ` — ${e.email}` : ''}`, 9, font, gray)
    gap(2); write('W-2 wages and withholding are not tracked in Full Loop; your payroll provider issues these forms.', 8.5, font, gray)
  }

  // ── Open items / gaps ──
  heading('Open Items for Your Accountant')
  for (const g of d.gaps) write(`•  ${g}`, 9, font, gray)

  // ── General ledger detail ──
  heading(`General Ledger Detail — ${d.year}`)
  write(`${d.entriesTotal} journal entries. ${d.entries.length < d.entriesTotal ? `Showing the first ${d.entries.length}; full detail available in Full Loop.` : 'All entries shown.'}`, 8.5, font, gray); gap(4)
  table(
    [{ label: 'Date', x: MARGIN }, { label: 'Description', x: MARGIN + 70 }, { label: 'Account', x: MARGIN + 300 }, { label: 'Amount', x: PAGE_W - MARGIN, right: true }],
    d.entries.map((e) => [e.entry_date, (e.memo || '').slice(0, 34), `${e.account_code || ''} ${(e.account_name || '').slice(0, 16)}`, usd(e.amount_cents)]),
  )

  return await pdf.save()
}
