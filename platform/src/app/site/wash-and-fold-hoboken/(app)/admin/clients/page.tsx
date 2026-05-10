// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import SidePanel from '@/app/site/wash-and-fold-hoboken/_components/SidePanel'
import ClientActivityFeed from '@/app/site/wash-and-fold-hoboken/_components/ClientActivityFeed'
import ClientTranscript from '@/app/site/wash-and-fold-hoboken/_components/ClientTranscript'
import AddressAutocomplete from '@/app/site/wash-and-fold-hoboken/_components/AddressAutocomplete'

const ClientsMap = dynamic(() => import('@/app/site/wash-and-fold-hoboken/_components/ClientsMap'), { ssr: false })

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
  referrer_id: string | null
  created_at: string
  do_not_service: boolean
  email_marketing_opt_out: boolean
  sms_marketing_opt_out: boolean
  pin: string | null
  status: string | null
  pet_name: string | null
  pet_type: string | null
}

interface Referrer {
  id: string
  name: string
  ref_code: string
  active: boolean
}

interface ClientWithStats extends Client {
  totalBookings: number
  totalSpent: number
  lastBooking: string | null
  daysSinceLastBooking: number | null
}

export default function ClientsPage() {
  useEffect(() => { document.title = 'Clients | The NYC Maid' }, []);
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [filter, setFilter] = useState<'all' | 'potential' | 'active' | 'inactive' | 'new' | 'dns'>('all')
  const [mapFilter, setMapFilter] = useState<'all' | 'potential' | 'active' | 'inactive' | 'new'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastBooking' | 'totalBookings' | 'created_at'>('created_at')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    notes: '',
    referrer_id: '',
    pet_name: '',
    pet_type: ''
  })
  const [addressChanged, setAddressChanged] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchReferrers()
  }, [])

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3,6) + '-' + cleaned.slice(6,10)
  }

  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients?include_stats=true')
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
    setLoading(false)
  }

  const fetchReferrers = async () => {
    try {
      const res = await fetch('/api/referrers')
      const data = await res.json()
      setReferrers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch referrers:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients'
      const method = editingClient ? 'PUT' : 'POST'
      
      const fullAddress = form.unit
        ? `${form.address}, ${form.unit}`
        : form.address
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          // Only send address if creating new client or address was actually changed
          ...(!editingClient || addressChanged ? { address: fullAddress } : {}),
          notes: form.notes,
          referrer_id: form.referrer_id || null,
          pet_name: form.pet_name || null,
          pet_type: form.pet_type || null,
          ...(editingClient && { do_not_service: editingClient.do_not_service })
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setEditingClient(null)
        setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '', pet_name: '', pet_type: '' })
        setAddressChanged(false)
        fetchClients()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save client')
      }
    } catch (err) {
      console.error('Failed to save client:', err)
    }
  }

  const handleDelete = async () => {
    if (!editingClient) return
    if (!confirm(`Archive ${editingClient.name}? They will be hidden but booking history preserved.`)) return
    
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowAddModal(false)
        setEditingClient(null)
        setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '', pet_name: '', pet_type: '' })
        setAddressChanged(false)
        fetchClients()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete')
      }
    } catch (err) {
      alert('Failed to delete client')
    }
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    // Extract unit from address if it contains Apt/Unit/Suite/# pattern
    const addr = client.address || ''
    const unitMatch = addr.match(/,\s*((?:Apt\.?|Unit|Suite|#)\s*\S+)/i)
    const extractedUnit = unitMatch ? unitMatch[1].trim() : ''
    const baseAddress = unitMatch ? addr.substring(0, unitMatch.index).trim() : addr
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: extractedUnit ? baseAddress : addr,
      unit: extractedUnit,
      notes: client.notes || '',
      referrer_id: client.referrer_id || '',
      pet_name: client.pet_name || '',
      pet_type: client.pet_type || ''
    })
    setAddressChanged(false)
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingClient(null)
    setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '', pet_name: '', pet_type: '' })
    setAddressChanged(false)
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(0)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getClientStatus = (client: ClientWithStats): 'potential' | 'new' | 'active' | 'inactive' => {
    if (client.status === 'potential') return 'potential'
    if (client.totalBookings === 0) return 'new'
    if (client.daysSinceLastBooking === null) return 'new'
    if (client.daysSinceLastBooking <= 60) return 'active'
    return 'inactive'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'potential': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-medium border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Potential</span>
      case 'new': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#A8F0DC]/20 text-[#1E2A4A] rounded-full text-[11px] font-medium border border-[#A8F0DC]/40"><span className="w-1.5 h-1.5 rounded-full bg-[#A8F0DC]"></span>New</span>
      case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[11px] font-medium border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Active</span>
      case 'inactive': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>Inactive</span>
      default: return null
    }
  }

  const getReferrerName = (referrerId: string | null) => {
    if (!referrerId) return null
    const ref = referrers.find(r => r.id === referrerId)
    return ref ? ref.name : null
  }

  const filteredClients = clients
    .filter(c => {
      const matchesSearch = 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.address?.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false
      if (filter === 'all') return true
      if (filter === 'dns') return c.do_not_service
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

  const stats = {
    total: clients.length,
    potential: clients.filter(c => getClientStatus(c) === 'potential').length,
    new: clients.filter(c => getClientStatus(c) === 'new').length,
    active: clients.filter(c => getClientStatus(c) === 'active').length,
    inactive: clients.filter(c => getClientStatus(c) === 'inactive').length,
    referred: clients.filter(c => c.referrer_id).length,
    totalRevenue: clients.reduce((sum, c) => sum + c.totalSpent, 0),
    avgLTV: clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c.totalSpent, 0) / clients.length) : 0
  }

  return (
      <main className="p-3 md:p-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">&#128100; CLIENTS</h2>
            <p className="text-2xl font-bold text-[#1E2A4A]">{clients.length} <span className="text-base font-normal text-gray-400">total clients</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const rows = filteredClients.map(c => [c.name, c.email || '', c.phone || '', c.address || '', getClientStatus(c), c.totalBookings || 0, c.totalSpent ? '$' + (c.totalSpent / 100).toFixed(0) : '$0'].join(','))
              const csv = 'Name,Email,Phone,Address,Status,Bookings,Total Spent\n' + rows.join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`; a.click()
              URL.revokeObjectURL(url)
            }} className="px-4 py-2.5 border border-gray-300 text-[#1E2A4A] rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors">Export CSV</button>
            <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium shadow-sm transition-all hover:shadow-md">+ Add Client</button>
          </div>
        </div>
        <div className="text-sm text-gray-400 mb-6">
          Client portal: <a href="https://www.thenycmaid.com/book" target="_blank" className="text-[#1E2A4A]/70 hover:underline py-2 inline-block">thenycmaid.com/book</a> ·
          New booking: <a href="https://www.thenycmaid.com/book/new" target="_blank" className="text-[#1E2A4A]/70 hover:underline ml-1 py-2 inline-block">thenycmaid.com/book/new</a> ·
          Collect info: <a href="https://www.thenycmaid.com/book/collect" target="_blank" className="text-[#1E2A4A]/70 hover:underline ml-1 py-2 inline-block">thenycmaid.com/book/collect</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <button onClick={() => setFilter('all')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'all' ? 'ring-2 ring-[#1E2A4A] shadow-md' : 'shadow-sm'} bg-gray-50`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-[#1E2A4A]">{stats.total}</p>
          </button>
          <button onClick={() => setFilter('potential')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'potential' ? 'ring-2 ring-amber-500 shadow-md' : 'shadow-sm'} bg-amber-50`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">Potential</p>
            <p className="text-2xl font-bold text-amber-700">{stats.potential}</p>
          </button>
          <button onClick={() => setFilter('new')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'new' ? 'ring-2 ring-[#1E2A4A] shadow-md' : 'shadow-sm'} bg-[#A8F0DC]/20`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1E2A4A]/60 mb-1">New</p>
            <p className="text-2xl font-bold text-[#1E2A4A]">{stats.new}</p>
          </button>
          <button onClick={() => setFilter('active')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'active' ? 'ring-2 ring-green-500 shadow-md' : 'shadow-sm'} bg-green-50`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
          </button>
          <button onClick={() => setFilter('inactive')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'inactive' ? 'ring-2 ring-gray-400 shadow-md' : 'shadow-sm'} bg-gray-50`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
          </button>
          <div className="p-4 rounded-xl bg-purple-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">Referred</p>
            <p className="text-2xl font-bold text-purple-700">{stats.referred}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-1">Revenue</p>
            <p className="text-2xl font-bold text-emerald-700">{formatMoney(stats.totalRevenue)}</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">Avg LTV</p>
            <p className="text-2xl font-bold text-indigo-700">{formatMoney(stats.avgLTV)}</p>
          </div>
          {clients.filter(c => c.do_not_service).length > 0 && (
            <button onClick={() => setFilter('dns')} className={`p-4 rounded-xl text-left transition-all hover:shadow-md ${filter === 'dns' ? 'ring-2 ring-red-600 shadow-md' : 'shadow-sm'} bg-red-50`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">DNS</p>
              <p className="text-2xl font-bold text-red-700">{clients.filter(c => c.do_not_service).length}</p>
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white shadow-sm focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white shadow-sm focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all">
            <option value="created_at">Newest Added</option>
            <option value="name">Name A-Z</option>
            <option value="lastBooking">Last Booking</option>
            <option value="totalSpent">Total Spent</option>
            <option value="totalBookings">Total Bookings</option>
          </select>
        </div>

        {filter !== 'all' && <button onClick={() => setFilter('all')} className="mb-4 text-xs font-medium text-[#1E2A4A]/70 hover:text-[#1E2A4A] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">&larr; Show all clients</button>}

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-[#1E2A4A] rounded-full animate-spin mb-3"></div>
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
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden lg:table-cell">Added</th>
                  <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Bookings</th>
                  <th className="px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Spent</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden md:table-cell">Last Booking</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden lg:table-cell">Referred By</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hidden md:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No clients found</td></tr>
                ) : (
                  filteredClients.map(client => {
                    const status = getClientStatus(client)
                    const referrerName = getReferrerName(client.referrer_id)
                    return (
                      <tr key={client.id} className="hover:bg-gray-50/80 cursor-pointer transition-colors group" onClick={() => openEditModal(client)}>
                        <td className="px-3 md:px-4 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            {getStatusBadge(status)}
                            {client.do_not_service && <span className="inline-flex items-center px-2.5 py-0.5 bg-red-600 text-white rounded-full text-[11px] font-bold">DNS</span>}
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#1E2A4A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1E2A4A] text-sm group-hover:text-[#1E2A4A]/80 transition-colors">{client.name}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[120px] md:max-w-[200px]">{client.address}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-sm text-gray-700">{client.email}</p>
                          <p className="text-xs text-gray-400">{client.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                          {formatDate(client.created_at)}
                        </td>
                        <td className="px-3 md:px-4 py-3.5 font-semibold text-sm text-[#1E2A4A]">{client.totalBookings}</td>
                        <td className="px-3 md:px-4 py-3.5 font-semibold text-green-600 text-sm">{formatMoney(client.totalSpent)}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                          {formatDate(client.lastBooking)}
                          {client.daysSinceLastBooking !== null && client.daysSinceLastBooking > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{client.daysSinceLastBooking}d ago</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {referrerName ? <span className="text-sm text-purple-600 font-medium">{referrerName}</span> : <span className="text-sm text-gray-300">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(client)} className="text-[#1E2A4A]/70 hover:text-[#1E2A4A] text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">Edit</button>
                            <button onClick={() => { if (confirm(`Delete ${client.name}? This cannot be undone.`)) { fetch(`/api/clients/${client.id}`, { method: 'DELETE' }).then(res => { if (res.ok) fetchClients(); else res.json().then(err => alert(err.error || 'Failed to delete')) }) } }} className="text-red-500/70 hover:text-red-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && clients.length > 0 && (() => {
          const mapClients = clients
            .filter(c => c.address && !c.do_not_service)
            .filter(c => mapFilter === 'all' || getClientStatus(c) === mapFilter)
          const mapStatusCounts = {
            all: clients.filter(c => c.address && !c.do_not_service).length,
            active: clients.filter(c => c.address && !c.do_not_service && getClientStatus(c) === 'active').length,
            new: clients.filter(c => c.address && !c.do_not_service && getClientStatus(c) === 'new').length,
            potential: clients.filter(c => c.address && !c.do_not_service && getClientStatus(c) === 'potential').length,
            inactive: clients.filter(c => c.address && !c.do_not_service && getClientStatus(c) === 'inactive').length,
          }
          return (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">&#128506; CLIENT MAP</h3>
                  <p className="text-sm text-gray-500">{mapClients.length} clients with addresses</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setMapFilter('all')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${mapFilter === 'all' ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    All <span className="opacity-70">{mapStatusCounts.all}</span>
                  </button>
                  <button onClick={() => setMapFilter('active')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${mapFilter === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Active <span className="opacity-70">{mapStatusCounts.active}</span>
                  </button>
                  <button onClick={() => setMapFilter('new')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${mapFilter === 'new' ? 'bg-[#1E2A4A] text-white' : 'bg-[#A8F0DC]/20 text-[#1E2A4A]/70 hover:bg-[#A8F0DC]/20'}`}>
                    <span className="w-2 h-2 rounded-full bg-[#A8F0DC] inline-block"></span> New <span className="opacity-70">{mapStatusCounts.new}</span>
                  </button>
                  <button onClick={() => setMapFilter('potential')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${mapFilter === 'potential' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Potential <span className="opacity-70">{mapStatusCounts.potential}</span>
                  </button>
                  <button onClick={() => setMapFilter('inactive')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${mapFilter === 'inactive' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span> Inactive <span className="opacity-70">{mapStatusCounts.inactive}</span>
                  </button>
                </div>
              </div>
              <ClientsMap
                clients={mapClients.map(c => ({
                  id: c.id,
                  name: c.name,
                  address: c.address,
                  status: getClientStatus(c),
                  totalBookings: c.totalBookings,
                  totalSpent: c.totalSpent,
                  lastBooking: c.lastBooking,
                  do_not_service: c.do_not_service
                }))}
                onClientClick={(id) => {
                  const client = clients.find(c => c.id === id)
                  if (client) openEditModal(client)
                }}
                onClientDelete={(id, name) => {
                  if (confirm(`Archive ${name}? They will be hidden but booking history preserved.`)) {
                    fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(res => {
                      if (res.ok) fetchClients()
                      else res.json().then(err => alert(err.error || 'Failed to delete'))
                    })
                  }
                }}
              />
            </div>
          )
        })()}

        {showAddModal && (
          <SidePanel open={showAddModal} onClose={closeModal} title={editingClient ? 'Edit Client' : 'Add New Client'}>
              {editingClient && (() => {
                const s = clients.find(c => c.id === editingClient.id)
                const clientStatus = s ? getClientStatus(s) : null
                return s ? (
                  <div className="mb-6">
                    {/* Client Identity Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-full bg-[#1E2A4A] text-white flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-md">
                        {s.name ? s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-[#1E2A4A] truncate">{s.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {clientStatus && getStatusBadge(clientStatus)}
                          {s.totalBookings >= 3 && <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium border border-purple-200">Recurring</span>}
                          {s.do_not_service && <span className="inline-flex items-center px-2.5 py-0.5 bg-red-600 text-white rounded-full text-[11px] font-bold">DNS</span>}
                        </div>
                      </div>
                    </div>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Bookings</p>
                        <p className="text-lg font-bold text-[#1E2A4A]">{s.totalBookings}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-0.5">Total Spent</p>
                        <p className="text-lg font-bold text-green-700">{formatMoney(s.totalSpent)}</p>
                      </div>
                      <div className="bg-[#A8F0DC]/20 rounded-xl p-3 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#1E2A4A]/50 mb-0.5">Last Booking</p>
                        <p className="text-sm font-semibold text-[#1E2A4A]">{formatDate(s.lastBooking)}</p>
                      </div>
                    </div>
                  </div>
                ) : null
              })()}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">&#128221; CLIENT DETAILS</h4>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
                  <div className="flex gap-2">
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" placeholder="john@email.com" />
                    {editingClient && form.email && (
                      <a href={`mailto:${form.email}`} className="px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold hover:bg-purple-100 flex items-center transition-colors">Email</a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Phone</label>
                  <div className="flex gap-2">
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" placeholder="212-555-1234" />
                    {editingClient && form.phone && (
                      <>
                        <a href={`tel:${form.phone}`} className="px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold hover:bg-green-100 flex items-center transition-colors">Call</a>
                        <a href={`sms:${form.phone}`} className="px-4 py-2.5 bg-[#A8F0DC]/20 text-[#1E2A4A]/70 border border-[#A8F0DC]/40 rounded-xl text-xs font-semibold hover:bg-[#A8F0DC]/30 flex items-center transition-colors">Text</a>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Address</label>
                  <AddressAutocomplete value={form.address} onChange={(val) => { setForm({ ...form, address: val }); setAddressChanged(true) }} placeholder="123 Main St, New York, NY 10001" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Unit / Apt</label>
                  <input type="text" value={form.unit} onChange={(e) => { setForm({ ...form, unit: e.target.value }); setAddressChanged(true) }} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" placeholder="Apt 4B" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Referred By</label>
                  <select value={form.referrer_id} onChange={(e) => setForm({ ...form, referrer_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all">
                    <option value="">None</option>
                    {referrers.filter(ref => ref.active).map(ref => <option key={ref.id} value={ref.id}>{ref.name} ({ref.ref_code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" rows={3} placeholder="Any special instructions..." />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Pet</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={form.pet_name} onChange={(e) => setForm({ ...form, pet_name: e.target.value })} className="px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all" placeholder="Pet name" />
                    <select value={form.pet_type} onChange={(e) => setForm({ ...form, pet_type: e.target.value })} className="px-3 py-2.5 border border-gray-200 rounded-xl text-[#1E2A4A] bg-white focus:ring-2 focus:ring-[#A8F0DC] focus:border-transparent outline-none transition-all">
                      <option value="">No pet</option>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                {editingClient && (
                  <div className="pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">&#128172; SMS TRANSCRIPT</h4>
                    <ClientTranscript clientId={editingClient.id} />
                  </div>
                )}
                {editingClient && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">📧 MARKETING PREFERENCES</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-[#1E2A4A] text-sm">Email Marketing</h4>
                          <p className="text-[11px] text-gray-400">Receive promotional emails</p>
                        </div>
                        <div
                          onClick={async () => {
                            const newVal = !editingClient.email_marketing_opt_out
                            await fetch(`/api/clients/${editingClient.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email_marketing_opt_out: newVal })
                            })
                            setEditingClient({ ...editingClient, email_marketing_opt_out: newVal })
                            fetchClients()
                          }}
                          className={`w-10 h-6 rounded-full transition-colors ${!editingClient.email_marketing_opt_out ? 'bg-green-500' : 'bg-gray-300'} relative cursor-pointer`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${!editingClient.email_marketing_opt_out ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-[#1E2A4A] text-sm">SMS Marketing</h4>
                          <p className="text-[11px] text-gray-400">Receive promotional texts</p>
                        </div>
                        <div
                          onClick={async () => {
                            const newVal = !editingClient.sms_marketing_opt_out
                            await fetch(`/api/clients/${editingClient.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sms_marketing_opt_out: newVal })
                            })
                            setEditingClient({ ...editingClient, sms_marketing_opt_out: newVal })
                            fetchClients()
                          }}
                          className={`w-10 h-6 rounded-full transition-colors ${!editingClient.sms_marketing_opt_out ? 'bg-green-500' : 'bg-gray-300'} relative cursor-pointer`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${!editingClient.sms_marketing_opt_out ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {editingClient && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">🔑 CLIENT PORTAL</h4>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#1E2A4A] font-medium">
                          PIN: {editingClient.pin ? <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{editingClient.pin}</span> : <span className="text-gray-400">Not set (using last 4 of phone: {editingClient.phone?.replace(/\D/g, '').slice(-4) || '—'})</span>}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Client uses this PIN + email to log into thenycmaid.com/book</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const newPin = Math.floor(100000 + Math.random() * 900000).toString()
                          await fetch(`/api/clients/${editingClient.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pin: newPin })
                          })
                          setEditingClient({ ...editingClient, pin: newPin })
                          fetchClients()
                        }}
                        className="px-3 py-1.5 bg-[#A8F0DC] text-[#1E2A4A] rounded-lg text-xs font-semibold hover:bg-[#8DE8CC] transition-colors whitespace-nowrap"
                      >
                        {editingClient.pin ? 'Reset PIN' : 'Generate PIN'}
                      </button>
                      {editingClient.pin && editingClient.email && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            const btn = e.currentTarget
                            btn.disabled = true
                            btn.textContent = 'Sending...'
                            try {
                              await fetch(`/api/clients/${editingClient.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ send_pin: true })
                              })
                              btn.textContent = 'Sent!'
                              setTimeout(() => { btn.textContent = 'Send PIN'; btn.disabled = false }, 2000)
                            } catch {
                              btn.textContent = 'Failed'
                              setTimeout(() => { btn.textContent = 'Send PIN'; btn.disabled = false }, 2000)
                            }
                          }}
                          className="px-3 py-1.5 bg-[#1E2A4A] text-white rounded-lg text-xs font-semibold hover:bg-[#2A3A5A] transition-colors whitespace-nowrap"
                        >
                          Send PIN
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {editingClient && (
                  <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-red-600 text-sm">Do Not Service</h4>
                      <p className="text-[11px] text-gray-400">Block this client from booking</p>
                    </div>
                    <div
                      onClick={async () => {
                        const newVal = !editingClient.do_not_service
                        await fetch(`/api/clients/${editingClient.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ do_not_service: newVal })
                        })
                        setEditingClient({ ...editingClient, do_not_service: newVal })
                        fetchClients()
                      }}
                      className={`w-10 h-6 rounded-full transition-colors ${editingClient.do_not_service ? 'bg-red-600' : 'bg-gray-300'} relative cursor-pointer`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${editingClient.do_not_service ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                )}
                {editingClient && !editingClient.do_not_service && (
                  <div className="flex flex-col gap-2">
                    <a href={`/admin/bookings?new=1&client_id=${editingClient.id}`} className="block w-full text-center py-2.5 px-4 bg-[#1E2A4A]/5 text-[#1E2A4A] border border-gray-200 rounded-xl font-semibold hover:bg-[#1E2A4A]/10 transition-colors text-sm">+ Book for {form.name.split(' ')[0] || 'Client'}</a>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch('/api/deals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ client_id: editingClient.id, source: 'client_page' }),
                        })
                        if (res.ok) {
                          alert('Added to sales board! Set a follow-up on the Sales page.')
                          window.open('/admin/sales', '_blank')
                        } else {
                          const err = await res.json()
                          alert(err.error || 'Failed to add')
                        }
                      }}
                      className="w-full text-center py-2.5 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition-colors text-sm"
                    >
                      + Add to Sales Board
                    </button>
                  </div>
                )}
                {editingClient && (
                  <div className="pt-5 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">&#128197; ACTIVITY</h4>
                    <ClientActivityFeed clientId={editingClient.id} />
                  </div>
                )}
                <div className="flex justify-between items-center pt-5 border-t border-gray-100">
                  {editingClient ? (
                    <button type="button" onClick={handleDelete} className="text-red-500 hover:text-red-700 text-xs font-semibold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Delete Client</button>
                  ) : <div />}
                  <div className="flex gap-2">
                    <button type="button" onClick={closeModal} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-semibold text-sm shadow-sm hover:shadow-md transition-all">{editingClient ? 'Update' : 'Add Client'}</button>
                  </div>
                </div>
              </form>
          </SidePanel>
        )}

      </main>
  )
}
