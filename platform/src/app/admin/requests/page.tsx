'use client'

import { useEffect, useState, useCallback } from 'react'

interface PartnerRequest {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string | null
  website: string | null
  service_category: string
  city: string
  state: string
  years_in_business: string | null
  team_size: string | null
  monthly_revenue: string | null
  current_system: string | null
  referral_source: string | null
  pitch: string | null
  status: string
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

interface Counts {
  total: number
  pending: number
  approved: number
  rejected: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium capitalize ${styles[status] || 'bg-slate-600 text-slate-400'}`}>
      {status}
    </span>
  )
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<PartnerRequest[]>([])
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('status', activeTab)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/admin/requests?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRequests(data.requests || [])
      setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 })
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const confirmMsg = status === 'approved'
      ? 'Approve this partner request?'
      : 'Reject this partner request?'

    if (!confirm(confirmMsg)) return

    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          admin_notes: adminNotes[id] || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to update')

      // Refresh the list
      await fetchRequests()
      setExpandedId(null)
    } catch (err) {
      console.error('Error updating request:', err)
      alert('Failed to update request. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const tabs = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Partner Requests</h1>
        <p className="text-sm text-slate-400">Review and manage incoming partner applications</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 border-l-4 border-l-gray-500 p-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Requests</p>
          <p className="text-2xl font-bold font-mono mt-1">{counts.total}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 border-l-4 border-l-yellow-500 p-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold font-mono mt-1">{counts.pending}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 border-l-4 border-l-green-500 p-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Approved</p>
          <p className="text-2xl font-bold font-mono mt-1">{counts.approved}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 border-l-4 border-l-red-500 p-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Rejected</p>
          <p className="text-2xl font-bold font-mono mt-1">{counts.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search business, city, or service..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-600 w-full sm:w-72"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">
            {search ? 'No requests match your search' : 'No requests found'}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1fr_0.8fr_0.7fr_0.8fr_1fr] gap-2 px-5 py-3 border-b border-slate-700 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <div>Business</div>
              <div>Service</div>
              <div>City, State</div>
              <div>Revenue</div>
              <div>Team</div>
              <div>Status</div>
              <div>Submitted</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            {requests.map((req) => (
              <div key={req.id}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.2fr_1fr_0.8fr_0.7fr_0.8fr_1fr] gap-2 px-5 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{req.business_name}</p>
                    <p className="text-xs text-slate-400">{req.contact_name}</p>
                  </div>
                  <div className="text-sm text-slate-300 capitalize">{req.service_category?.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-slate-300">{req.city}, {req.state}</div>
                  <div className="text-sm text-slate-300">{req.monthly_revenue || '-'}</div>
                  <div className="text-sm text-slate-300">{req.team_size || '-'}</div>
                  <div><StatusBadge status={req.status} /></div>
                  <div className="text-xs text-slate-400">{timeAgo(req.created_at)}</div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAction(req.id, 'approved')}
                          disabled={actionLoading === req.id}
                          className="px-2.5 py-1 rounded text-[11px] font-cta font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'rejected')}
                          disabled={actionLoading === req.id}
                          className="px-2.5 py-1 rounded text-[11px] font-cta font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 capitalize">{req.status}</span>
                    )}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expandedId === req.id && (
                  <div className="bg-slate-700/40 border-b border-slate-700/50 px-5 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Contact Info */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Info</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Email</p>
                            <a href={`mailto:${req.email}`} className="text-sm text-teal-400 hover:text-teal-300">
                              {req.email}
                            </a>
                          </div>
                          {req.phone && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Phone</p>
                              <a href={`tel:${req.phone}`} className="text-sm text-teal-400 hover:text-teal-300">
                                {req.phone}
                              </a>
                            </div>
                          )}
                          {req.website && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Website</p>
                              <a
                                href={req.website.startsWith('http') ? req.website : `https://${req.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-teal-400 hover:text-teal-300"
                              >
                                {req.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Business Details */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Details</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Years in Business</p>
                            <p className="text-sm text-slate-300">{req.years_in_business || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Team Size</p>
                            <p className="text-sm text-slate-300">{req.team_size || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Monthly Revenue</p>
                            <p className="text-sm text-slate-300">{req.monthly_revenue || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Current System</p>
                            <p className="text-sm text-slate-300">{req.current_system || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">How They Found Us</p>
                            <p className="text-sm text-slate-300">{req.referral_source || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Pitch & Actions */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Their Pitch</h3>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {req.pitch || 'No pitch provided'}
                        </p>

                        <div className="pt-2">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Notes</h3>
                          <textarea
                            value={adminNotes[req.id] ?? req.admin_notes ?? ''}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                            placeholder="Add notes about this request..."
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-gray-500 resize-none"
                          />
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAction(req.id, 'approved')}
                              disabled={actionLoading === req.id}
                              className="flex-1 px-3 py-2 rounded-lg text-sm font-cta font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === req.id ? 'Updating...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'rejected')}
                              disabled={actionLoading === req.id}
                              className="flex-1 px-3 py-2 rounded-lg text-sm font-cta font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === req.id ? 'Updating...' : 'Reject'}
                            </button>
                          </div>
                        )}

                        {req.status !== 'pending' && req.reviewed_at && (
                          <div className="pt-1">
                            <p className="text-[10px] text-slate-400 uppercase">Reviewed</p>
                            <p className="text-xs text-slate-400">{timeAgo(req.reviewed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
