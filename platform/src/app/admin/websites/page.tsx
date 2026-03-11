'use client'

import { useEffect, useState } from 'react'

interface Website {
  id: string
  tenant_id: string
  tenant_name: string
  domain: string
  status: 'active' | 'pending_dns' | 'error'
  visits_total: number
  visits_30d: number
  visits_7d: number
  ssl_active: boolean
  created_at: string
}

interface Tenant {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 20

export default function AdminWebsitesPage() {
  useEffect(() => { document.title = 'Websites | FullLoop Admin' }, [])

  const [websites, setWebsites] = useState<Website[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newTenantId, setNewTenantId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/websites')
      if (res.ok) {
        const data = await res.json()
        setWebsites(data.websites || [])
        setTenants(data.tenants || [])
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err)
    }
    setLoading(false)
  }

  const addDomain = async () => {
    if (!newDomain.trim() || !newTenantId) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim(), tenant_id: newTenantId })
      })
      if (res.ok) {
        setShowAddForm(false)
        setNewDomain('')
        setNewTenantId('')
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to add domain')
      }
    } catch (err) {
      console.error('Failed to add domain:', err)
    }
    setSaving(false)
  }

  const filteredWebsites = websites.filter(site => {
    const matchesSearch = site.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTenant = selectedTenant === 'all' || site.tenant_id === selectedTenant
    const matchesStatus = selectedStatus === 'all' || site.status === selectedStatus
    return matchesSearch && matchesTenant && matchesStatus
  })

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedTenant, selectedStatus])

  const totalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE)
  const paginatedWebsites = filteredWebsites.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const activeCount = websites.filter(w => w.status === 'active').length
  const pendingCount = websites.filter(w => w.status === 'pending_dns').length
  const errorCount = websites.filter(w => w.status === 'error').length
  const totalVisits30d = websites.reduce((sum, w) => sum + (w.visits_30d || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</span>
      case 'pending_dns':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Pending DNS</span>
      case 'error':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Error</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">{status}</span>
    }
  }

  const formatNumber = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString()

  return (
    <main className="p-3 md:p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Website Network</h2>
          <p className="text-sm text-gray-500">Manage tenant domains and monitor traffic across all businesses</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium text-sm shadow-sm transition-colors"
        >
          + Add Domain
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="rounded-xl p-4 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1">Total Domains</p>
          <p className="text-3xl font-bold">{websites.length}</p>
          <p className="text-xs text-white/50 mt-1">All registered</p>
        </div>
        <div className="rounded-xl p-4 bg-green-50 border border-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-700">{activeCount}</p>
          <p className="text-xs text-green-400 mt-1">Live & serving</p>
        </div>
        <div className="rounded-xl p-4 bg-yellow-50 border border-yellow-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-yellow-600 mb-1">Pending DNS</p>
          <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
          <p className="text-xs text-yellow-400 mt-1">{errorCount > 0 ? `${errorCount} errors` : 'Awaiting setup'}</p>
        </div>
        <div className="rounded-xl p-4 bg-teal-50 border border-teal-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-teal-600 mb-1">Visits (30d)</p>
          <p className="text-3xl font-bold text-teal-700">{formatNumber(totalVisits30d)}</p>
          <p className="text-xs text-teal-400 mt-1">Across all domains</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search domains or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
          />
        </div>
        <select
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
        >
          <option value="all">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending_dns">Pending DNS</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Domain List Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900/50 flex items-center gap-2">
          <span>DOMAIN PORTFOLIO</span>
          <span className="text-xs font-normal bg-slate-900/5 text-slate-900/60 px-2 py-0.5 rounded-full">
            {filteredWebsites.length} domains
          </span>
        </h3>
        {totalPages > 1 && (
          <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Domain Table */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-5 py-3.5">Domain</th>
                    <th className="px-5 py-3.5">Tenant</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">SSL</th>
                    <th className="px-5 py-3.5 text-right">Visits (7d)</th>
                    <th className="px-5 py-3.5 text-right">Visits (30d)</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedWebsites.map(site => (
                    <tr key={site.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-900 hover:text-teal-600 font-mono text-sm transition-colors"
                        >
                          {site.domain}
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-600">{site.tenant_name}</span>
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(site.status)}</td>
                      <td className="px-5 py-3.5">
                        {site.ssl_active ? (
                          <span className="text-green-600 text-sm font-medium">Secure</span>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-900">{formatNumber(site.visits_7d || 0)}</td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-900">{formatNumber(site.visits_30d || 0)}</td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-500">{formatNumber(site.visits_total || 0)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-400">
                        {new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredWebsites.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">&#127760;</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No websites found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-gray-100 pt-6 gap-3">
              <p className="text-xs text-gray-400">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                {' '}-{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredWebsites.length)}
                {' '}of {filteredWebsites.length} domains
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-slate-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true
                    if (page === 1 || page === totalPages) return true
                    if (Math.abs(page - currentPage) <= 1) return true
                    return false
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(page)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-300">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition ${
                          currentPage === item
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'border border-gray-200 text-slate-900 hover:bg-gray-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-slate-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Domain Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Add New Domain</h3>
            <p className="text-sm text-gray-400 mb-5">Register a domain for a tenant business</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Tenant *</label>
                <select
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition"
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Domain *</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition"
                  placeholder="example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addDomain}
                disabled={saving || !newDomain.trim() || !newTenantId}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Domain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
