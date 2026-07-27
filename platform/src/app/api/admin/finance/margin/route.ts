/**
 * Platform Finance — Margin tab. Gross/net margin per tenant and platform-
 * wide, COGS/opex breakdown by category, and a margin trend over the
 * calendar year — all ledger-sourced (see platform-reports.ts), so this
 * agrees exactly with the Revenue tab's numbers (same source query, sliced
 * differently) instead of a second, independently-computed margin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { platformProfitAndLoss, platformMonthlyTrend } from '@/lib/finance/platform-reports'

function periodBounds(period: string): { from: string; to: string } {
  const now = new Date()
  const toISODate = (d: Date) => d.toISOString().slice(0, 10)
  let from: Date

  if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  else if (period === 'week') {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  } else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else from = new Date(now.getFullYear(), 0, 1)

  return { from: toISODate(from), to: toISODate(now) }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const period = url.searchParams.get('period') || 'month'
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear()
  const { from, to } = periodBounds(period)

  try {
    const [pnl, trend] = await Promise.all([platformProfitAndLoss(from, to), platformMonthlyTrend(year)])

    const byMargin = [...pnl.by_tenant].sort((a, b) => a.margin_bps - b.margin_bps)

    return NextResponse.json({
      period,
      year,
      revenue: pnl.revenue_cents / 100,
      cogs: pnl.cogs_cents / 100,
      grossProfit: pnl.gross_profit_cents / 100,
      grossMarginBps: pnl.revenue_cents > 0 ? Math.round((pnl.gross_profit_cents / pnl.revenue_cents) * 10000) : 0,
      opex: pnl.opex_cents / 100,
      netProfit: pnl.net_profit_cents / 100,
      netMarginBps: pnl.margin_bps,
      expenseByCategory: pnl.expense_by_category.map((c) => ({ category: c.category, amount: c.amount_cents / 100 })),
      worstMargin: byMargin.slice(0, 5).map((t) => ({
        tenant_id: t.tenant_id,
        tenant_name: t.tenant_name,
        revenue: t.revenue_cents / 100,
        netProfit: t.net_profit_cents / 100,
        marginBps: t.margin_bps,
      })),
      bestMargin: byMargin
        .slice(-5)
        .reverse()
        .map((t) => ({
          tenant_id: t.tenant_id,
          tenant_name: t.tenant_name,
          revenue: t.revenue_cents / 100,
          netProfit: t.net_profit_cents / 100,
          marginBps: t.margin_bps,
        })),
      trend: trend.map((m) => ({
        month: m.month,
        revenue: m.revenue_cents / 100,
        netProfit: m.net_profit_cents / 100,
        marginBps: m.revenue_cents > 0 ? Math.round((m.net_profit_cents / m.revenue_cents) * 10000) : 0,
      })),
      source: 'ledger',
    })
  } catch (err) {
    console.error('GET /api/admin/finance/margin', err)
    return NextResponse.json({ error: 'Failed to load margin data' }, { status: 500 })
  }
}
