'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, StatCard, Panel, EmptyState, BarTrend } from './finance-ui'

interface TenantMargin {
  tenant_id: string
  tenant_name: string
  revenue: number
  netProfit: number
  marginBps: number
}

interface MarginData {
  revenue: number
  cogs: number
  grossProfit: number
  grossMarginBps: number
  opex: number
  netProfit: number
  netMarginBps: number
  expenseByCategory: { category: string; amount: number }[]
  worstMargin: TenantMargin[]
  bestMargin: TenantMargin[]
  trend: { month: string; revenue: number; netProfit: number; marginBps: number }[]
}

export default function MarginTab({ period }: { period: string }) {
  const [data, setData] = useState<MarginData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/finance/margin?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => console.error('Failed to load margin data:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  if (loading) return <div className="text-center py-16 text-gray-500">Loading margin data...</div>
  if (!data) return <div className="text-center py-16 text-gray-500">Failed to load margin data</div>

  const MarginList = ({ title, rows }: { title: string; rows: TenantMargin[] }) => (
    <Panel title={title}>
      {rows.length === 0 ? (
        <EmptyState>No data for this period</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Revenue</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Net Profit</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.tenant_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900">{t.tenant_name}</td>
                  <td className="px-5 py-3 text-sm text-right text-slate-900">{formatCurrency(t.revenue)}</td>
                  <td className={`px-5 py-3 text-sm text-right ${t.netProfit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatCurrency(t.netProfit)}</td>
                  <td className={`px-5 py-3 text-sm text-right font-medium ${t.marginBps >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(t.marginBps / 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Gross Profit" value={formatCurrency(data.grossProfit)} />
        <StatCard label="Gross Margin" value={`${(data.grossMarginBps / 100).toFixed(1)}%`} tone={data.grossMarginBps >= 0 ? 'good' : 'bad'} />
        <StatCard label="Net Profit" value={formatCurrency(data.netProfit)} tone={data.netProfit >= 0 ? 'good' : 'bad'} />
        <StatCard label="Net Margin" value={`${(data.netMarginBps / 100).toFixed(1)}%`} tone={data.netMarginBps >= 0 ? 'good' : 'bad'} />
      </div>

      <Panel title="Net Margin Trend (Jan–Dec)">
        {data.trend.length === 0 ? <EmptyState>No trend data available</EmptyState> : <BarTrend points={data.trend} valueKey="netProfit" />}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
        <MarginList title="Worst Margin (bottom 5 tenants)" rows={data.worstMargin} />
        <MarginList title="Best Margin (top 5 tenants)" rows={data.bestMargin} />
      </div>

      <Panel title="Expenses by Category (COGS + Opex)">
        {data.expenseByCategory.length === 0 ? (
          <EmptyState>No expenses posted for this period</EmptyState>
        ) : (
          <div className="p-5 space-y-2">
            {data.expenseByCategory.slice(0, 12).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.category}</span>
                <span className="font-medium text-slate-900">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
