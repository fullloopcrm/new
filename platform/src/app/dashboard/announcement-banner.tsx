'use client'

import { useEffect, useState } from 'react'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
  priority: string
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    fetch('/api/announcements/unread')
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.unread || []))
      .catch(() => {})
  }, [])

  async function dismiss(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    await fetch('/api/announcements/unread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    })
  }

  if (announcements.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {announcements.map((a) => (
        <div
          key={a.id}
          className={`rounded-lg px-4 py-3 flex items-start justify-between ${
            a.priority === 'urgent'
              ? 'bg-red-500/10 border border-red-500/30'
              : a.type === 'maintenance'
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : 'bg-blue-500/10 border border-blue-500/30'
          }`}
        >
          <div>
            <p className={`text-sm font-medium ${
              a.priority === 'urgent' ? 'text-red-400' :
              a.type === 'maintenance' ? 'text-yellow-400' :
              'text-blue-400'
            }`}>
              {a.title}
            </p>
            <p className={`text-xs mt-0.5 ${
              a.priority === 'urgent' ? 'text-red-400' :
              a.type === 'maintenance' ? 'text-yellow-400' :
              'text-blue-400'
            }`}>
              {a.body.length > 150 ? a.body.slice(0, 150) + '...' : a.body}
            </p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className={`text-xs ml-3 flex-shrink-0 ${
              a.priority === 'urgent' ? 'text-red-400 hover:text-red-300' :
              a.type === 'maintenance' ? 'text-yellow-400 hover:text-yellow-300' :
              'text-blue-400 hover:text-blue-300'
            }`}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
