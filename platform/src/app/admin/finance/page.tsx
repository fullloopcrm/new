'use client'

import { useEffect, useState } from 'react'
import { PERIODS } from './finance-ui'
import RevenueTab from './RevenueTab'
import MarginTab from './MarginTab'
import JobsTab from './JobsTab'
import MoreTab from './MoreTab'

const TABS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'margin', label: 'Revenue Margin' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'more', label: 'More' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AdminFinancePage() {
  useEffect(() => {
    document.title = 'Finance | Admin'
  }, [])

  const [activeTab, setActiveTab] = useState<TabId>('revenue')
  const [period, setPeriod] = useState('month')
  const [tenantFilter, setTenantFilter] = useState('')
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTenants)
      .catch((err) => console.error('Failed to load tenants:', err))
  }, [])

  return (
    <main className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-2xl font-semibold text-slate-900">Finance</h2>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'revenue' && (
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white"
            >
              <option value="">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {(activeTab === 'revenue' || activeTab === 'margin' || activeTab === 'more') && (
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    period === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id ? 'border-teal-600 text-slate-900' : 'border-transparent text-gray-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'revenue' && <RevenueTab period={period} tenantFilter={tenantFilter} />}
      {activeTab === 'margin' && <MarginTab period={period} />}
      {activeTab === 'jobs' && <JobsTab />}
      {activeTab === 'more' && <MoreTab period={period} />}
    </main>
  )
}
