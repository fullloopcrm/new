'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Business = {
  id: string
  name: string
  slug: string
  industry: string
  status: string
  plan: string
  zip_code: string | null
  team_size: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  billing_status: string
  monthly_rate: number
  setup_fee: number
  payment_method: string | null
  last_active_at: string | null
  created_at: string
  tenant_members: { id: string }[]
  tenant_invites: { id: string; accepted: boolean }[]
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  setup: 'bg-blue-500/20 text-blue-400',
  suspended: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  deleted: 'bg-slate-600 text-slate-400',
}

const billingColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  setup: 'bg-blue-500/20 text-blue-400',
  past_due: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-slate-600 text-slate-400',
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'setup', label: 'Setup' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function BusinessesPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBilling, setFilterBilling] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/businesses')
      .then((r) => r.json())
      .then((data) => {
        setBusinesses(data.businesses || [])
        setLoading(false)
      })
  }, [])

  const filtered = businesses.filter((b) => {
    if (search) {
      const q = search.toLowerCase()
      const match =
        b.name.toLowerCase().includes(q) ||
        b.industry.toLowerCase().includes(q) ||
        (b.owner_name || '').toLowerCase().includes(q) ||
        (b.owner_email || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (filterBilling !== 'all' && (b.billing_status || 'setup') !== filterBilling) return false
    return true
  })

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Stats
  const activeCount = businesses.filter(b => b.status === 'active').length
  const setupCount = businesses.filter(b => b.status === 'setup').length
  const mrr = businesses.filter(b => b.billing_status === 'active').reduce((s, b) => s + (b.monthly_rate || 0), 0)

  if (loading) return <p className="text-slate-400">Loading businesses...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-sm text-slate-400">{businesses.length} total &middot; {activeCount} active &middot; {setupCount} in setup</p>
        </div>
        <Link href="/admin/businesses/new"
          className="bg-blue-600 hover:bg-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Business
        </Link>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: businesses.length, color: 'border-l-gray-500' },
          { label: 'Active', value: activeCount, color: 'border-l-green-500' },
          { label: 'In Setup', value: setupCount, color: 'border-l-blue-500' },
          { label: 'MRR', value: `$${mrr.toLocaleString()}`, color: 'border-l-purple-500' },
        ].map((card) => (
          <div key={card.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search name, industry, owner..."
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
        <select
          value={filterBilling}
          onChange={(e) => setFilterBilling(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Billing</option>
          <option value="setup">Setup</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Billing</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Last Active</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const invitesSent = b.tenant_invites?.length || 0
              const invitesAccepted = b.tenant_invites?.filter((i) => i.accepted).length || 0
              return (
                <tr
                  key={b.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/businesses/${b.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{b.industry?.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300">{b.owner_name || '—'}</p>
                    {b.owner_email && <p className="text-xs text-slate-400">{b.owner_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[b.status] || 'bg-slate-600 text-slate-400'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${billingColors[b.billing_status] || 'bg-slate-600 text-slate-400'}`}>
                      {b.billing_status || 'setup'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {b.monthly_rate ? `$${b.monthly_rate}/mo` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span>{b.tenant_members?.length || 0}</span>
                    {invitesSent > 0 && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({invitesAccepted}/{invitesSent} inv)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {timeAgo(b.last_active_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  {search || filterStatus !== 'all' || filterBilling !== 'all'
                    ? 'No matching businesses'
                    : 'No businesses yet — add your first one'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
