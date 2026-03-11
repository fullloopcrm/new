'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string | null
  created_at: string
  status: string | null
  tenant_id: string
  tenants: { id: string; name: string } | null
  totalBookings: number
  totalSpent: number
  lastBooking: string | null
  daysSinceLastBooking: number | null
}

export default function AdminClientsPage() {
  useEffect(() => { document.title = 'Clients | FullLoop Admin' }, [])

  const [clients, setClients] = useState<Client[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'new'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastBooking' | 'totalBookings' | 'created_at'>('created_at')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => { loadClients(); loadTenants() }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } catch (err) { console.error('Failed to load clients:', err) }
    setLoading(false)
  }

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) setTenants(await res.json())
    } catch (err) { console.error('Failed to load tenants:', err) }
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(0)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getClientStatus = (client: Client): 'new' | 'active' | 'inactive' => {
    if (client.totalBookings === 0) return 'new'
    if (client.daysSinceLastBooking === null) return 'new'
    if (client.daysSinceLastBooking <= 60) return 'active'
    return 'inactive'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full text-[11px] font-medium border border-teal-200"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>New</span>
      case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[11px] font-medium border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Active</span>
      case 'inactive': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>Inactive</span>
      default: return null
    }
  }

  const filteredClients = clients
    .filter(c => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)
      if (!matchesSearch) return false
      if (selectedTenant && c.tenant_id !== selectedTenant) return false
      if (filter === 'all') return true
      return getClientStatus(c) === filter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '')
        case 'totalSpent': return b.totalSpent - a.totalSpent
        case 'totalBookings': return b.totalBookings - a.totalBookings
        case 'lastBooking':
          if (!a.lastBooking && !b.lastBooking) return 0
          if (!a.lastBooking) return 1
          if (!b.lastBooking) return -1
          return new Date(b.lastBooking).getTime() - new Date(a.lastBooking).getTime()
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return 0
      }
    })

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const stats = {
    total: clients.length,
    active: clients.filter(c => getClientStatus(c) === 'active').length,
    inactive: clients.filter(c => getClientStatus(c) === 'inactive').length,
    newThisMonth: clients.filter(c => new Date(c.created_at) >= monthStart).length,
    totalRevenue: clients.reduce((sum, c) => sum + c.totalSpent, 0),
  }

  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(filteredClients.length / pageSize)

  return (
    <main className="p-3 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">CLIENTS</h2>
          <p className="text-2xl font-bold text-slate-900">{clients.length} <span className="text-base font-normal text-gray-400">total clients</span></p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 mt-4">
        <button onClick={() => setFilter('all')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'all' ? 'ring-2 ring-slate-900 shadow-md' : 'shadow-sm'} bg-gray-50`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </button>
        <button onClick={() => setFilter('active')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'active' ? 'ring-2 ring-green-500 shadow-md' : 'shadow-sm'} bg-green-50`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </button>
        <button onClick={() => setFilter('inactive')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'inactive' ? 'ring-2 ring-gray-400 shadow-md' : 'shadow-sm'} bg-gray-50`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
        </button>
        <button onClick={() => setFilter('new')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'new' ? 'ring-2 ring-teal-600 shadow-md' : 'shadow-sm'} bg-teal-50`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">New This Month</p>
          <p className="text-2xl font-bold text-teal-700">{stats.newThisMonth}</p>
        </button>
        <div className="p-4 rounded-xl bg-emerald-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
          />
        </div>
        <select
          value={selectedTenant}
          onChange={(e) => { setSelectedTenant(e.target.value); setCurrentPage(1) }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
        >
          <option value="">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
        >
          <option value="created_at">Newest Added</option>
          <option value="name">Name A-Z</option>
          <option value="lastBooking">Last Booking</option>
          <option value="totalSpent">Total Spent</option>
          <option value="totalBookings">Total Bookings</option>
        </select>
      </div>

      {filter !== 'all' && (
        <button onClick={() => setFilter('all')} className="mb-4 text-xs font-medium text-slate-900/70 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
          &larr; Show all clients
        </button>
      )}

      {/* Results count */}
      {filteredClients.length !== clients.length && (
        <p className="text-sm text-gray-500 mb-3">Showing {filteredClients.length} of {clients.length} clients</p>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading clients...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Status</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Client</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden md:table-cell">Contact</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden lg:table-cell">Tenant</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Bookings</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden md:table-cell">Last Booking</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedClients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No clients found</td></tr>
              ) : (
                paginatedClients.map(client => {
                  const status = getClientStatus(client)
                  return (
                    <tr key={client.id} className="group">
                      <td colSpan={7} className="p-0">
                        {/* Main Row */}
                        <div
                          className="flex items-center cursor-pointer hover:bg-gray-50/80 transition-colors"
                          onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                        >
                          <div className="px-3 md:px-4 py-3.5 w-[90px]">
                            {getStatusBadge(status)}
                          </div>
                          <div className="px-3 md:px-4 py-3.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 text-sm group-hover:text-slate-900/80 transition-colors">{client.name}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[120px] md:max-w-[200px]">{client.address}</p>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 md:px-4 py-3.5 hidden md:block w-[180px]">
                            <p className="text-sm text-gray-700 truncate">{client.email}</p>
                            <p className="text-xs text-gray-400">{client.phone}</p>
                          </div>
                          <div className="px-3 md:px-4 py-3.5 hidden lg:block w-[140px]">
                            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              {client.tenants?.name || 'Unknown'}
                            </span>
                          </div>
                          <div className="px-3 md:px-4 py-3.5 font-semibold text-sm text-slate-900 w-[80px]">
                            {client.totalBookings}
                          </div>
                          <div className="px-3 md:px-4 py-3.5 hidden md:block w-[130px]">
                            <p className="text-sm text-gray-500">{formatDate(client.lastBooking)}</p>
                            {client.daysSinceLastBooking !== null && client.daysSinceLastBooking > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">{client.daysSinceLastBooking}d ago</p>
                            )}
                          </div>
                          <div className="px-3 md:px-4 py-3.5 font-semibold text-green-600 text-sm w-[80px]">
                            {formatMoney(client.totalSpent)}
                          </div>
                        </div>

                        {/* Expanded Detail Panel */}
                        {expandedId === client.id && (
                          <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Contact</p>
                                <p className="text-sm text-slate-900">{client.name}</p>
                                <p className="text-sm text-gray-600">{client.email || 'No email'}</p>
                                <p className="text-sm text-gray-600">{client.phone || 'No phone'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Address</p>
                                <p className="text-sm text-slate-900">{client.address || 'No address'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tenant</p>
                                <p className="text-sm text-slate-900">{client.tenants?.name || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Member Since</p>
                                <p className="text-sm text-slate-900">{formatDate(client.created_at)}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                              <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Bookings</p>
                                <p className="text-lg font-bold text-slate-900">{client.totalBookings}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                                <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-0.5">Total Spent</p>
                                <p className="text-lg font-bold text-green-700">{formatMoney(client.totalSpent)}</p>
                              </div>
                              <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Last Booking</p>
                                <p className="text-lg font-bold text-slate-900">{client.lastBooking ? formatDate(client.lastBooking) : 'Never'}</p>
                              </div>
                            </div>
                            {client.notes && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                                <p className="text-sm text-slate-900 bg-white p-3 rounded-lg border border-gray-200">{client.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
