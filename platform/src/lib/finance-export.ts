/**
 * Shared finance export helpers. CSV serialization + balance sheet /
 * trial balance / general ledger composition.
 */
import { supabaseAdmin } from './supabase'

export function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return ''
  let s = String(v)
  // Neutralize CSV formula injection (Excel treats leading =, +, -, @, tab, CR as formula).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const lines: string[] = [keys.join(',')]
  for (const r of rows) {
    lines.push(keys.map(k => csvEscape(r[k] as string | number | null | undefined)).join(','))
  }
  return lines.join('\n')
}

interface LineRow { coa_id: string; coa_code: string; coa_name: string; coa_type: string; debits: number; credits: number }

// Supabase line limit — if a trial balance actually hits this, we page.
const TRIAL_BALANCE_PAGE = 5000

export async function buildTrialBalance(tenantId: string, entityId: string | null, asOfDate: string): Promise<LineRow[] & { truncated?: boolean }> {
  const agg = new Map<string, LineRow>()
  let offset = 0
  let truncated = false

  // Page through journal lines so tenants with >10k lines aren't silently cut off.
  for (;;) {
    let q = supabaseAdmin
      .from('journal_lines')
      .select('coa_id, debit_cents, credit_cents, chart_of_accounts!inner(code, name, type), journal_entries!inner(entry_date, posted)')
      .eq('tenant_id', tenantId)
    if (entityId) q = q.eq('entity_id', entityId)
    const { data } = await q
      .lte('journal_entries.entry_date', asOfDate)
      .range(offset, offset + TRIAL_BALANCE_PAGE - 1)

    const rows = (data || []) as unknown as Array<{
      coa_id: string
      debit_cents: number
      credit_cents: number
      chart_of_accounts: { code: string; name: string; type: string }
    }>

    for (const row of rows) {
      const key = row.coa_id
      const coa = row.chart_of_accounts
      if (!agg.has(key)) {
        agg.set(key, { coa_id: key, coa_code: coa.code, coa_name: coa.name, coa_type: coa.type, debits: 0, credits: 0 })
      }
      const r = agg.get(key)!
      r.debits += row.debit_cents || 0
      r.credits += row.credit_cents || 0
    }

    if (rows.length < TRIAL_BALANCE_PAGE) break
    offset += TRIAL_BALANCE_PAGE
    // Safety: stop after 200k rows so a runaway doesn't hang the request.
    if (offset >= 200_000) { truncated = true; break }
  }

  const out = Array.from(agg.values()).sort((a, b) => a.coa_code.localeCompare(b.coa_code)) as LineRow[] & { truncated?: boolean }
  if (truncated) out.truncated = true
  return out
}

export async function buildGeneralLedger(tenantId: string, entityId: string | null, from: string, to: string) {
  let q = supabaseAdmin
    .from('journal_lines')
    .select('debit_cents, credit_cents, memo, chart_of_accounts!inner(code, name, type), journal_entries!inner(entry_date, memo, source)')
    .eq('tenant_id', tenantId)
  if (entityId) q = q.eq('entity_id', entityId)
  const { data } = await q
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
    .limit(50000)

  const rows: Array<Record<string, string | number>> = []
  for (const row of (data || []) as unknown as Array<{
    debit_cents: number
    credit_cents: number
    memo: string | null
    chart_of_accounts: { code: string; name: string; type: string }
    journal_entries: { entry_date: string; memo: string | null; source: string | null }
  }>) {
    rows.push({
      date: row.journal_entries.entry_date,
      account: `${row.chart_of_accounts.code} ${row.chart_of_accounts.name}`,
      type: row.chart_of_accounts.type,
      debit: ((row.debit_cents || 0) / 100).toFixed(2),
      credit: ((row.credit_cents || 0) / 100).toFixed(2),
      memo: row.memo || row.journal_entries.memo || '',
      source: row.journal_entries.source || '',
    })
  }
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return rows
}
