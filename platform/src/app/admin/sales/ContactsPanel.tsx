'use client'

import { useEffect, useState, useCallback } from 'react'
import { STAGE_LABELS, type LeadStage } from '@/lib/lead-stages'
import { FIT_BUCKET_META, fitBucket } from '@/lib/lead-fit'

interface Contact {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string
  service_category: string | null
  city: string | null
  state: string | null
  status: LeadStage
  fit_bucket: string | null
  created_at: string
  referral_source: string | null
}

interface Note {
  id: string
  body: string | null
  image_urls: string[] | null
  author: string | null
  created_at: string
}

const STAGE_BADGE: Record<LeadStage, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  proposed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  sold: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200',
}

// Contacts are the same records as Leads (partner_requests), shown contact-first.
// Every lead created — public /qualify or admin "New Lead" — appears here
// automatically, and its notes are the same notes tied to that lead.
export function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notesList, setNotesList] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [noteErr, setNoteErr] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) {
      const data = await res.json()
      setContacts(data.requests || [])
    }
    setLoading(false)
  }, [search])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const loadNotes = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/notes?subject_type=lead&subject_id=${id}`)
    if (res.ok) { const d = await res.json(); setNotesList(d.notes || []) }
  }, [])

  const selected = contacts.find(c => c.id === selectedId) || null

  function selectContact(c: Contact) {
    setSelectedId(c.id)
    setNewNote('')
    setNoteErr('')
    setNotesList([])
    loadNotes(c.id)
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return
    setSaving(true); setNoteErr('')
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_type: 'lead', subject_id: selected.id, body: newNote }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add note')
      setNewNote('')
      await loadNotes(selected.id)
    } catch (e) { setNoteErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function deleteNote(id: string) {
    if (!selected) return
    await fetch(`/api/admin/notes?id=${id}`, { method: 'DELETE' })
    await loadNotes(selected.id)
  }

  function exportCsv() {
    const headers = ['Business', 'Contact', 'Email', 'Phone', 'City', 'State', 'Category', 'Stage', 'Fit', 'Source', 'Created']
    const esc = (v: unknown) => {
      let s = v == null ? '' : String(v)
      // Neutralize CSV formula injection (Excel/Sheets execute leading =,+,-,@).
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = contacts.map(c => [
      c.business_name, c.contact_name, c.email, c.phone,
      c.city, c.state, c.service_category, STAGE_LABELS[c.status] || c.status,
      c.fit_bucket ? FIT_BUCKET_META[fitBucket(c.fit_bucket)].label : '',
      c.referral_source, new Date(c.created_at).toLocaleDateString(),
    ].map(esc).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts — business, name, email, city..."
          className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-600"
        />
        <span className="text-xs text-slate-400">{contacts.length} contacts</span>
        <button
          onClick={exportCsv}
          disabled={contacts.length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">
        {/* LIST */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-slate-400 py-12 text-center text-sm">Loading...</p>
          ) : contacts.length === 0 ? (
            <p className="text-slate-400 py-12 text-center text-sm">No contacts yet</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectContact(c)}
                  className={`w-full text-left px-4 py-3 transition-colors ${selectedId === c.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.contact_name || c.business_name}</p>
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${STAGE_BADGE[c.status]}`}>{STAGE_LABELS[c.status]}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.business_name} · {c.email}</p>
                  <p className="text-[11px] text-slate-400 truncate">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAIL */}
        <div className="border border-slate-100 rounded-xl p-5">
          {!selected ? (
            <p className="text-slate-400 py-12 text-center text-sm">Select a contact</p>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selected.contact_name}</h2>
                  <p className="text-sm text-slate-500">{selected.business_name}</p>
                </div>
                <span className={`shrink-0 inline-block px-2.5 py-1 rounded text-xs font-medium border ${STAGE_BADGE[selected.status]}`}>
                  {STAGE_LABELS[selected.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                <Detail label="Email" value={selected.email} />
                <Detail label="Phone" value={selected.phone} />
                <Detail label="Category" value={selected.service_category} />
                <Detail label="Location" value={[selected.city, selected.state].filter(Boolean).join(', ')} />
                <Detail label="Source" value={selected.referral_source} />
                <Detail label="Added" value={new Date(selected.created_at).toLocaleDateString()} />
              </div>

              {/* Notes — tied to the same lead record */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Notes (shared with the lead)</p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNote() }}
                    placeholder="Add a note..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-600"
                  />
                  <button onClick={addNote} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Add</button>
                </div>
                {noteErr && <p className="text-xs text-red-600 mb-2">{noteErr}</p>}
                {notesList.length === 0 ? (
                  <p className="text-xs text-slate-400">No notes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {notesList.map(n => (
                      <li key={n.id} className="group text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-slate-700 whitespace-pre-wrap">{n.body}</p>
                          <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-400 hover:text-red-600">Delete</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{n.author || 'admin'} · {new Date(n.created_at).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-slate-800 break-words">{value || '—'}</p>
    </div>
  )
}
