'use client'

import { useEffect, useState } from 'react'

type FeedbackItem = {
  id: string
  category: string
  message: string
  status: string
  admin_notes: string | null
  created_at: string
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  bug: 'Bug Report',
  feature: 'Feature Request',
  pricing: 'Pricing',
  partnership: 'Partnership',
  complaint: 'Complaint',
  praise: 'Praise',
  other: 'Other',
}

const categoryColors: Record<string, string> = {
  bug: 'bg-red-50 text-red-600 border border-red-200',
  feature: 'bg-teal-50 text-teal-600 border border-teal-200',
  pricing: 'bg-purple-50 text-purple-600 border border-purple-200',
  partnership: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
  complaint: 'bg-orange-50 text-orange-600 border border-orange-200',
  praise: 'bg-green-50 text-green-600 border border-green-200',
  general: 'bg-slate-200 text-slate-400',
  other: 'bg-slate-200 text-slate-400',
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'actioned', label: 'Actioned' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/feedback')
      .then((r) => r.json())
      .then((data) => {
        setFeedback(data.feedback || [])
        setUnreadCount(data.unread || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    )
    if (status !== 'unread') setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function saveNotes(id: string, notes: string) {
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, admin_notes: notes }),
    })
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, admin_notes: notes } : f))
    )
  }

  const filtered = feedback.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false
    return true
  })

  const totalCount = feedback.length
  const categoryBreakdown = feedback.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Anonymous Feedback</h1>
        <p className="text-sm text-slate-500">{totalCount} total submissions &middot; {unreadCount} unread</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 border-b border-slate-200 pb-6">
        <div className="border-l-4 border-l-gray-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{totalCount}</p>
        </div>
        <div className="border-l-4 border-l-yellow-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Unread</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{unreadCount}</p>
        </div>
        <div className="border-l-4 border-l-red-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Bugs</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{categoryBreakdown.bug || 0}</p>
        </div>
        <div className="border-l-4 border-l-teal-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Feature Requests</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{categoryBreakdown.feature || 0}</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === tab.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            {tab.value === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="py-8 text-center text-slate-500">
          Loading feedback...
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map((f) => (
            <div key={f.id} className="overflow-hidden">
              <button
                onClick={() => {
                  setExpandedId(expandedId === f.id ? null : f.id)
                  if (f.status === 'unread') updateStatus(f.id, 'read')
                }}
                className="w-full text-left py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${categoryColors[f.category] || 'bg-slate-200 text-slate-400'}`}>
                        {categoryLabels[f.category] || f.category}
                      </span>
                      {f.status === 'unread' && (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                      )}
                      {f.status === 'actioned' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-50 text-green-600 border border-green-200">Actioned</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{f.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 ml-4 whitespace-nowrap">{timeAgo(f.created_at)}</span>
                </div>
              </button>

              {expandedId === f.id && (
                <div className="border-t border-slate-200 py-4">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{f.message}</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Submitted {new Date(f.created_at).toLocaleString()}
                  </p>

                  <div className="mb-4">
                    <label className="text-xs text-slate-500 uppercase mb-1 block">Admin Notes</label>
                    <textarea
                      defaultValue={f.admin_notes || ''}
                      onBlur={(e) => saveNotes(f.id, e.target.value)}
                      rows={2}
                      placeholder="Internal notes..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {f.status !== 'actioned' && (
                      <button
                        onClick={() => updateStatus(f.id, 'actioned')}
                        className="bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors"
                      >
                        Mark Actioned
                      </button>
                    )}
                    {f.status !== 'unread' && (
                      <button
                        onClick={() => updateStatus(f.id, 'unread')}
                        className="bg-yellow-50 text-yellow-600 border border-yellow-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors"
                      >
                        Mark Unread
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              {statusFilter ? `No ${statusFilter} feedback` : 'No feedback submitted yet'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
