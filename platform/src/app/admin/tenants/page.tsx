'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TENANT_STATUS_COLORS, PLAN_COLORS } from '@/lib/constants'

type Tenant = {
  id: string
  name: string
  slug: string
  industry: string
  status: string
  plan: string
  zip_code: string | null
  team_size: string
  email: string | null
  phone: string | null
  created_at: string
  tenant_members: { id: string }[]
}

const statusColors = TENANT_STATUS_COLORS

const planColors = PLAN_COLORS

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'setup', label: 'Setup' },
  { value: 'suspended', label: 'Suspended' },
]

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((data) => { setTenants(data.tenants || []); setLoading(false) })
  }, [])

  const filtered = tenants.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.industry.includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPlan !== 'all' && (t.plan || 'free') !== filterPlan) return false
    return true
  })

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Tenants</h1>
        <p className="text-sm text-slate-500">{tenants.length} total tenants</p>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search name or industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400"
        />
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  {t.email && <p className="text-xs text-slate-500">{t.email}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 capitalize">{t.industry?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${planColors[t.plan || 'free'] || 'bg-slate-200 text-slate-400'}`}>
                    {t.plan || 'free'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status] || 'bg-slate-200 text-slate-400'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.team_size || 'solo'}</td>
                <td className="px-4 py-3 text-slate-600 font-mono">{t.tenant_members?.length || 0}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${t.id}`} className="text-xs text-teal-600 hover:text-teal-700">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                  {search || filterStatus !== 'all' || filterPlan !== 'all' ? 'No matching tenants' : 'No tenants yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
