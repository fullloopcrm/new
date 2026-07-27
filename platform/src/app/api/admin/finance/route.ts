/**
 * Platform Finance — Revenue tab. Ledger-true cross-tenant revenue rollup
 * (see src/lib/finance/platform-reports.ts), replacing the old raw
 * `bookings.price` sum — same ledger-vs-raw-table bug fixed per-tenant on
 * 2026-07-25, now fixed at the platform rollup too. The old response shape
 * here (`total_revenue`/`breakdown`/`monthly`) never actually matched what
 * page.tsx read (`totalRevenue`/`revenueByTenant`/`monthlyTrend`) — this
 * rewrite fixes both sides together.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { platformProfitAndLoss, platformMonthlyTrend, platformLedgerIntegrity, isTestTenant } from '@/lib/finance/platform-reports'
import { supabaseAdmin } from '@/lib/supabase'

function periodBounds(period: string): { from: string; to: string } {
  const now = new Date()
  const toISODate = (d: Date) => d.toISOString().slice(0, 10)
  let from: Date

  if (period === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (period === 'week') {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    from = new Date(now.getFullYear(), 0, 1)
  }
  return { from: toISODate(from), to: toISODate(now) }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id') || undefined
  const period = url.searchParams.get('period') || 'month'
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear()
  const includeTest = url.searchParams.get('includeTest') === 'true'

  const now = new Date()
  const { from, to } = periodBounds(period)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  try {
    const opts = { includeTest }
    const [selected, thisMonth, lastMonth, monthlyTrend, integrity, allTenants] = await Promise.all([
      platformProfitAndLoss(from, to, opts),
      platformProfitAndLoss(monthStart, todayStr, opts),
      platformProfitAndLoss(lastMonthStart, lastMonthEnd, opts),
      platformMonthlyTrend(year, tenantId, opts),
      platformLedgerIntegrity(),
      supabaseAdmin.from('tenants').select('name').then((r) => r.data || []),
    ])

    const pick = (pnl: typeof selected) => (tenantId ? pnl.by_tenant.find((t) => t.tenant_id === tenantId)?.revenue_cents ?? 0 : pnl.revenue_cents)

    const totalRevenue = pick(selected)
    const thisMonthRevenue = pick(thisMonth)
    const lastMonthRevenue = pick(lastMonth)
    const growthPercent = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    const lastMonthByTenant = new Map(lastMonth.by_tenant.map((t) => [t.tenant_id, t.revenue_cents]))
    const healthDirection = (tenantIdKey: string, thisMonthCents: number): 'growing' | 'flat' | 'shrinking' => {
      const priorCents = lastMonthByTenant.get(tenantIdKey) || 0
      if (priorCents === 0) return thisMonthCents > 0 ? 'growing' : 'flat'
      const changePct = ((thisMonthCents - priorCents) / priorCents) * 100
      if (changePct > 5) return 'growing'
      if (changePct < -5) return 'shrinking'
      return 'flat'
    }
    const thisMonthByTenant = new Map(thisMonth.by_tenant.map((t) => [t.tenant_id, t.revenue_cents]))

    const revenueByTenant = tenantId ? selected.by_tenant.filter((t) => t.tenant_id === tenantId) : selected.by_tenant

    return NextResponse.json({
      period,
      year,
      totalRevenue: totalRevenue / 100,
      thisMonthRevenue: thisMonthRevenue / 100,
      lastMonthRevenue: lastMonthRevenue / 100,
      growthPercent,
      integrity,
      revenueByTenant: revenueByTenant.map((t) => ({
        tenant_id: t.tenant_id,
        tenant_name: t.tenant_name,
        revenue: t.revenue_cents / 100,
        margin_bps: t.margin_bps,
        health: healthDirection(t.tenant_id, thisMonthByTenant.get(t.tenant_id) || 0),
      })),
      monthlyTrend: monthlyTrend.map((m) => ({ month: m.month, revenue: m.revenue_cents / 100 })),
      excludedTestTenantCount: includeTest || tenantId ? 0 : allTenants.filter((t) => isTestTenant(t.name)).length,
      source: 'ledger',
    })
  } catch (err) {
    console.error('GET /api/admin/finance', err)
    return NextResponse.json({ error: 'Failed to load finance data' }, { status: 500 })
  }
}
