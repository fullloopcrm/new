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

// Heuristic, not a real column — no tenant_type/is_test flag exists yet.
// Simulation tenants created for demos are named with a "SIM " prefix. Shared
// across every platform-finance route so test data is excluded consistently
// (Revenue, Margin, Jobs, More all use the same rule) rather than each route
// reinventing — or forgetting — its own filter.
export const isTestTenant = (name: string): boolean => /^SIM /i.test(name)

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

async function allTenantNames(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from('tenants').select('id, name')
  const names: Record<string, string> = {}
  for (const t of data || []) names[t.id] = t.name
  return names
}

/**
 * Platform-wide P&L over [from, to], broken down per tenant. Streams every
 * matching journal line (paginated so a busy platform never trips the
 * 1000-row cap) instead of summing raw bookings — the same ledger-truth
 * fix applied per-tenant, now at the cross-tenant rollup level. Excludes
 * simulation/test tenants by default (see isTestTenant) — pass
 * `{ includeTest: true }` to include them.
 */
export async function platformProfitAndLoss(from: string, to: string, opts: { includeTest?: boolean } = {}): Promise<PlatformPnL> {
  const names = await allTenantNames()
  const testTenantIds = new Set(Object.entries(names).filter(([, name]) => isTestTenant(name)).map(([id]) => id))
  const skip = (tenantId: string) => !opts.includeTest && testTenantIds.has(tenantId)

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
      if (skip(r.tenant_id)) continue
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
 * of the whole platform (test-tenant exclusion is skipped when a specific
 * tenantId is requested — an explicit pick overrides the default filter).
 */
export async function platformMonthlyTrend(year: number, tenantId?: string, opts: { includeTest?: boolean } = {}): Promise<PlatformMonthlyPoint[]> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const perMonth = new Map<string, { revenue: number; cogs: number; opex: number }>()
  for (let m = 0; m < 12; m++) {
    const key = new Date(Date.UTC(year, m, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    perMonth.set(key, { revenue: 0, cogs: 0, opex: 0 })
  }

  const names = tenantId || opts.includeTest ? {} : await allTenantNames()
  const testTenantIds = new Set(Object.entries(names).filter(([, name]) => isTestTenant(name)).map(([id]) => id))
  const skip = (rowTenantId: string) => !tenantId && !opts.includeTest && testTenantIds.has(rowTenantId)

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
      if (skip(r.tenant_id)) continue
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

export interface LedgerIntegrity {
  unpostedCount: number
  futureDatedCount: number
  mostRecentEntryAt: string | null
}

/**
 * "Can I trust this number" check for the platform ledger — no dedicated
 * cron-run log exists (finance-post's cron only returns counts in its HTTP
 * response, nothing durable), so this is a proxy derived straight from the
 * ledger itself rather than a heartbeat: unposted entries (journal_entries.
 * posted = false) and future-dated entries (entry_date beyond today, which
 * should never happen for a real transaction) are both real, queryable
 * anomalies. mostRecentEntryAt is a freshness signal, not a "last cron ran"
 * timestamp.
 */
export async function platformLedgerIntegrity(): Promise<LedgerIntegrity> {
  const todayStr = new Date().toISOString().slice(0, 10)

  const [unposted, futureDated, mostRecent] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('id', { count: 'exact', head: true }).eq('posted', false),
    supabaseAdmin.from('journal_entries').select('id', { count: 'exact', head: true }).gt('entry_date', todayStr),
    supabaseAdmin.from('journal_entries').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  return {
    unpostedCount: unposted.count || 0,
    futureDatedCount: futureDated.count || 0,
    mostRecentEntryAt: mostRecent.data?.created_at || null,
  }
}
