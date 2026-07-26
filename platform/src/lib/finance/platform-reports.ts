/**
 * Cross-tenant ledger reports for the platform admin Finance page
 * (`/admin/finance`). Same accounting rules as `ledger-reports.ts`
 * (income = credit-positive, expense = debit-positive, cogs vs opex by
 * chart_of_accounts.subtype), just not filtered to one tenant — every
 * chart_of_accounts row is tenant-owned, so cross-tenant aggregation
 * groups by `journal_lines.tenant_id` instead of scoping a query to it.
 */
import { supabaseAdmin } from '../supabase'

const PAGE = 1000

interface PlatformLineRow {
  tenant_id: string
  debit_cents: number | null
  credit_cents: number | null
  chart_of_accounts: { type: string; subtype: string | null; name: string } | null
}

export interface PlatformTenantPnL {
  tenant_id: string
  tenant_name: string
  revenue_cents: number
  cogs_cents: number
  gross_profit_cents: number
  opex_cents: number
  net_profit_cents: number
  margin_bps: number
}

export interface PlatformPnL {
  period: { from: string; to: string }
  revenue_cents: number
  cogs_cents: number
  gross_profit_cents: number
  opex_cents: number
  net_profit_cents: number
  margin_bps: number
  by_tenant: PlatformTenantPnL[]
  expense_by_category: { category: string; amount_cents: number }[]
  source: 'ledger'
}

async function tenantNameMap(tenantIds: string[]): Promise<Record<string, string>> {
  if (tenantIds.length === 0) return {}
  const { data } = await supabaseAdmin.from('tenants').select('id, name').in('id', tenantIds)
  const names: Record<string, string> = {}
  for (const t of data || []) names[t.id] = t.name
  return names
}

/**
 * Platform-wide P&L over [from, to], broken down per tenant. Streams every
 * matching journal line (paginated so a busy platform never trips the
 * 1000-row cap) instead of summing raw bookings — the same ledger-truth
 * fix applied per-tenant, now at the cross-tenant rollup level.
 */
export async function platformProfitAndLoss(from: string, to: string): Promise<PlatformPnL> {
  const perTenant = new Map<string, { revenue: number; cogs: number; opex: number }>()
  const byCategory = new Map<string, number>()

  let offset = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('journal_lines')
      .select('tenant_id, debit_cents, credit_cents, journal_entries!inner(entry_date), chart_of_accounts!inner(type, subtype, name)')
      .gte('journal_entries.entry_date', from)
      .lte('journal_entries.entry_date', to)
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    const rows = (data || []) as unknown as PlatformLineRow[]

    for (const r of rows) {
      const coa = r.chart_of_accounts
      if (!coa) continue
      const debit = Number(r.debit_cents) || 0
      const credit = Number(r.credit_cents) || 0
      const cur = perTenant.get(r.tenant_id) || { revenue: 0, cogs: 0, opex: 0 }
      if (coa.type === 'income') {
        cur.revenue += credit - debit
      } else if (coa.type === 'expense') {
        const amt = debit - credit
        if (coa.subtype === 'cogs') cur.cogs += amt
        else {
          cur.opex += amt
          byCategory.set(coa.name, (byCategory.get(coa.name) || 0) + amt)
        }
      }
      perTenant.set(r.tenant_id, cur)
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  const tenantIds = Array.from(perTenant.keys())
  const names = await tenantNameMap(tenantIds)

  const by_tenant: PlatformTenantPnL[] = tenantIds
    .map((id) => {
      const t = perTenant.get(id)!
      const gross = t.revenue - t.cogs
      const net = gross - t.opex
      return {
        tenant_id: id,
        tenant_name: names[id] || id.slice(0, 8),
        revenue_cents: t.revenue,
        cogs_cents: t.cogs,
        gross_profit_cents: gross,
        opex_cents: t.opex,
        net_profit_cents: net,
        margin_bps: t.revenue > 0 ? Math.round((net / t.revenue) * 10000) : 0,
      }
    })
    .sort((a, b) => b.revenue_cents - a.revenue_cents)

  const totals = by_tenant.reduce(
    (acc, t) => ({
      revenue: acc.revenue + t.revenue_cents,
      cogs: acc.cogs + t.cogs_cents,
      opex: acc.opex + t.opex_cents,
    }),
    { revenue: 0, cogs: 0, opex: 0 },
  )
  const gross = totals.revenue - totals.cogs
  const net = gross - totals.opex

  return {
    period: { from, to },
    revenue_cents: totals.revenue,
    cogs_cents: totals.cogs,
    gross_profit_cents: gross,
    opex_cents: totals.opex,
    net_profit_cents: net,
    margin_bps: totals.revenue > 0 ? Math.round((net / totals.revenue) * 10000) : 0,
    by_tenant,
    expense_by_category: Array.from(byCategory.entries())
      .map(([category, amount_cents]) => ({ category, amount_cents }))
      .sort((a, b) => b.amount_cents - a.amount_cents),
    source: 'ledger',
  }
}

export interface PlatformMonthlyPoint {
  month: string
  revenue_cents: number
  net_profit_cents: number
}

/**
 * Platform-wide monthly trend for a calendar year (Jan–Dec, matching the
 * per-tenant Overview fix — never a rolling window, so numbers don't shift
 * as the query date changes). Pass tenantId to scope to one tenant instead
 * of the whole platform.
 */
export async function platformMonthlyTrend(year: number, tenantId?: string): Promise<PlatformMonthlyPoint[]> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const perMonth = new Map<string, { revenue: number; cogs: number; opex: number }>()
  for (let m = 0; m < 12; m++) {
    const key = new Date(Date.UTC(year, m, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    perMonth.set(key, { revenue: 0, cogs: 0, opex: 0 })
  }

  let offset = 0
  for (;;) {
    let q = supabaseAdmin
      .from('journal_lines')
      .select('tenant_id, debit_cents, credit_cents, journal_entries!inner(entry_date), chart_of_accounts!inner(type, subtype)')
      .gte('journal_entries.entry_date', from)
      .lte('journal_entries.entry_date', to)
      .range(offset, offset + PAGE - 1)
    if (tenantId) q = q.eq('tenant_id', tenantId)

    const { data, error } = await q
    if (error) throw error
    const rows = (data || []) as unknown as (PlatformLineRow & { journal_entries: { entry_date: string } | null })[]

    for (const r of rows) {
      const coa = r.chart_of_accounts
      const entry = r.journal_entries
      if (!coa || !entry) continue
      const key = new Date(`${entry.entry_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
      const cur = perMonth.get(key)
      if (!cur) continue
      const debit = Number(r.debit_cents) || 0
      const credit = Number(r.credit_cents) || 0
      if (coa.type === 'income') cur.revenue += credit - debit
      else if (coa.type === 'expense') {
        const amt = debit - credit
        if (coa.subtype === 'cogs') cur.cogs += amt
        else cur.opex += amt
      }
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  return Array.from(perMonth.entries()).map(([month, v]) => ({
    month,
    revenue_cents: v.revenue,
    net_profit_cents: v.revenue - v.cogs - v.opex,
  }))
}
