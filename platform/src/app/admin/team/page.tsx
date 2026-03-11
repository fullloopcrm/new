'use client'

import { useState, useEffect } from 'react'

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  tenant_id: string
  tenant_name: string
  role: string
  status: 'active' | 'inactive'
  jobs_completed: number
  created_at: string
}

export default function AdminTeamPage() {
  useEffect(() => { document.title = 'Team | Admin' }, [])

  const [members, setMembers] = useState<TeamMember[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTenants()
    loadTeam()
  }, [])

  useEffect(() => {
    loadTeam()
  }, [tenantFilter])

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.ok) setTenants(await res.json())
    } catch (err) {
      console.error('Failed to load tenants:', err)
    }
  }

  const loadTeam = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tenantFilter) params.set('tenant_id', tenantFilter)
      const res = await fetch(`/api/admin/team?${params}`)
      if (res.ok) setMembers(await res.json())
    } catch (err) {
      console.error('Failed to load team:', err)
    }
    setLoading(false)
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.role.toLowerCase().includes(q)
    )
  })

  const totalCount = members.length
  const activeCount = members.filter(m => m.status === 'active').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

  return (
    <main className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Team</h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Total Members</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, phone, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white focus:ring-2 focus:ring-teal-600 outline-none"
        />
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white"
        >
          <option value="">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Tenant</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Role</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading team members...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    {search ? 'No team members match your search' : 'No team members found'}
                  </td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-slate-900">{m.name}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.phone}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.tenant_name}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-slate-900 capitalize">{m.role}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        m.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          m.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        {m.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{m.jobs_completed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
