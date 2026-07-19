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
  const [feedback, setFeedback] = useState<ClientFeedbackItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'credit_pending'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/client-feedback')
    if (res.ok) {
      const json = await res.json()
      setFeedback(json.feedback || [])
      setTotalCount(json.totalCount || 0)
      setUnreadCount(json.unreadCount || 0)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const res = await fetch('/api/admin/client-feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    if (res.ok) {
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, read: true } : f)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    setDeletingId(id)
    const res = await fetch('/api/admin/client-feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      const item = feedback.find((f) => f.id === id)
      setFeedback((prev) => prev.filter((f) => f.id !== id))
      setTotalCount((prev) => prev - 1)
      if (item && !item.read) setUnreadCount((prev) => Math.max(0, prev - 1))
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

  const creditPendingCount = feedback.filter((f) => f.credit_cents && !f.credit_applied).length

  const filtered = feedback.filter((f) => {
    if (filter === 'unread') return !f.read
    if (filter === 'credit_pending') return f.credit_cents && !f.credit_applied
    return true
  })

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Client Feedback</h1>
          <p className="text-sm text-slate-400 mt-0.5">{totalCount} total &middot; {unreadCount} unread &middot; {creditPendingCount} credit pending</p>
        </div>
        <button onClick={fetchFeedback} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors">
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'credit_pending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f === 'all' ? `All (${totalCount})` : f === 'unread' ? `Unread (${unreadCount})` : `Credit Pending (${creditPendingCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No feedback yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Submissions from your feedback form and feedback-campaign replies will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id}
              className={`border rounded-lg p-4 transition-all ${!item.read ? 'border-l-4 border-l-teal-500 bg-teal-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {item.category === 'anonymous' ? (
                      <span className="font-semibold text-slate-500 italic text-sm">Anonymous</span>
                    ) : item.category === 'unmatched' ? (
                      <span className="font-semibold text-slate-900 text-sm">
                        {item.submitted_name || 'Unknown'}
                        {item.submitted_phone && <span className="text-xs text-slate-400 font-normal ml-1.5">{formatPhone(item.submitted_phone)}</span>}
                      </span>
                    ) : (
                      <>
                        <Link href="/dashboard/clients" className="font-semibold text-slate-900 hover:underline text-sm">
                          {item.clients?.name || 'Unknown client'}
                        </Link>
                        {item.clients?.phone && <span className="text-xs text-slate-400">{formatPhone(item.clients.phone)}</span>}
                      </>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      item.category === 'client' ? 'bg-teal-100 text-teal-700'
                      : item.category === 'anonymous' ? 'bg-slate-100 text-slate-500'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.category === 'client' ? 'Client' : item.category === 'anonymous' ? 'Anonymous' : 'Unmatched'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                      {item.source?.toUpperCase() || 'WEB'}
                    </span>
                    {item.campaigns?.name && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">{item.campaigns.name}</span>
                    )}
                    {!item.read && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-semibold">New</span>}
                    {item.credit_cents ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.credit_applied ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                        ${(item.credit_cents / 100).toFixed(0)} credit {item.credit_applied ? 'applied' : 'pending'}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(item.created_at)}</span>
                  </div>
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
