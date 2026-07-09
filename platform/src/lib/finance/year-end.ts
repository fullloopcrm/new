/**
 * Year-End Package data gatherer — the "clean accountant handoff".
 *
 * Pulls a tenant's full year of books from the double-entry ledger (the source
 * of truth) into one structure the PDF assembler and cover-memo generator
 * consume: P&L, balance sheet, trial balance, general-ledger detail, a 1099-NEC
 * contractor summary, and a prior-year comparison for trend.
 *
 * Full Loop stops at the handoff — it does NOT file. Gaps it cannot fill from
 * platform data (W-2 withholding, mileage, depreciation) are surfaced as
 * `gaps` so the package states them honestly instead of fabricating numbers.
 *
 * Global per the platform rule: every query is tenant-scoped.
 */
import { supabaseAdmin } from '../supabase'
import { ledgerProfitAndLoss, ledgerBalanceSheet, ledgerTrialBalance, type LedgerPnL, type LedgerBalanceSheet, type LedgerTrialBalance } from './ledger-reports'
import { listLedgerEntries, ledgerTotals, type LedgerEntry, type LedgerTotals } from './ledger-list'
import { computeContractor1099, type Contractor1099Summary } from './contractor-1099'

export interface YearEndData {
  tenant: { id: string; name: string; email: string | null }
  year: number
  generated_at: string
  pnl: LedgerPnL
  balanceSheet: LedgerBalanceSheet
  trialBalance: LedgerTrialBalance
  totals: LedgerTotals
  entries: LedgerEntry[]
  entriesTotal: number
  contractors: Contractor1099Summary
  priorYear: { revenue_cents: number; net_cents: number }
  employeesW2: Array<{ name: string; email: string | null }>
  gaps: string[]
  accountant: { name: string | null; email: string | null } | null
}

/** Fixed gaps the handoff does not fill from platform data — stated honestly. */
const STANDARD_GAPS = [
  'W-2 wages & withholding are not tracked in Full Loop — your payroll provider issues employee W-2s.',
  'Vehicle mileage is not logged in Full Loop — provide a mileage log separately if claiming the deduction.',
  'Depreciation & fixed-asset schedules are not maintained in Full Loop — your accountant applies these.',
]

export async function gatherYearEnd(tenantId: string, year: number): Promise<YearEndData> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const priorFrom = `${year - 1}-01-01`
  const priorTo = `${year - 1}-12-31`

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, email')
    .eq('id', tenantId)
    .single()

  const [pnl, balanceSheet, trialBalance, totals, list, contractors, prior] = await Promise.all([
    ledgerProfitAndLoss(tenantId, from, to),
    ledgerBalanceSheet(tenantId, to),
    ledgerTrialBalance(tenantId, from, to),
    ledgerTotals(tenantId, { from, to }),
    listLedgerEntries(tenantId, { from, to, limit: 1000 }),
    computeContractor1099(tenantId, year),
    ledgerProfitAndLoss(tenantId, priorFrom, priorTo),
  ])

  // W-2 employees (listed only — Full Loop has no wage/withholding data).
  const { data: w2Profiles } = await supabaseAdmin
    .from('hr_employee_profiles')
    .select('team_member_id, team_members(name, email)')
    .eq('tenant_id', tenantId)
    .eq('employment_type', 'employee_w2')
  const employeesW2 = (w2Profiles || []).map((p) => {
    const tm = (p as unknown as { team_members: { name: string | null; email: string | null } | null }).team_members
    return { name: tm?.name || 'Employee', email: tm?.email || null }
  })

  // Accountant on file — most recent non-revoked CPA access token with an email.
  const { data: cpaTok } = await supabaseAdmin
    .from('cpa_access_tokens')
    .select('cpa_name, cpa_email, created_at')
    .eq('tenant_id', tenantId)
    .is('revoked_at', null)
    .not('cpa_email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const gaps = [...STANDARD_GAPS]
  if (!balanceSheet.balanced) gaps.push('Balance sheet does not tie out — some entries may be uncategorized; review before filing.')

  return {
    tenant: { id: tenantId, name: tenant?.name || 'Your Business', email: tenant?.email || null },
    year,
    generated_at: new Date().toISOString(),
    pnl,
    balanceSheet,
    trialBalance,
    totals,
    entries: list.entries,
    entriesTotal: list.total,
    contractors,
    priorYear: { revenue_cents: prior.revenue_cents, net_cents: prior.net_profit_cents },
    employeesW2,
    gaps,
    accountant: cpaTok ? { name: cpaTok.cpa_name, email: cpaTok.cpa_email } : null,
  }
}
