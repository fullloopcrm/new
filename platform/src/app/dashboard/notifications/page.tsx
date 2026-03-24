'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePoll } from '@/lib/use-poll'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  channel: string
  status: string
  created_at: string
  metadata: { read?: boolean } | null
}

const TYPE_COLORS: Record<string, string> = {
  booking_confirmed: 'bg-blue-50 text-blue-700',
  booking_reminder: 'bg-indigo-50 text-indigo-700',
  booking_cancelled: 'bg-red-50 text-red-700',
  booking_completed: 'bg-green-50 text-green-700',
  check_in: 'bg-teal-50 text-teal-700',
  check_out: 'bg-teal-50 text-teal-700',
  payment_received: 'bg-emerald-50 text-emerald-700',
  review_request: 'bg-yellow-50 text-yellow-700',
  review_received: 'bg-yellow-50 text-yellow-700',
  new_client: 'bg-purple-50 text-purple-700',
  new_booking: 'bg-blue-50 text-blue-700',
  daily_summary: 'bg-slate-100 text-slate-500',
  video_uploaded: 'bg-violet-50 text-violet-700',
  '15min_warning': 'bg-amber-50 text-amber-700',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications?mark_read=true')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || [])
        setUnread(data.unread || 0)
      })
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])
  usePoll(fetchNotifications, 15000)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          {unread > 0 && <p className="text-sm text-blue-400">{unread} unread</p>}
        </div>
      </div>

      {/* SEARCH + TYPE FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {Array.from(new Set(notifications.map((n) => n.type))).sort().map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {notifications.filter((n) => {
          if (typeFilter && n.type !== typeFilter) return false
          if (search) {
            const q = search.toLowerCase()
            if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false
          }
          return true
        }).map((n) => (
          <div key={n.id} className={`border border-slate-200 rounded-lg p-4 ${!n.metadata?.read ? 'border-l-4 border-l-blue-500' : ''}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[n.type] || 'bg-slate-100 text-slate-500'}`}>
                  {n.type.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs ${n.status === 'sent' ? 'text-green-500' : n.status === 'failed' ? 'text-red-500' : 'text-slate-400'}`}>
                  {n.status}
                </span>
              </div>
              <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
            </div>
            <p className="font-medium text-sm text-slate-900">{n.title}</p>
            <p className="text-sm text-slate-400 mt-1">{n.message}</p>
          </div>
        ))}
        {notifications.length === 0 && !search && !typeFilter && (
          <p className="text-center py-12 text-slate-400">No notifications yet</p>
        )}
        {(search || typeFilter) && notifications.filter((n) => {
          if (typeFilter && n.type !== typeFilter) return false
          if (search) {
            const q = search.toLowerCase()
            if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false
          }
          return true
        }).length === 0 && notifications.length > 0 && (
          <p className="text-center py-12 text-slate-400">No notifications match your filters</p>
        )}
      </div>
    </div>
  )
}
