'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  setup: 'bg-teal-500/20 text-teal-400',
  suspended: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const planColors: Record<string, string> = {
  pro: 'bg-teal-500/20 text-teal-400',
  starter: 'bg-green-500/20 text-green-400',
  free: 'bg-slate-600 text-slate-400',
}

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

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Tenants</h1>
        <p className="text-sm text-slate-400">{tenants.length} total tenants</p>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search name or industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-gray-600"
        />
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
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
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{t.name}</p>
                  {t.email && <p className="text-xs text-slate-400">{t.email}</p>}
                </td>
                <td className="px-4 py-3 text-slate-400 capitalize">{t.industry?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${planColors[t.plan || 'free'] || 'bg-slate-600 text-slate-400'}`}>
                    {t.plan || 'free'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status] || 'bg-slate-600 text-slate-400'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{t.team_size || 'solo'}</td>
                <td className="px-4 py-3 text-slate-400 font-mono">{t.tenant_members?.length || 0}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${t.id}`} className="text-xs text-teal-400 hover:text-teal-300">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
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
