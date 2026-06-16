// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DashboardHeader from '@/app/site/wash-and-fold-nyc/_components/DashboardHeader'
import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'
import ClientActivityFeed from '@/app/site/wash-and-fold-nyc/_components/ClientActivityFeed'
import ClientTranscript from '@/app/site/wash-and-fold-nyc/_components/ClientTranscript'
import AddressAutocomplete from '@/app/site/wash-and-fold-nyc/_components/AddressAutocomplete'

const ClientsMap = dynamic(() => import('@/app/site/wash-and-fold-nyc/_components/ClientsMap'), { ssr: false })

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
  referrer_id: string | null
  created_at: string
  active: boolean
  do_not_service: boolean
  status: string | null
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
  useEffect(() => { document.title = 'Clients | The NYC Wash and Fold Service Company' }, []);
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [filter, setFilter] = useState<'all' | 'potential' | 'active' | 'inactive' | 'new' | 'dns' | 'archived'>('all')
  const [mapFilter, setMapFilter] = useState<'all' | 'potential' | 'active' | 'inactive' | 'new'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastBooking' | 'totalBookings' | 'created_at'>('created_at')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    notes: '',
    referrer_id: ''
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
      const res = await fetch('/api/clients?include_stats=true&include_archived=true')
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
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          ...(!editingClient || addressChanged ? { address: form.address, unit: form.unit || null } : {}),
          notes: form.notes,
          referrer_id: form.referrer_id || null,
          ...(editingClient && { do_not_service: editingClient.do_not_service })
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setEditingClient(null)
        setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '' })
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
        setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '' })
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
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      unit: (client as any).unit || '',
      notes: client.notes || '',
      referrer_id: client.referrer_id || ''
    })
    setAddressChanged(false)
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingClient(null)
    setForm({ name: '', email: '', phone: '', address: '', unit: '', notes: '', referrer_id: '' })
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
      case 'potential': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Potential</span>
      case 'new': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">New</span>
      case 'active': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
      case 'inactive': return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Inactive</span>
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
      if (filter === 'all') return c.active !== false
      if (filter === 'archived') return c.active === false
      if (filter === 'dns') return c.do_not_service && c.active !== false
      return c.active !== false && getClientStatus(c) === filter
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

  const activeClients = clients.filter(c => c.active !== false)
  const stats = {
    total: activeClients.length,
    potential: activeClients.filter(c => getClientStatus(c) === 'potential').length,
    new: activeClients.filter(c => getClientStatus(c) === 'new').length,
    active: activeClients.filter(c => getClientStatus(c) === 'active').length,
    inactive: activeClients.filter(c => getClientStatus(c) === 'inactive').length,
    archived: clients.filter(c => c.active === false).length,
    referred: activeClients.filter(c => c.referrer_id).length,
    totalRevenue: activeClients.reduce((sum, c) => sum + c.totalSpent, 0),
    avgLTV: activeClients.length > 0 ? Math.round(activeClients.reduce((sum, c) => sum + c.totalSpent, 0) / activeClients.length) : 0
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader currentPage="clients" />
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-semibold text-black">Clients</h2>
            <p className="text-gray-500">{clients.length} total clients</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">+ Add Client</button>
        </div>
        <div className="text-sm text-gray-500 mb-6">
          Client portal: <a href="https://www.washandfoldnyc.com/book" target="_blank" className="text-blue-600 hover:underline">washandfoldnyc.com/book</a> ·
          New booking: <a href="https://www.washandfoldnyc.com/book/new" target="_blank" className="text-blue-600 hover:underline ml-1">washandfoldnyc.com/book/new</a> ·
          Collect info: <a href="https://www.washandfoldnyc.com/book/collect" target="_blank" className="text-blue-600 hover:underline ml-1">washandfoldnyc.com/book/collect</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <button onClick={() => setFilter('all')} className={`p-4 rounded-lg text-left ${filter === 'all' ? 'ring-2 ring-black' : ''} bg-gray-50`}>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-black">{stats.total}</p>
          </button>
          <button onClick={() => setFilter('potential')} className={`p-4 rounded-lg text-left ${filter === 'potential' ? 'ring-2 ring-amber-500' : ''} bg-amber-50`}>
            <p className="text-sm text-amber-600">Potential</p>
            <p className="text-2xl font-bold text-amber-700">{stats.potential}</p>
          </button>
          <button onClick={() => setFilter('new')} className={`p-4 rounded-lg text-left ${filter === 'new' ? 'ring-2 ring-blue-500' : ''} bg-blue-50`}>
            <p className="text-sm text-blue-600">New</p>
            <p className="text-2xl font-bold text-blue-700">{stats.new}</p>
          </button>
          <button onClick={() => setFilter('active')} className={`p-4 rounded-lg text-left ${filter === 'active' ? 'ring-2 ring-green-500' : ''} bg-green-50`}>
            <p className="text-sm text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
          </button>
          <button onClick={() => setFilter('inactive')} className={`p-4 rounded-lg text-left ${filter === 'inactive' ? 'ring-2 ring-gray-400' : ''} bg-gray-100`}>
            <p className="text-sm text-gray-500">Inactive</p>
            <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
          </button>
          <div className="p-4 rounded-lg bg-purple-50">
            <p className="text-sm text-purple-600">Referred</p>
            <p className="text-2xl font-bold text-purple-700">{stats.referred}</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50">
            <p className="text-sm text-emerald-600">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-700">{formatMoney(stats.totalRevenue)}</p>
          </div>
          <div className="p-4 rounded-lg bg-indigo-50">
            <p className="text-sm text-indigo-600">Avg LTV</p>
            <p className="text-2xl font-bold text-indigo-700">{formatMoney(stats.avgLTV)}</p>
          </div>
          {clients.filter(c => c.do_not_service).length > 0 && (
            <button onClick={() => setFilter('dns')} className={`p-4 rounded-lg text-left ${filter === 'dns' ? 'ring-2 ring-red-600' : ''} bg-red-50`}>
              <p className="text-sm text-red-600">DNS</p>
              <p className="text-2xl font-bold text-red-700">{clients.filter(c => c.do_not_service).length}</p>
            </button>
          )}
          {stats.archived > 0 && (
            <button onClick={() => setFilter('archived')} className={`p-4 rounded-lg text-left ${filter === 'archived' ? 'ring-2 ring-orange-500' : ''} bg-orange-50`}>
              <p className="text-sm text-orange-600">Archived</p>
              <p className="text-2xl font-bold text-orange-700">{stats.archived}</p>
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-6">
          <input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg text-black" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-4 py-2 border rounded-lg text-black">
            <option value="created_at">Newest Added</option>
            <option value="name">Name A-Z</option>
            <option value="lastBooking">Last Booking</option>
            <option value="totalSpent">Total Spent</option>
            <option value="totalBookings">Total Bookings</option>
          </select>
        </div>

        {filter !== 'all' && <button onClick={() => setFilter('all')} className="mb-4 text-sm text-blue-600 hover:underline">← Show all clients</button>}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-left text-sm text-black">
                <tr>
                  <th className="px-3 md:px-4 py-3">Status</th>
                  <th className="px-3 md:px-4 py-3">Client</th>
                  <th className="px-3 md:px-4 py-3 hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Added</th>
                  <th className="px-3 md:px-4 py-3">Bookings</th>
                  <th className="px-3 md:px-4 py-3">Spent</th>
                  <th className="px-4 py-3 hidden md:table-cell">Last Booking</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Referred By</th>
                  <th className="px-4 py-3 hidden md:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClients.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No clients found</td></tr>
                ) : (
                  filteredClients.map(client => {
                    const status = getClientStatus(client)
                    const referrerName = getReferrerName(client.referrer_id)
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEditModal(client)}>
                        <td className="px-3 md:px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {client.active === false ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Archived</span>
                            ) : (
                              getStatusBadge(status)
                            )}
                            {client.do_not_service && <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">DNS</span>}
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <p className="font-medium text-black text-sm">{client.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[120px] md:max-w-[200px]">{client.address}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm">{client.email}</p>
                          <p className="text-sm text-gray-500">{client.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {formatDate(client.created_at)}
                        </td>
                        <td className="px-3 md:px-4 py-3 font-medium text-sm">{client.totalBookings}</td>
                        <td className="px-3 md:px-4 py-3 font-medium text-green-600 text-sm">{formatMoney(client.totalSpent)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {formatDate(client.lastBooking)}
                          {client.daysSinceLastBooking !== null && client.daysSinceLastBooking > 0 && (
                            <p className="text-xs text-gray-400">{client.daysSinceLastBooking}d ago</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {referrerName ? <span className="text-sm text-purple-600">{referrerName}</span> : <span className="text-sm text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(client)} className="text-blue-600 hover:underline text-sm">Edit</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => { if (confirm(`Delete ${client.name}? This cannot be undone.`)) { fetch(`/api/clients/${client.id}`, { method: 'DELETE' }).then(res => { if (res.ok) fetchClients(); else res.json().then(err => alert(err.error || 'Failed to delete')) }) } }} className="text-red-600 hover:underline text-sm">Delete</button>
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
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-black">
                  Client Map
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {mapClients.length} clients
                  </span>
                </h3>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setMapFilter('all')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    All <span className="opacity-70">{mapStatusCounts.all}</span>
                  </button>
                  <button onClick={() => setMapFilter('active')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Active <span className="opacity-70">{mapStatusCounts.active}</span>
                  </button>
                  <button onClick={() => setMapFilter('new')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === 'new' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> New <span className="opacity-70">{mapStatusCounts.new}</span>
                  </button>
                  <button onClick={() => setMapFilter('potential')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === 'potential' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Potential <span className="opacity-70">{mapStatusCounts.potential}</span>
                  </button>
                  <button onClick={() => setMapFilter('inactive')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === 'inactive' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
                return s ? (
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Bookings</p>
                      <p className="text-lg font-bold text-black">{s.totalBookings}</p>
                    </div>
                    <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Total Spent</p>
                      <p className="text-lg font-bold text-green-700">{formatMoney(s.totalSpent)}</p>
                    </div>
                    <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Last Booking</p>
                      <p className="text-sm font-medium text-black">{formatDate(s.lastBooking)}</p>
                    </div>
                  </div>
                ) : null
              })()}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex gap-2">
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-black" placeholder="john@email.com" />
                    {editingClient && form.email && (
                      <a href={`mailto:${form.email}`} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 flex items-center">Email</a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex gap-2">
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className="flex-1 px-3 py-2 border rounded-lg text-black" placeholder="212-555-1234" />
                    {editingClient && form.phone && (
                      <>
                        <a href={`tel:${form.phone}`} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center">Call</a>
                        <a href={`sms:${form.phone}`} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center">Text</a>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <AddressAutocomplete value={form.address} onChange={(val) => { setForm({ ...form, address: val }); setAddressChanged(true) }} placeholder="123 Main St, New York, NY 10001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Apt</label>
                  <input type="text" value={form.unit} onChange={(e) => { setForm({ ...form, unit: e.target.value }); setAddressChanged(true) }} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="Apt 4B" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                  <select value={form.referrer_id} onChange={(e) => setForm({ ...form, referrer_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black">
                    <option value="">None</option>
                    {referrers.filter(ref => ref.active).map(ref => <option key={ref.id} value={ref.id}>{ref.name} ({ref.ref_code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" rows={3} placeholder="Any special instructions..." />
                </div>
                {editingClient && (
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-black mb-3">SMS Transcript</h4>
                    <ClientTranscript clientId={editingClient.id} />
                  </div>
                )}
                {editingClient && editingClient.active === false && (
                  <div className="flex justify-between items-center py-3 border-t border-b border-orange-200 bg-orange-50 -mx-4 px-4">
                    <div>
                      <h4 className="font-medium text-orange-700">This client is archived</h4>
                      <p className="text-xs text-orange-600">Reactivate to show them in the active client list</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/clients/${editingClient.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ active: true })
                        })
                        setEditingClient({ ...editingClient, active: true })
                        fetchClients()
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                    >
                      Reactivate
                    </button>
                  </div>
                )}
                {editingClient && (
                  <div className="flex justify-between items-center py-3 border-t border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-red-600">Do Not Service</h4>
                      <p className="text-xs text-gray-500">Block this client from booking</p>
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
                  <a href={`/dashboard/bookings?new=1&client_id=${editingClient.id}`} className="block w-full text-center py-2 px-4 bg-black/5 text-black border border-gray-200 rounded-lg font-medium hover:bg-black/10">+ Book for {form.name.split(' ')[0] || 'Client'}</a>
                )}
                {editingClient && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-black mb-3">Activity</h4>
                    <ClientActivityFeed clientId={editingClient.id} />
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t">
                  {editingClient ? (
                    <button type="button" onClick={handleDelete} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete Client</button>
                  ) : <div />}
                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">{editingClient ? 'Update' : 'Add Client'}</button>
                  </div>
                </div>
              </form>
          </SidePanel>
        )}

      </main>
    </div>
  )
}
