'use client'

import { useEffect, useState } from 'react'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
  published: boolean
  created_at: string
}

export default function ChangelogAdminPage() {
  const [entries, setEntries] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  function load() {
    fetch('/api/admin/announcements')
      .then((r) => r.json())
      .then((data) => {
        setEntries((data.announcements || []).filter((a: Announcement) => a.type === 'changelog'))
        setLoading(false)
      })
  }

  async function publish() {
    setSaving(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, type: 'changelog', target: 'all', published: true }),
    })
    if (res.ok) {
      setComposing(false)
      setTitle('')
      setBody('')
      load()
    }
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this changelog entry?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Changelog</h1>
          <p className="text-sm text-slate-400">{entries.length} entries &middot; visible to all businesses</p>
        </div>
        <button onClick={() => setComposing(!composing)}
          className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white transition-colors">
          {composing ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* COMPOSE */}
      {composing && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-sm mb-4">New Changelog Entry</h2>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Title *</label>
            <input
              placeholder="What's new? (e.g. Setup Checklist, Calendar View)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mb-4 placeholder-gray-600"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Description *</label>
            <textarea
              placeholder="Describe the changes..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none mb-4 placeholder-gray-600"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={publish} disabled={saving || !title || !body}
              className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 transition-colors">
              {saving ? 'Publishing...' : 'Publish'}
            </button>
            <button onClick={() => setComposing(false)} className="text-sm text-slate-400 hover:text-white px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="space-y-4">
        {entries.map((e, i) => (
          <div key={e.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 relative">
            {i < entries.length - 1 && (
              <div className="absolute left-8 top-full w-px h-4 bg-slate-700" />
            )}
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-sm">{e.title}</h3>
                    <span className="text-[10px] text-slate-400">
                      {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">{e.body}</p>
                </div>
              </div>
              <button onClick={() => deleteEntry(e.id)}
                className="text-xs text-red-400 hover:text-red-300 ml-4 flex-shrink-0 font-cta transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            No changelog entries yet — publish your first one above
          </div>
        )}
      </div>
    </div>
  )
}
