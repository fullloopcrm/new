// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
interface FeedbackItem {
  id: string
  type: string
  title: string
  message: string
  source: string
  created_at: string
  read: boolean
}

export default function FeedbackPage() {
  useEffect(() => { document.title = 'Feedback | The NYC Maid' }, [])
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feedback')
      if (res.ok) {
        const json = await res.json()
        setFeedback(json.feedback || [])
        setTotalCount(json.totalCount || 0)
        setUnreadCount(json.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true })
      })
      if (res.ok) {
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, read: true } : f))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark feedback as read:', err)
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        const item = feedback.find(f => f.id === id)
        setFeedback(prev => prev.filter(f => f.id !== id))
        setTotalCount(prev => prev - 1)
        if (item && !item.read) setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to delete feedback:', err)
    }
    setDeletingId(null)
  }

  const formatDate = (dateStr: string) => {
    const ts = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    const date = new Date(ts)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const timeAgo = (dateStr: string) => {
    const ts = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    const diffMs = Date.now() - new Date(ts).getTime()
    if (diffMs < 0) return 'just now'
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  const getSourceLabel = (source: string) => {
    const s = source?.toLowerCase() || ''
    if (s.includes('widget')) return 'Widget'
    if (s.includes('email')) return 'Email'
    if (s.includes('sms') || s.includes('text')) return 'SMS'
    if (s.includes('portal') || s.includes('client')) return 'Client Portal'
    if (s.includes('cleaner')) return 'Cleaner Portal'
    if (s.includes('book')) return 'Booking Flow'
    if (s.includes('web') || s.includes('site')) return 'Website'
    return source || 'Unknown'
  }

  const getSourceColor = (source: string) => {
    const s = source?.toLowerCase() || ''
    if (s.includes('widget')) return 'bg-purple-100 text-purple-700'
    if (s.includes('email')) return 'bg-blue-100 text-blue-700'
    if (s.includes('sms') || s.includes('text')) return 'bg-green-100 text-green-700'
    if (s.includes('portal') || s.includes('client')) return 'bg-[#A8F0DC]/30 text-[#1E2A4A]'
    if (s.includes('cleaner')) return 'bg-orange-100 text-orange-700'
    if (s.includes('book')) return 'bg-yellow-100 text-yellow-700'
    if (s.includes('web') || s.includes('site')) return 'bg-indigo-100 text-indigo-700'
    return 'bg-gray-100 text-gray-700'
  }

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'unread') return !f.read
    if (filter === 'read') return f.read
    return true
  })

  return (
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1E2A4A]">Feedback</h2>
            <p className="text-sm text-gray-400 mt-0.5">{totalCount} total &middot; {unreadCount} unread</p>
          </div>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium text-sm shadow-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">OVERVIEW</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Total Feedback</p>
            <p className="text-2xl font-bold text-teal-800 mt-1">{totalCount}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Unread</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{unreadCount}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm hidden md:block">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">Read</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{totalCount - unreadCount}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'unread' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'read' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Read ({totalCount - unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="text-4xl mb-3">
              {filter === 'unread' ? '✅' : '📭'}
            </div>
            <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">
              {filter === 'unread' ? 'All caught up!' : filter === 'read' ? 'No read feedback' : 'No feedback yet'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {filter === 'unread'
                ? 'No unread feedback at the moment.'
                : filter === 'read'
                  ? 'No feedback has been marked as read yet.'
                  : 'Feedback submissions will appear here when clients or visitors send them.'}
            </p>
          </div>
        ) : (
          <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">FEEDBACK ITEMS</h3>
          <div className="space-y-3">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${
                  !item.read ? 'border-l-4 border-l-[#A8F0DC] border-t border-r border-b border-t-gray-100 border-r-gray-100 border-b-gray-100 bg-[#A8F0DC]/5 shadow-sm' : 'border-gray-100 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row: source badge, unread indicator, timestamp */}
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(item.source)}`}>
                        {getSourceLabel(item.source)}
                      </span>
                      {!item.read && (
                        <span className="px-2.5 py-0.5 bg-[#A8F0DC]/40 text-[#1E2A4A] rounded-full text-xs font-semibold">
                          New
                        </span>
                      )}
                      {item.type && item.type !== 'feedback' && (
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                          {item.type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full" title={formatDate(item.created_at)}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    {/* Title if present */}
                    {item.title && (
                      <h4 className="font-semibold text-[#1E2A4A] mb-1">{item.title}</h4>
                    )}

                    {/* Full message */}
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">{item.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!item.read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="px-3 py-2.5 bg-[#1E2A4A] text-white rounded-lg text-xs font-medium hover:bg-[#1E2A4A]/90 transition-colors whitespace-nowrap"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteFeedback(item.id)}
                      disabled={deletingId === item.id}
                      className="px-3 py-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </main>
  )
}
