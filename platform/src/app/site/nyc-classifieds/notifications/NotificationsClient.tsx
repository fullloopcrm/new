'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'


interface Notification {
  id: number
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

const typeIcons: Record<string, string> = {
  new_message: '\u2709',
  porch_reply: '\uD83D\uDCAC',
  helpful_vote: '\u2B50',
  listing_expiring: '\u23F0',
  listing_expired: '\u274C',
  listing_removed: '\u26A0',
  porch_post_removed: '\u26A0',
  flag_resolved: '\u2705',
  account_banned: '\uD83D\uDEAB',
  account_restored: '\u2705',
  admin_notice: '\uD83D\uDCE2',
  feedback_reply: '\uD83D\uDCDD',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: 'all' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: number) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/account" style={{ color: '#2563eb', fontSize: '1.25rem' }}>&larr;</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>No notifications yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {notifications.map(n => {
            const inner = (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                style={{
                  padding: '0.875rem 1rem',
                  backgroundColor: n.read ? '#fff' : '#eff6ff',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: n.link ? 'pointer' : 'default',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>
                  {typeIcons[n.type] || '\uD83D\uDD14'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: n.read ? 400 : 600, color: '#0f172a' }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{
                      fontSize: '0.8125rem',
                      color: '#64748b',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.read && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    flexShrink: 0,
                    marginTop: '6px',
                  }} />
                )}
              </div>
            )

            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => !n.read && markRead(n.id)}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            )
          })}
        </div>
      )}
    </main>
  )
}
