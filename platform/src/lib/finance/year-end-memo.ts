/**
 * Year-end cover memo — the note the accountant reads first.
 *
 * Yinez (via the tenant's Anthropic key, platform key fallback) writes a short,
 * plain-English summary: revenue & net, trend vs prior year, notable items, and
 * open questions for the accountant. If the AI call fails or is unavailable, a
 * deterministic templated memo is returned so the package always ships.
 */
import { resolveAnthropic } from '../anthropic-client'
import type { YearEndData } from './year-end'

const MODEL = 'claude-sonnet-4-6'
const usd = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function pctChange(cur: number, prior: number): string {
  if (!prior) return cur > 0 ? 'first full year on record' : 'no prior-year comparison'
  const d = Math.round(((cur - prior) / Math.abs(prior)) * 100)
  return `${d >= 0 ? '+' : ''}${d}% vs ${' '}last year`
}

/** Deterministic memo from the numbers — always valid, no AI required. */
export function templatedMemo(d: YearEndData): string {
  const rev = d.pnl.revenue_cents
  const net = d.pnl.net_profit_cents
  const lines = [
    `Year-end books for ${d.tenant.name} — tax year ${d.year}. Prepared by Full Loop from the business's operating records.`,
    ``,
    `Revenue: ${usd(rev)} (${pctChange(rev, d.priorYear.revenue_cents)}). Net profit: ${usd(net)}. Cost of services: ${usd(d.pnl.cost_of_service_cents)}; operating expenses: ${usd(d.pnl.expenses_total_cents)}.`,
    `Contractors paid this year: ${d.contractors.rows.length}; ${d.contractors.reportable_count} reached the $600 1099-NEC threshold (${usd(d.contractors.reportable.reduce((s, r) => s + r.paid_cents, 0))} reportable).`,
    d.employeesW2.length ? `W-2 employees on file: ${d.employeesW2.length} (wages/withholding issued by the tenant's payroll provider — not included here).` : ``,
    ``,
    `Open items for your review:`,
    ...d.gaps.map((g) => `  • ${g}`),
    !d.balanceSheet.balanced ? `  • Balance sheet does not yet tie out — please review uncategorized items.` : ``,
    ``,
    `Questions: contact ${d.tenant.name}${d.tenant.email ? ` at ${d.tenant.email}` : ''} directly.`,
  ]
  return lines.filter((l) => l !== ``).join('\n').replace(/\n{2,}/g, '\n\n')
}

export async function generateCoverMemo(d: YearEndData): Promise<string> {
  const facts = {
    business: d.tenant.name,
    year: d.year,
    revenue: usd(d.pnl.revenue_cents),
    prior_year_revenue: usd(d.priorYear.revenue_cents),
    net_profit: usd(d.pnl.net_profit_cents),
    cost_of_services: usd(d.pnl.cost_of_service_cents),
    operating_expenses: usd(d.pnl.expenses_total_cents),
    contractors_paid: d.contractors.rows.length,
    contractors_1099_reportable: d.contractors.reportable_count,
    w2_employees: d.employeesW2.length,
    balance_sheet_ties_out: d.balanceSheet.balanced,
    known_gaps: d.gaps,
  }

  try {
    const client = await resolveAnthropic(d.tenant.id)
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content:
          `You are Yinez, Full Loop's finance assistant. Write a concise, professional cover memo (250-350 words, plain paragraphs, no markdown headers) addressed to the accountant who will file this small business's taxes. ` +
          `Summarize the year: total revenue and net profit, the trend vs last year, notable items, and a short list of open questions/known gaps for the accountant. ` +
          `Be factual and grounded ONLY in these numbers — do not invent figures. Make the accountant's first five minutes efficient. Full Loop prepared the books but does NOT file; the accountant files. ` +
          `Numbers:\n${JSON.stringify(facts, null, 2)}`,
      }],
    })
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()
    if (text.length > 80) return text
    return templatedMemo(d)
  } catch (e) {
    console.error('[year-end] cover memo AI failed, using template:', e)
    return templatedMemo(d)
  }
}
