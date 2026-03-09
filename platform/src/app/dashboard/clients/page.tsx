'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { downloadCSV } from '@/lib/csv'
import { formatPhone } from '@/lib/phone'
import AddressAutocomplete from '@/components/address-autocomplete'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  source: string | null
  created_at: string
}

type Stats = {
  total: number
  active: number
  newThisMonth: number
  inactive: number
  referrals: number
  totalRevenue: number
  avgLtv: number
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'do_not_contact', label: 'Do Not Contact' },
]

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-gray-700 text-gray-400',
  do_not_contact: 'bg-red-500/20 text-red-400',
}

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  import: 'Import',
  referral: 'Referral',
  portal: 'Portal',
  website: 'Website',
  unknown: 'Unknown',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', source: 'manual' })
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')

  const clientsSettings = usePageSettings('clients')

  useEffect(() => {
    fetch('/api/clients/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    params.set('page', String(page))
    fetch(`/api/clients?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setClients(data.clients || [])
        setTotal(data.total || 0)
      })
  }, [search, statusFilter, page])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { client } = await res.json()
      setClients((prev) => [client, ...prev])
      setShowAdd(false)
      setForm({ name: '', email: '', phone: '', address: '', source: 'manual' })
      // Refresh stats
      fetch('/api/clients/stats').then(r => r.json()).then(setStats).catch(() => {})
    }
    setSaving(false)
  }

  return (
    <div>
      {/* PORTAL LINK */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Client Portal:</span>
          <code className="text-blue-400 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/portal` : '/portal'}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/portal`)} className="text-xs text-gray-400 hover:text-white transition-colors">Copy Link</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Clients</h2>
            <p className="text-sm text-gray-500">{total} total clients</p>
          </div>
          <PageSettingsGear open={clientsSettings.open} setOpen={clientsSettings.setOpen} title="Clients" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(clients as unknown as Record<string, unknown>[], 'clients', ['name', 'email', 'phone', 'address', 'status', 'source', 'created_at'])}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg"
          >
            Export CSV
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
            {showAdd ? 'Cancel' : '+ Add Client'}
          </button>
        </div>
      </div>

      <PageSettingsPanel
        {...clientsSettings}
        title="Clients"
        tips={[
          'Add clients manually or import via CSV in Settings > Tools',
          'Track client lifecycle: New > Active > At-Risk > Churned',
          'Click any client to see their full profile, booking history and notes',
          'Use the search bar to find clients by name, email, or phone',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Default Client Status</label>
              <select
                value={(config.default_status as string) || 'active'}
                onChange={(e) => updateConfig('default_status', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              >
                <option value="active">Active</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div className="border-t border-gray-800" />
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Days inactive before At-Risk</label>
              <input
                type="number"
                min="1"
                value={(config.at_risk_days as number) || 30}
                onChange={(e) => updateConfig('at_risk_days', parseInt(e.target.value) || 30)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
              />
              <span className="text-xs text-gray-500 ml-2">days</span>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Days inactive before Churned</label>
              <input
                type="number"
                min="1"
                value={(config.churned_days as number) || 60}
                onChange={(e) => updateConfig('churned_days', parseInt(e.target.value) || 60)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
              />
              <span className="text-xs text-gray-500 ml-2">days</span>
            </div>
            <div className="border-t border-gray-800" />
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-gray-300">Require phone number</label>
              <button
                onClick={() => updateConfig('require_phone', !config.require_phone)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.require_phone ? 'bg-blue-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.require_phone ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-gray-300">Require email address</label>
              <button
                onClick={() => updateConfig('require_email', !config.require_email)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.require_email ? 'bg-blue-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.require_email ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* STATS CARDS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'border-l-gray-400' },
            { label: 'Active', value: stats.active, color: 'border-l-green-500' },
            { label: 'New', value: stats.newThisMonth, color: 'border-l-blue-500', sub: 'this month' },
            { label: 'Inactive', value: stats.inactive, color: 'border-l-gray-300' },
            { label: 'Referrals', value: stats.referrals, color: 'border-l-purple-500' },
            { label: 'Avg LTV', value: fmt(stats.avgLtv), color: 'border-l-orange-500' },
          ].map((card) => (
            <div key={card.label} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${card.color} p-4`}>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-white mt-1">{card.value}</p>
              {card.sub && <p className="text-[10px] text-gray-400">{card.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ADD FORM */}
      {showAdd && (
        <form onSubmit={addClient} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Add Client</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Name *</label>
              <input placeholder="Jane Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Email</label>
              <input placeholder="jane@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Phone</label>
              <input placeholder="(555) 123-4567" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Address</label>
              <AddressAutocomplete value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, City, State" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="manual">Manual</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="portal">Portal</option>
                <option value="import">Import</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.name}
              className="bg-white text-gray-900 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Client'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* SEARCH + STATUS TABS */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900'
                  : 'text-gray-500 hover:bg-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BULK ACTIONS */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-white font-medium">{selected.size} selected</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Bulk action...</option>
            <option value="active">Set Active</option>
            <option value="inactive">Set Inactive</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={async () => {
            if (!bulkAction) return
            if (bulkAction === 'delete' && !confirm(`Delete ${selected.size} clients?`)) return
            for (const id of selected) {
              if (bulkAction === 'delete') {
                await fetch(`/api/clients/${id}`, { method: 'DELETE' })
              } else {
                await fetch(`/api/clients/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: bulkAction }),
                })
              }
            }
            setSelected(new Set())
            setBulkAction('')
            // Refresh
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (statusFilter) params.set('status', statusFilter)
            params.set('page', String(page))
            fetch(`/api/clients?${params}`).then(r => r.json()).then(data => { setClients(data.clients || []); setTotal(data.total || 0) })
            fetch('/api/clients/stats').then(r => r.json()).then(setStats).catch(() => {})
          }} disabled={!bulkAction}
            className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
            Apply
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-white ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500">
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={selected.size === clients.length && clients.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(clients.map(c => c.id)) : new Set())}
                  className="rounded border-gray-700 bg-gray-800"
                />
              </th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <input type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selected)
                      e.target.checked ? next.add(c.id) : next.delete(c.id)
                      setSelected(next)
                    }}
                    className="rounded border-gray-700 bg-gray-800"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/clients/${c.id}`} className="flex items-center gap-3 group">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-blue-400 truncate">{c.name}</p>
                      {c.address && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{c.address}</p>}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.email && <p className="text-sm text-gray-400">{c.email}</p>}
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  {!c.email && !c.phone && <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{sourceLabels[c.source || 'unknown'] || c.source}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status] || 'bg-gray-700 text-gray-400'}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No clients found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-800">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} of {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}
            className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-800">Next</button>
        </div>
      )}
    </div>
  )
}
