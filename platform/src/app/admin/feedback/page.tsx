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
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-blue-500/20 text-blue-400',
  pricing: 'bg-purple-500/20 text-purple-400',
  partnership: 'bg-indigo-500/20 text-indigo-400',
  complaint: 'bg-orange-500/20 text-orange-400',
  praise: 'bg-green-500/20 text-green-400',
  general: 'bg-gray-700 text-gray-400',
  other: 'bg-gray-700 text-gray-400',
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
        <h1 className="text-2xl font-bold">Anonymous Feedback</h1>
        <p className="text-sm text-gray-500">{totalCount} total submissions &middot; {unreadCount} unread</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-gray-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-yellow-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Unread</p>
          <p className="text-2xl font-bold mt-1">{unreadCount}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-red-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Bugs</p>
          <p className="text-2xl font-bold mt-1">{categoryBreakdown.bug || 0}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-blue-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Feature Requests</p>
          <p className="text-2xl font-bold mt-1">{categoryBreakdown.feature || 0}</p>
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
                ? 'bg-white text-gray-900'
                : 'text-gray-500 hover:bg-gray-800'
            }`}
          >
            {tab.label}
            {tab.value === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center text-gray-500">
          Loading feedback...
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  setExpandedId(expandedId === f.id ? null : f.id)
                  if (f.status === 'unread') updateStatus(f.id, 'read')
                }}
                className="w-full text-left px-5 py-4 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${categoryColors[f.category] || 'bg-gray-700 text-gray-400'}`}>
                        {categoryLabels[f.category] || f.category}
                      </span>
                      {f.status === 'unread' && (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                      )}
                      {f.status === 'actioned' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-500/20 text-green-400">Actioned</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{f.message}</p>
                  </div>
                  <span className="text-xs text-gray-600 ml-4 whitespace-nowrap">{timeAgo(f.created_at)}</span>
                </div>
              </button>

              {expandedId === f.id && (
                <div className="border-t border-gray-800 px-5 py-4 bg-gray-800/20">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap mb-4">{f.message}</p>
                  <p className="text-xs text-gray-600 mb-4">
                    Submitted {new Date(f.created_at).toLocaleString()}
                  </p>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Admin Notes</label>
                    <textarea
                      defaultValue={f.admin_notes || ''}
                      onBlur={(e) => saveNotes(f.id, e.target.value)}
                      rows={2}
                      placeholder="Internal notes..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {f.status !== 'actioned' && (
                      <button
                        onClick={() => updateStatus(f.id, 'actioned')}
                        className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors"
                      >
                        Mark Actioned
                      </button>
                    )}
                    {f.status !== 'unread' && (
                      <button
                        onClick={() => updateStatus(f.id, 'unread')}
                        className="bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors"
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
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center text-gray-500">
              {statusFilter ? `No ${statusFilter} feedback` : 'No feedback submitted yet'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
