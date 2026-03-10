'use client'

import { useEffect, useState } from 'react'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
  target: string
  target_value: string | null
  priority: string
  published: boolean
  created_at: string
}

const typeColors: Record<string, string> = {
  changelog: 'bg-purple-500/20 text-purple-400',
  maintenance: 'bg-yellow-500/20 text-yellow-400',
  direct: 'bg-teal-500/20 text-teal-400',
  announcement: 'bg-slate-600 text-slate-300',
}

const filterTabs = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
]

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    title: '', body: '', type: 'announcement', target: 'all', target_value: '', priority: 'normal',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAnnouncements() }, [])

  function loadAnnouncements() {
    fetch('/api/admin/announcements')
      .then((r) => r.json())
      .then((data) => { setAnnouncements(data.announcements || []); setLoading(false) })
  }

  async function createAndPublish() {
    setSaving(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, published: true }),
    })
    if (res.ok) {
      setComposing(false)
      setForm({ title: '', body: '', type: 'announcement', target: 'all', target_value: '', priority: 'normal' })
      loadAnnouncements()
    }
    setSaving(false)
  }

  async function saveDraft() {
    setSaving(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, published: false }),
    })
    if (res.ok) {
      setComposing(false)
      setForm({ title: '', body: '', type: 'announcement', target: 'all', target_value: '', priority: 'normal' })
      loadAnnouncements()
    }
    setSaving(false)
  }

  async function publishDraft(id: string) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: true }),
    })
    loadAnnouncements()
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    loadAnnouncements()
  }

  const publishedCount = announcements.filter(a => a.published).length
  const draftCount = announcements.filter(a => !a.published).length
  const filtered = filter === 'all' ? announcements :
    filter === 'published' ? announcements.filter(a => a.published) :
    announcements.filter(a => !a.published)

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Announcements</h1>
          <p className="text-sm text-slate-400">{announcements.length} total &middot; {publishedCount} published &middot; {draftCount} drafts</p>
        </div>
        <button onClick={() => setComposing(!composing)}
          className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white transition-colors">
          {composing ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* COMPOSE FORM */}
      {composing && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-sm mb-4">Compose</h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Title *</label>
              <input
                placeholder="What's the announcement about?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Message *</label>
              <textarea
                placeholder="Write your message..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none placeholder-gray-600"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                  <option value="announcement">Announcement</option>
                  <option value="changelog">Changelog</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="direct">Direct Message</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Target</label>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                  <option value="all">All Businesses</option>
                  <option value="industry">By Industry</option>
                  <option value="plan">By Plan</option>
                  <option value="tenant">Specific Business</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            {(form.target === 'industry' || form.target === 'plan' || form.target === 'tenant') && (
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Target Value</label>
                <input
                  placeholder={form.target === 'tenant' ? 'Tenant ID' : form.target === 'industry' ? 'Industry (e.g. cleaning)' : 'Plan (e.g. pro)'}
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-gray-600"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={createAndPublish} disabled={saving || !form.title || !form.body}
                className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 transition-colors">
                {saving ? 'Sending...' : 'Publish & Send'}
              </button>
              <button onClick={saveDraft} disabled={saving || !form.title || !form.body}
                className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
                Save Draft
              </button>
              <button onClick={() => setComposing(false)} className="text-sm text-slate-400 hover:text-white px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex gap-1 mb-4">
        {filterTabs.map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === tab.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-medium text-sm">{a.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColors[a.type] || 'bg-slate-600 text-slate-400'}`}>
                    {a.type}
                  </span>
                  {a.priority === 'urgent' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-500/20 text-red-400">urgent</span>
                  )}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.published ? 'bg-green-400' : 'bg-slate-600'}`} />
                </div>
                <p className="text-sm text-slate-400 mb-2">{a.body.length > 150 ? a.body.slice(0, 150) + '...' : a.body}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>Target: {a.target}{a.target_value ? ` (${a.target_value})` : ''}</span>
                  <span>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {!a.published && (
                  <button onClick={() => publishDraft(a.id)}
                    className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors">
                    Publish
                  </button>
                )}
                <button onClick={() => deleteAnnouncement(a.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            {filter === 'all' ? 'No announcements yet — create your first one above' : `No ${filter} announcements`}
          </div>
        )}
      </div>
    </div>
  )
}
