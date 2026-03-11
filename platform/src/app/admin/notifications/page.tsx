'use client'

import { useEffect, useState } from 'react'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  channel: string
  recipient_type: string
  created_at: string
  tenant_id: string
  tenants?: { name: string }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount = notifications.filter(n => !n.read).length

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) return <p className="text-slate-500">Loading notifications...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">{unreadCount} unread across all businesses</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-cta font-semibold transition-colors ${
              filter === 'all' ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-cta font-semibold transition-colors ${
              filter === 'unread' ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-400 py-12 text-center">No notifications</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map(n => (
            <div key={n.id} className={`py-4 ${!n.read ? 'border-l-2 border-l-teal-500 pl-4' : 'pl-5'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {n.tenants?.name || 'Platform'} &middot; {n.type} &middot; {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
