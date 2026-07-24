'use client'

/**
 * Team Announcements — the admin "home" for posting rules/updates to the
 * field team. Replaces the old single-blob Guidelines field, whose
 * team-facing read pointed at a nonexistent column and whose Broadcast
 * button called a route that didn't exist -- saved guidelines never
 * actually reached a cleaner. This is a running feed: post a new entry any
 * time, optionally notify the whole active team by SMS, and every past
 * entry stays visible (to admin here, and to the team on /team/rules).
 */
import { useEffect, useState } from 'react'

type Announcement = {
  id: string
  title_en: string | null
  title_es: string | null
  body_en: string
  body_es: string | null
  created_at: string
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notifyTeam, setNotifyTeam] = useState(true)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = () => {
    fetch('/api/settings/team-announcements')
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const post = async () => {
    if (!body.trim() || posting) return
    setPosting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/team-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, notifyTeam }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Failed: ${data.error || 'unknown error'}`)
      } else {
        setTitle('')
        setBody('')
        setMessage(notifyTeam ? `Posted and texted ${data.notified} team member(s).` : 'Posted.')
        load()
      }
    } catch {
      setMessage('Failed: network error')
    } finally {
      setPosting(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">New Announcement</h3>
        <p className="text-sm text-slate-400 mb-6">
          Written in English — auto-translated to Spanish. Every team member sees it on their Announcements page; optionally text the whole active team now too.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's new..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input type="checkbox" checked={notifyTeam} onChange={(e) => setNotifyTeam(e.target.checked)} />
            Text the whole active team now
          </label>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={post}
            disabled={posting || !body.trim()}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {posting ? 'Posting...' : notifyTeam ? 'Post & Notify Team' : 'Post'}
          </button>
          {message && <span className="text-sm text-slate-500">{message}</span>}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] text-slate-400 uppercase tracking-wide mb-3">Past Announcements</h3>
        {loading && <p className="text-sm text-slate-400">Loading...</p>}
        {!loading && announcements.length === 0 && (
          <p className="text-sm text-slate-400">Nothing posted yet.</p>
        )}
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-semibold text-sm text-slate-800">{a.title_en || 'Announcement'}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(a.created_at)}</span>
              </div>
              <p className="text-sm text-slate-500 whitespace-pre-line">{a.body_en}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
