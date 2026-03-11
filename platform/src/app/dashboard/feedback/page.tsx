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
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    const res = await fetch('/api/feedback')
    if (res.ok) {
      const json = await res.json()
      setFeedback(json.feedback || [])
      setTotalCount(json.totalCount || 0)
      setUnreadCount(json.unreadCount || 0)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const res = await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true })
    })
    if (res.ok) {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, read: true } : f))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    setDeletingId(id)
    const res = await fetch('/api/feedback', {
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
    setDeletingId(null)
  }

  const timeAgo = (dateStr: string) => {
    const ts = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    const diffMs = Date.now() - new Date(ts).getTime()
    if (diffMs < 0) return 'just now'
    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMs / 3600000)
    const days = Math.floor(diffMs / 86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getSourceLabel = (source: string) => {
    const s = source?.toLowerCase() || ''
    if (s.includes('widget')) return 'Widget'
    if (s.includes('email')) return 'Email'
    if (s.includes('sms')) return 'SMS'
    if (s.includes('portal') || s.includes('client')) return 'Client Portal'
    if (s.includes('team')) return 'Team Portal'
    if (s.includes('book')) return 'Booking Flow'
    if (s.includes('web') || s.includes('site')) return 'Website'
    return source || 'Unknown'
  }

  const getSourceColor = (source: string) => {
    const s = source?.toLowerCase() || ''
    if (s.includes('widget')) return 'bg-purple-100 text-purple-700'
    if (s.includes('email')) return 'bg-blue-100 text-blue-700'
    if (s.includes('sms')) return 'bg-green-100 text-green-700'
    if (s.includes('portal') || s.includes('client')) return 'bg-teal-50 text-teal-700'
    if (s.includes('team')) return 'bg-orange-100 text-orange-700'
    if (s.includes('book')) return 'bg-yellow-100 text-yellow-700'
    return 'bg-slate-100 text-slate-700'
  }

  const filtered = feedback.filter(f => {
    if (filter === 'unread') return !f.read
    if (filter === 'read') return f.read
    return true
  })

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Feedback</h1>
          <p className="text-sm text-slate-400 mt-0.5">{totalCount} total &middot; {unreadCount} unread</p>
        </div>
        <button onClick={fetchFeedback} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border-l-4 border-l-slate-400 pl-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-xl font-bold font-mono text-slate-900">{totalCount}</p>
        </div>
        <div className="border-l-4 border-l-yellow-500 pl-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Unread</p>
          <p className="text-xl font-bold font-mono text-slate-900">{unreadCount}</p>
        </div>
        <div className="border-l-4 border-l-green-500 pl-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Read</p>
          <p className="text-xl font-bold font-mono text-slate-900">{totalCount - unreadCount}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f} ({f === 'all' ? totalCount : f === 'unread' ? unreadCount : totalCount - unreadCount})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-slate-400">
          {filter === 'unread' ? 'All caught up!' : 'No feedback yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id}
              className={`border rounded-lg p-4 transition-all ${!item.read ? 'border-l-4 border-l-teal-500 bg-teal-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceColor(item.source)}`}>
                      {getSourceLabel(item.source)}
                    </span>
                    {!item.read && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-semibold">New</span>}
                    {item.type && item.type !== 'feedback' && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px]">{item.type}</span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(item.created_at)}</span>
                  </div>
                  {item.title && <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.title}</h4>}
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{item.message}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!item.read && (
                    <button onClick={() => markAsRead(item.id)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700">
                      Mark Read
                    </button>
                  )}
                  <button onClick={() => deleteFeedback(item.id)} disabled={deletingId === item.id}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50">
                    {deletingId === item.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
