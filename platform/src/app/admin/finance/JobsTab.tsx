'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, StatCard, Panel, EmptyState } from './finance-ui'

interface JobsData {
  jobCount: number
  totalContract: number
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  byTenant: { tenant_id: string; tenant_name: string; jobCount: number; contract: number; budgeted: number; actual: number; variance: number }[]
  worstVariance: {
    job_id: string
    tenant_name: string
    title: string
    contract: number
    budgeted: number
    actual: number
    variance: number
    projectedMarginBps: number | null
  }[]
}

export default function JobsTab() {
  const [data, setData] = useState<JobsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/admin/finance/jobs')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => console.error('Failed to load job costing data:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <div className="text-center py-16 text-gray-500">Loading job costing data...</div>
  if (!data) return <div className="text-center py-16 text-gray-500">Failed to load job costing data</div>

  return (
    <>
      <div className="mb-4 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
        Budget actuals are auto-rolled from job-scoped expenses (real, not hand-typed), but only jobs with a saved Budget Template applied
        show here — {data.jobCount} of them platform-wide.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Jobs w/ Budget" value={String(data.jobCount)} />
        <StatCard label="Contracted Total" value={formatCurrency(data.totalContract)} />
        <StatCard label="Budgeted Cost" value={formatCurrency(data.totalBudgeted)} />
        <StatCard label="Actual Cost" value={formatCurrency(data.totalActual)} tone={data.totalVariance >= 0 ? 'good' : 'bad'} />
      </div>

      <Panel title="Job Costing by Tenant">
        {data.byTenant.length === 0 ? (
          <EmptyState>No budgeted jobs found</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Jobs</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Contract</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Budgeted</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Actual</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {data.byTenant.map((t) => (
                  <tr key={t.tenant_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{t.tenant_name}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{t.jobCount}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-900">{formatCurrency(t.contract)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{formatCurrency(t.budgeted)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{formatCurrency(t.actual)}</td>
                    <td className={`px-5 py-3 text-sm text-right font-medium ${t.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(t.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Worst Budget Variance (top 10 jobs over budget)">
        {data.worstVariance.length === 0 ? (
          <EmptyState>No variance data available</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Job</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Budgeted</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Actual</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Variance</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Proj. Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.worstVariance.map((j) => (
                  <tr key={j.job_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{j.title}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{j.tenant_name}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{formatCurrency(j.budgeted)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{formatCurrency(j.actual)}</td>
                    <td className="px-5 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(j.variance)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">
                      {j.projectedMarginBps != null ? `${(j.projectedMarginBps / 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
