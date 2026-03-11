'use client'

import { useState, useEffect } from 'react'

interface FinanceSummary {
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  growthPercent: number
  revenueByTenant: { tenant_id: string; tenant_name: string; revenue: number; jobs: number }[]
  monthlyTrend: { month: string; revenue: number }[]
}

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
]

export default function AdminFinancePage() {
  useEffect(() => { document.title = 'Finance | Admin' }, [])

  const [period, setPeriod] = useState('month')
  const [tenantFilter, setTenantFilter] = useState('')
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTenants()
  }, [])

  useEffect(() => {
    loadFinance()
  }, [period, tenantFilter])

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.ok) {
        const list = await res.json()
        setTenants(list)
      }
    } catch (err) {
      console.error('Failed to load tenants:', err)
    }
  }

  const loadFinance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (tenantFilter) params.set('tenant_id', tenantFilter)
      const res = await fetch(`/api/admin/finance?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Failed to load finance data:', err)
    }
    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const maxTrend = data?.monthlyTrend ? Math.max(...data.monthlyTrend.map(m => m.revenue), 1) : 1

  return (
    <main className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Finance</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white"
          >
            <option value="">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-gray-500 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading finance data...</div>
      ) : !data ? (
        <div className="text-center py-16 text-gray-500">Failed to load finance data</div>
      ) : (
        <>
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">This Month</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.thisMonthRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Last Month</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.lastMonthRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Growth</p>
              <p className={`text-2xl font-bold mt-1 ${data.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.growthPercent >= 0 ? '+' : ''}{data.growthPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Revenue by Tenant */}
          <div className="bg-white rounded-xl border border-gray-200 mb-8">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-slate-900">Revenue by Tenant</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                    <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Revenue</th>
                    <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Jobs</th>
                    <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Avg/Job</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueByTenant.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">No revenue data</td>
                    </tr>
                  ) : (
                    data.revenueByTenant.map(t => (
                      <tr key={t.tenant_id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{t.tenant_name}</td>
                        <td className="px-5 py-3 text-sm text-right text-slate-900">{formatCurrency(t.revenue)}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-600">{t.jobs}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-600">
                          {t.jobs > 0 ? formatCurrency(t.revenue / t.jobs) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 12-Month Trend */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-slate-900">12-Month Revenue Trend</h3>
            </div>
            <div className="p-5">
              {data.monthlyTrend.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No trend data available</div>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {data.monthlyTrend.map((m, i) => {
                    const height = maxTrend > 0 ? (m.revenue / maxTrend) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {m.revenue > 0 ? formatCurrency(m.revenue) : ''}
                        </span>
                        <div
                          className="w-full bg-teal-600 rounded-t-md transition-all hover:bg-teal-700 min-h-[2px]"
                          style={{ height: `${Math.max(height, 1)}%` }}
                          title={`${m.month}: ${formatCurrency(m.revenue)}`}
                        />
                        <span className="text-xs text-gray-400 mt-1">{m.month}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
