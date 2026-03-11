'use client'

import { useEffect, useState } from 'react'

interface PartnerRequest {
  id: string
  business_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  service_category: string
  city: string
  state: string
  status: string
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

interface Counts {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<PartnerRequest[]>([])
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => { fetchRequests() }, [filter, search])

  async function fetchRequests() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) {
      const data = await res.json()
      setRequests(data.requests || [])
      setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 })
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActing(true)
    await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, admin_notes: notes || undefined }),
    })
    setActing(false)
    setExpanded(null)
    setNotes('')
    fetchRequests()
  }

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    }
    return `inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${styles[s] || 'bg-slate-100 text-slate-500 border-slate-200'}`
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-4">Partner Requests</h1>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: counts.total, color: 'border-l-slate-400' },
          { label: 'Pending', value: counts.pending, color: 'border-l-yellow-500' },
          { label: 'Approved', value: counts.approved, color: 'border-l-green-500' },
          { label: 'Rejected', value: counts.rejected, color: 'border-l-red-500' },
        ].map(s => (
          <div key={s.label} className={`border-l-4 ${s.color} pl-3 py-2`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold font-mono text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search business, city, category..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-600"
        />
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 py-8 text-center text-sm">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-slate-400 py-8 text-center text-sm">No requests found</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map(r => (
            <div key={r.id}>
              <div
                onClick={() => { setExpanded(expanded === r.id ? null : r.id); setNotes(r.admin_notes || '') }}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 transition-colors px-1"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{r.business_name}</p>
                  <p className="text-xs text-slate-500">{r.contact_name} &middot; {r.service_category?.replace(/_/g, ' ')} &middot; {r.city}, {r.state}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusBadge(r.status)}>{r.status}</span>
                  <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {expanded === r.id && (
                <div className="bg-slate-50 rounded-lg p-4 mb-2 mx-1">
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div><span className="text-slate-400">Email:</span> <span className="text-slate-700">{r.contact_email}</span></div>
                    <div><span className="text-slate-400">Phone:</span> <span className="text-slate-700">{r.contact_phone}</span></div>
                    <div><span className="text-slate-400">Category:</span> <span className="text-slate-700 capitalize">{r.service_category?.replace(/_/g, ' ')}</span></div>
                    <div><span className="text-slate-400">Location:</span> <span className="text-slate-700">{r.city}, {r.state}</span></div>
                    {r.reviewed_at && <div><span className="text-slate-400">Reviewed:</span> <span className="text-slate-700">{new Date(r.reviewed_at).toLocaleString()}</span></div>}
                  </div>

                  {r.status === 'pending' && (
                    <div className="space-y-2">
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Admin notes (optional)..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r.id, 'approved')}
                          disabled={acting}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {acting ? 'Saving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'rejected')}
                          disabled={acting}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {r.admin_notes && r.status !== 'pending' && (
                    <div className="mt-2 text-sm">
                      <span className="text-slate-400">Notes:</span> <span className="text-slate-700">{r.admin_notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
