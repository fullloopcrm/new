'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, StatCard, Panel, EmptyState, BarTrend } from './finance-ui'

interface RevenueData {
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  growthPercent: number
  revenueByTenant: { tenant_id: string; tenant_name: string; revenue: number; margin_bps: number }[]
  monthlyTrend: { month: string; revenue: number }[]
}

export default function RevenueTab({ period, tenantFilter }: { period: string; tenantFilter: string }) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (tenantFilter) params.set('tenant_id', tenantFilter)
    fetch(`/api/admin/finance?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => console.error('Failed to load revenue data:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, tenantFilter])

  if (loading) return <div className="text-center py-16 text-gray-500">Loading revenue data...</div>
  if (!data) return <div className="text-center py-16 text-gray-500">Failed to load revenue data</div>

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <StatCard label="This Month" value={formatCurrency(data.thisMonthRevenue)} />
        <StatCard label="Last Month" value={formatCurrency(data.lastMonthRevenue)} />
        <StatCard
          label="Growth vs. Last Month"
          value={`${data.growthPercent >= 0 ? '+' : ''}${data.growthPercent.toFixed(1)}%`}
          tone={data.growthPercent >= 0 ? 'good' : 'bad'}
        />
      </div>

      <Panel title="Revenue by Tenant (ledger)">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Revenue</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Net Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.revenueByTenant.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400">No revenue posted for this period</td>
                </tr>
              ) : (
                data.revenueByTenant.map((t) => (
                  <tr key={t.tenant_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{t.tenant_name}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-900">{formatCurrency(t.revenue)}</td>
                    <td className={`px-5 py-3 text-sm text-right font-medium ${t.margin_bps >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(t.margin_bps / 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`Revenue Trend (${new Date().getFullYear()}, Jan–Dec)`}>
        {data.monthlyTrend.length === 0 ? <EmptyState>No trend data available</EmptyState> : <BarTrend points={data.monthlyTrend} valueKey="revenue" />}
      </Panel>
    </>
  )
}
