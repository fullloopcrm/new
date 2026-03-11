'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  booking_id: string | null
  created_at: string
}

export default function TeamNotificationsPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/notifications', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [auth, router])

  async function markRead(id: string) {
    if (!auth) return
    await fetch('/api/team-portal/notifications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ id, read: true }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  async function markAllRead() {
    if (!auth) return
    await fetch('/api/team-portal/notifications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ mark_all_read: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  if (!auth) return null

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {t('Notifications', 'Notificaciones')}
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-400">
              {unreadCount} {t('unread', 'sin leer')}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 font-medium"
          >
            {t('Mark all read', 'Marcar todo leido')}
          </button>
        )}
      </div>

      {loading && (
        <p className="text-center py-12 text-slate-400">{t('Loading...', 'Cargando...')}</p>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-slate-400">
            {t('No notifications', 'Sin notificaciones')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${
              n.read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.read ? 'text-slate-600' : 'text-slate-800'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-slate-400 mt-1">{n.message}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-300 mt-2">
              {new Date(n.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
