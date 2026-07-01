'use client'

/**
 * Reusable CRM notes panel — timestamped, authored, image-capable log for a
 * lead or tenant. Same component on the Sales lead detail and the tenant page.
 */
import { useEffect, useState, useCallback } from 'react'

interface Note {
  id: string
  body: string | null
  image_urls: string[] | null
  author: string | null
  created_at: string
}

export function NotesPanel({ subjectType, subjectId }: { subjectType: 'lead' | 'tenant'; subjectId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/notes?subject_type=${subjectType}&subject_id=${subjectId}`)
    if (res.ok) { const d = await res.json(); setNotes(d.notes || []) }
  }, [subjectType, subjectId])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!newNote.trim() && images.length === 0) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_type: subjectType, subject_id: subjectId, body: newNote, image_urls: images }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setNewNote(''); setImages([]); await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function remove(id: string) {
    await fetch(`/api/admin/notes?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function upload(file: File) {
    setUploading(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/admin/notes/upload', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Upload failed')
      setImages(prev => [...prev, d.url])
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed') }
    setUploading(false)
  }

  return (
    <div>
      <textarea
        value={newNote}
        onChange={e => setNewNote(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-600"
      />
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="attachment" className="h-14 w-14 object-cover rounded border border-slate-200" />
              <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full w-4 h-4 text-[10px] leading-none">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={add} disabled={saving || (!newNote.trim() && images.length === 0)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Adding…' : 'Add note'}
        </button>
        <label className="text-xs text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
          {uploading ? 'Uploading…' : '📎 Image'}
          <input type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = '' }} />
        </label>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>

      {notes.length > 0 && (
        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()} · {n.author || 'admin'}</span>
                <button onClick={() => remove(n.id)} className="text-[10px] text-slate-400 hover:text-red-600">delete</button>
              </div>
              {n.body && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{n.body}</p>}
              {n.image_urls && n.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {n.image_urls.map(u => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="note" className="h-16 w-16 object-cover rounded border border-slate-200" /></a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
