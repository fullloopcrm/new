'use client'

import { useEffect, useState } from 'react'
import { SALES_STATUS_COLORS } from '@/lib/constants'

type Tenant = {
  id: string
  name: string
  slug: string
  plan: string | null
  status: string
  created_at: string
  owner_email: string | null
  owner_name: string | null
  billing: {
    billing_email?: string
    stripe_customer_id?: string
    subscription_status?: string
  }
}

type Stats = {
  total: number
  pending: number
  active: number
  suspended: number
  cancelled: number
}

const statusColors = SALES_STATUS_COLORS

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
]

const plans = ['free', 'starter', 'pro', 'enterprise']

export default function SalesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, active: 0, suspended: 0, cancelled: 0 })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = () => {
    fetch('/api/admin/sales')
      .then((r) => r.json())
      .then((data) => {
        setTenants(data.tenants || [])
        setStats({ total: data.total, pending: data.pending, active: data.active, suspended: data.suspended, cancelled: data.cancelled })
        setLoading(false)
      })
  }

  useEffect(() => { fetchData() }, [])

  const handleActivate = async (tenantId: string) => {
    setUpdating(tenantId)
    await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    fetchData()
    setUpdating(null)
  }

  const handleStatusChange = async (tenantId: string, status: string) => {
    setUpdating(tenantId)
    await fetch('/api/admin/sales', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, status }),
    })
    fetchData()
    setUpdating(null)
  }

  const handlePlanChange = async (tenantId: string, plan: string) => {
    setUpdating(tenantId)
    await fetch('/api/admin/sales', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, plan }),
    })
    fetchData()
    setUpdating(null)
  }

  const filtered = tenants.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = t.name?.toLowerCase().includes(q)
      const emailMatch = t.owner_email?.toLowerCase().includes(q)
      const ownerMatch = t.owner_name?.toLowerCase().includes(q)
      if (!nameMatch && !emailMatch && !ownerMatch) return false
    }
    return true
  })

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Sales &amp; Billing</h1>
        <p className="text-sm text-slate-500">Activate accounts and manage subscriptions</p>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Accounts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-600 uppercase tracking-wide">Pending Activation</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600 uppercase tracking-wide">Suspended</p>
          <p className="text-2xl font-bold text-red-700">{stats.suspended}</p>
        </div>
      </div>

      {/* SEARCH + FILTER TABS */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400"
        />
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Business Name</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-900">{t.owner_name || '--'}</p>
                  <p className="text-xs text-slate-500">{t.owner_email || '--'}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={t.plan || 'free'}
                    onChange={(e) => handlePlanChange(t.id, e.target.value)}
                    disabled={updating === t.id}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    {plans.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status] || 'bg-slate-200 text-slate-400'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {t.status === 'pending' && (
                      <button
                        onClick={() => handleActivate(t.id)}
                        disabled={updating === t.id}
                        className="px-3 py-1 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                    {t.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(t.id, 'suspended')}
                        disabled={updating === t.id}
                        className="px-3 py-1 text-xs font-medium rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {t.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(t.id, 'active')}
                        disabled={updating === t.id}
                        className="px-3 py-1 text-xs font-medium rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  {search || filterStatus !== 'all' ? 'No matching accounts' : 'No accounts yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
