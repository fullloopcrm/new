'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPhone } from '@/lib/format'

interface ClientFeedbackItem {
  id: string
  client_id: string | null
  campaign_id: string | null
  source: string
  message: string
  sentiment: string | null
  credit_cents: number | null
  credit_applied: boolean
  is_anonymous: boolean
  category: 'client' | 'anonymous' | 'unmatched'
  submitted_name: string | null
  submitted_phone: string | null
  read: boolean
  created_at: string
  clients: { name: string; phone: string | null; email: string | null } | null
  campaigns: { name: string } | null
}

export default function ClientFeedbackPage() {
  useEffect(() => { document.title = 'Client Feedback' }, [])
  const [feedback, setFeedback] = useState<ClientFeedbackItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'credit_pending'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/client-feedback')
      if (res.ok) {
        const json = await res.json()
        setFeedback(json.feedback || [])
        setTotalCount(json.totalCount || 0)
        setUnreadCount(json.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch client feedback:', err)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/client-feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
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
      const res = await fetch('/api/admin/client-feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
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
    return new Date(ts).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
  }

  const creditPendingCount = feedback.filter(f => f.credit_cents && !f.credit_applied).length

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'unread') return !f.read
    if (filter === 'credit_pending') return f.credit_cents && !f.credit_applied
    return true
  })

  return (
    <main className="p-3 md:p-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Client Feedback</h2>
          <p className="text-sm text-gray-400 mt-0.5">{totalCount} total &middot; {unreadCount} unread &middot; {creditPendingCount} credit pending</p>
        </div>
        <button
          onClick={fetchFeedback}
          className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium text-sm shadow-sm transition-colors"
        >
          Refresh
        </button>
      </div>

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
          onClick={() => setFilter('credit_pending')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'credit_pending' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Credit Pending ({creditPendingCount})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredFeedback.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">No feedback yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Client replies to feedback campaigns will appear here.</p>
        </div>
      ) : (
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
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    {item.category === 'anonymous' ? (
                      <span className="font-semibold text-gray-500 italic">Anonymous</span>
                    ) : item.category === 'unmatched' ? (
                      <span className="font-semibold text-[#1E2A4A]">
                        {item.submitted_name || 'Unknown'}
                        {item.submitted_phone && <span className="text-xs text-gray-400 font-normal ml-1.5">{formatPhone(item.submitted_phone)}</span>}
                      </span>
                    ) : (
                      <>
                        <Link href="/dashboard/clients" className="font-semibold text-[#1E2A4A] hover:underline">
                          {item.clients?.name || 'Unknown client'}
                        </Link>
                        {item.clients?.phone && <span className="text-xs text-gray-400">{formatPhone(item.clients.phone)}</span>}
                      </>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.category === 'client' ? 'bg-[#A8F0DC]/40 text-[#1E2A4A]'
                      : item.category === 'anonymous' ? 'bg-gray-100 text-gray-500'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.category === 'client' ? 'Client' : item.category === 'anonymous' ? 'Anonymous' : 'Unmatched'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {item.source?.toUpperCase() || 'SMS'}
                    </span>
                    {item.campaigns?.name && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">{item.campaigns.name}</span>
                    )}
                    {!item.read && (
                      <span className="px-2.5 py-0.5 bg-[#A8F0DC]/40 text-[#1E2A4A] rounded-full text-xs font-semibold">New</span>
                    )}
                    {item.credit_cents ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.credit_applied ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                        ${(item.credit_cents / 100).toFixed(0)} credit {item.credit_applied ? 'applied' : 'pending'}
                      </span>
                    ) : null}
                    <span className="text-xs text-gray-400 ml-auto whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">{item.message}</p>
                </div>
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
      )}
    </main>
  )
}
