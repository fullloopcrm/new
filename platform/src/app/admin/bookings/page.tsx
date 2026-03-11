'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  payment_status: string
  payment_method: string | null
  notes: string | null
  client_id: string
  team_member_id: string | null
  tenant_id: string
  clients: { id: string; name: string; phone: string; email: string } | null
  team_members: { id: string; name: string } | null
  tenants: { id: string; name: string } | null
}

export default function AdminBookingsPage() {
  useEffect(() => { document.title = 'Bookings | FullLoop Admin' }, [])

  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    status: '',
    tenant_id: '',
    date_from: '',
    date_to: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => { loadBookings(); loadTenants() }, [])
  useEffect(() => { applyFilters() }, [bookings, filters, searchQuery])

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings')
      if (res.ok) {
        const data = await res.json()
        data.sort((a: Booking, b: Booking) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        setBookings(data)
      }
    } catch (err) { console.error('Failed to load bookings:', err) }
    setLoading(false)
  }

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) setTenants(await res.json())
    } catch (err) { console.error('Failed to load tenants:', err) }
  }

  const applyFilters = () => {
    let result = [...bookings]
    if (filters.status) result = result.filter(b => b.status === filters.status)
    if (filters.tenant_id) result = result.filter(b => b.tenant_id === filters.tenant_id)
    if (filters.date_from) result = result.filter(b => new Date(b.start_time) >= new Date(filters.date_from))
    if (filters.date_to) result = result.filter(b => new Date(b.start_time) <= new Date(filters.date_to + 'T23:59:59'))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        (b.clients?.name || '').toLowerCase().includes(q) ||
        (b.clients?.phone || '').includes(q) ||
        (b.clients?.email || '').toLowerCase().includes(q) ||
        (b.team_members?.name || '').toLowerCase().includes(q) ||
        (b.tenants?.name || '').toLowerCase().includes(q) ||
        b.service_type.toLowerCase().includes(q)
      )
    }
    setFilteredBookings(result)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({ status: '', tenant_id: '', date_from: '', date_to: '' })
    setSearchQuery('')
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)

  const formatDate = (dateStr: string) => {
    const [datePart] = dateStr.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    const [, t] = timeStr.split('T')
    const [h, m] = (t || '00:00').split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
      confirmed: 'bg-teal-50 text-teal-700 border-teal-200',
      in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-gray-50 text-gray-600 border-gray-200',
    }
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
        {label}
      </span>
    )
  }

  // Stats
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const stats = {
    today: bookings.filter(b => b.start_time.startsWith(todayStr)).length,
    thisWeek: bookings.filter(b => {
      const d = b.start_time.split('T')[0]
      return d >= weekStartStr && d <= todayStr
    }).length,
    scheduled: bookings.filter(b => b.status === 'scheduled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(filteredBookings.length / pageSize)

  return (
    <main className="p-3 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">BOOKINGS</h2>
          <p className="text-2xl font-bold text-slate-900">{bookings.length} <span className="text-base font-normal text-gray-400">total bookings</span></p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 mt-4">
        <div className="p-4 rounded-xl bg-teal-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">Today</p>
          <p className="text-2xl font-bold text-slate-900">{stats.today}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">This Week</p>
          <p className="text-2xl font-bold text-slate-900">{stats.thisWeek}</p>
        </div>
        <div className="p-4 rounded-xl bg-indigo-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-indigo-700">{stats.scheduled}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-50 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search by client, team member, service, tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filters.tenant_id}
          onChange={(e) => setFilters(f => ({ ...f, tenant_id: e.target.value }))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
        >
          <option value="">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
          placeholder="From"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
          placeholder="To"
        />
        {(filters.status || filters.tenant_id || filters.date_from || filters.date_to || searchQuery) && (
          <button onClick={clearFilters} className="px-4 py-2.5 text-sm font-medium text-slate-900/70 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Clear Filters
          </button>
        )}
      </div>

      {/* Results count */}
      {filteredBookings.length !== bookings.length && (
        <p className="text-sm text-gray-500 mb-3">Showing {filteredBookings.length} of {bookings.length} bookings</p>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading bookings...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Client</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden md:table-cell">Service</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Date / Time</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden lg:table-cell">Team Member</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden lg:table-cell">Tenant</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Status</th>
                <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
              ) : (
                paginatedBookings.map(booking => (
                  <tr key={booking.id} className="group">
                    <td colSpan={7} className="p-0">
                      {/* Main Row */}
                      <div
                        className="flex items-center cursor-pointer hover:bg-gray-50/80 transition-colors"
                        onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                      >
                        <div className="px-3 md:px-4 py-3.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {booking.clients?.name ? booking.clients.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm">{booking.clients?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400 md:hidden">{booking.service_type}</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-3 md:px-4 py-3.5 hidden md:block text-sm text-slate-900 w-[140px]">
                          {booking.service_type}
                        </div>
                        <div className="px-3 md:px-4 py-3.5 w-[130px]">
                          <p className="text-sm text-slate-900">{formatDate(booking.start_time)}</p>
                          <p className="text-xs text-gray-400">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                        </div>
                        <div className="px-3 md:px-4 py-3.5 hidden lg:block text-sm text-slate-900 w-[120px]">
                          {booking.team_members?.name || <span className="text-gray-300">&mdash;</span>}
                        </div>
                        <div className="px-3 md:px-4 py-3.5 hidden lg:block w-[140px]">
                          <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                            {booking.tenants?.name || 'Unknown'}
                          </span>
                        </div>
                        <div className="px-3 md:px-4 py-3.5 w-[110px]">
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="px-3 md:px-4 py-3.5 text-right font-semibold text-sm text-slate-900 w-[90px]">
                          {formatMoney(booking.price)}
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      {expandedId === booking.id && (
                        <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Client Contact</p>
                              <p className="text-sm text-slate-900">{booking.clients?.email || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{booking.clients?.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Payment</p>
                              <p className="text-sm text-slate-900 capitalize">{booking.payment_status.replace(/_/g, ' ')}</p>
                              {booking.payment_method && (
                                <p className="text-sm text-gray-500 capitalize">{booking.payment_method}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Team Member</p>
                              <p className="text-sm text-slate-900">{booking.team_members?.name || 'Unassigned'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tenant</p>
                              <p className="text-sm text-slate-900">{booking.tenants?.name || 'Unknown'}</p>
                            </div>
                          </div>
                          {booking.notes && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                              <p className="text-sm text-slate-900 bg-white p-3 rounded-lg border border-gray-200">{booking.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
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
