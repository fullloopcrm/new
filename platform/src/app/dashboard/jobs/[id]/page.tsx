'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Assignee = { id: string; name: string }
type Job = { id: string; title: string | null; status: string; total_cents: number; service_address: string | null; notes: string | null }
type Payment = { id: string; label: string; kind: string; amount_cents: number; status: string; trigger: string; paid_at: string | null }
type Session = {
  id: string
  start_time: string | null
  end_time: string | null
  status: string | null
  notes: string | null
  service_type: string | null
  team_member_id: string | null
  crew_id: string | null
  crew: { name: string | null; color: string | null } | null
  assignees: Assignee[]
}
type EventRow = { id: string; event_type: string; created_at: string }
type Crew = { id: string; name: string; color: string | null; members: Assignee[] }
type TeamMember = { id: string; name: string | null }
type JobPhoto = {
  id: string; url: string; photo_type: 'before' | 'after' | 'progress'
  source: 'crew' | 'client'; caption: string | null; uploaded_by: string | null; taken_at: string
}
type PhotoComment = { id: string; body: string | null; author: string; created_at: string }

function money(c: number) { return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
function when(iso: string | null) { return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' }
function dayLabel(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—' }
function timeLabel(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '' }
function monthKey(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unscheduled' }
function durationHrs(s: string | null, e: string | null) {
  if (!s || !e) return null
  const h = (new Date(e).getTime() - new Date(s).getTime()) / 3_600_000
  return h > 0 ? Math.round(h * 10) / 10 : null
}
/** ISO → a value the datetime-local input accepts, in the viewer's local time. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const JOB_STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-600', cancelled: 'bg-slate-100 text-slate-500',
}
const SESSION_STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-600', cancelled: 'bg-slate-100 text-slate-400',
  pending: 'bg-slate-100 text-slate-500',
}

/** Form state shared by add + edit of a session. */
type SessionForm = { start: string; duration: string; mode: 'crew' | 'people'; crewId: string; memberIds: string[]; service: string }
const EMPTY_FORM: SessionForm = { start: '', duration: '2', mode: 'people', crewId: '', memberIds: [], service: '' }

function formFromSession(s: Session): SessionForm {
  return {
    start: toLocalInput(s.start_time),
    duration: String(durationHrs(s.start_time, s.end_time) ?? 2),
    mode: s.crew_id ? 'crew' : 'people',
    crewId: s.crew_id ?? '',
    memberIds: s.assignees.map((a) => a.id),
    service: s.service_type ?? '',
  }
}

function SessionEditor({
  form, setForm, crews, team, onSave, onCancel, saving, saveLabel,
}: {
  form: SessionForm
  setForm: (f: SessionForm) => void
  crews: Crew[]
  team: TeamMember[]
  onSave: () => void
  onCancel?: () => void
  saving: boolean
  saveLabel: string
}) {
  const toggleMember = (id: string) =>
    setForm({ ...form, memberIds: form.memberIds.includes(id) ? form.memberIds.filter((m) => m !== id) : [...form.memberIds, id] })

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">When</span>
          <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Hours</span>
          <input type="number" min="0.5" step="0.5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
            className="w-16 px-2 py-1 text-xs rounded border border-slate-300 bg-white" />
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Visit name (optional)</span>
          <input type="text" value={form.service} placeholder="e.g. Demo day" onChange={(e) => setForm({ ...form, service: e.target.value })}
            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white" />
        </label>
      </div>

      <div>
        <div className="flex gap-1 mb-1.5">
          {(['people', 'crew'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setForm({ ...form, mode: m })}
              className={`text-[11px] px-2 py-0.5 rounded ${form.mode === m ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>
              {m === 'people' ? 'Individuals' : 'Crew'}
            </button>
          ))}
        </div>
        {form.mode === 'crew' ? (
          <select value={form.crewId} onChange={(e) => setForm({ ...form, crewId: e.target.value })}
            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white w-full max-w-xs">
            <option value="">Select a crew…</option>
            {crews.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.members.length})</option>)}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {team.length === 0 && <span className="text-xs text-slate-400">No team members.</span>}
            {team.map((t) => (
              <button key={t.id} type="button" onClick={() => toggleMember(t.id)}
                className={`text-[11px] px-2 py-1 rounded border ${form.memberIds.includes(t.id) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600'}`}>
                {t.name || 'Unnamed'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving || !form.start}
          className="px-3 py-1 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">{saving ? 'Saving…' : saveLabel}</button>
        {onCancel && <button onClick={onCancel} disabled={saving} className="px-3 py-1 text-xs rounded border border-slate-300 text-slate-500 hover:bg-white">Cancel</button>}
      </div>
    </div>
  )
}

const PHOTO_TYPE_LABEL: Record<string, string> = { before: 'Before', after: 'After', progress: 'Progress' }
const PHOTO_TYPE_STYLE: Record<string, string> = {
  before: 'bg-amber-50 text-amber-700', after: 'bg-green-50 text-green-600', progress: 'bg-slate-100 text-slate-500',
}

function PhotoLightbox({
  photo, jobId, onClose,
}: { photo: JobPhoto; jobId: string; onClose: () => void }) {
  const [comments, setComments] = useState<PhotoComment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const loadComments = useCallback(() => {
    fetch(`/api/jobs/${jobId}/photos/${photo.id}/comments`).then(r => r.json())
      .then(d => setComments(d.comments || [])).catch(() => {})
  }, [jobId, photo.id])
  useEffect(() => { loadComments() }, [loadComments])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await fetch(`/api/jobs/${jobId}/photos/${photo.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }),
      })
      setText('')
      loadComments()
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.caption || 'Job photo'} className="w-full max-h-[60vh] object-contain bg-slate-900" />
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PHOTO_TYPE_STYLE[photo.photo_type]}`}>{PHOTO_TYPE_LABEL[photo.photo_type]}</span>
            <span className="text-[10px] text-slate-400">{photo.source === 'client' ? 'From client' : (photo.uploaded_by || 'Crew')}</span>
            <span className="text-[10px] text-slate-400">{when(photo.taken_at)}</span>
          </div>
          {photo.caption && <p className="text-sm text-slate-700 mb-2">{photo.caption}</p>}

          <div className="space-y-1.5 mb-2">
            {comments.map(c => (
              <div key={c.id} className="text-xs bg-slate-50 rounded p-1.5">
                <span className="font-medium text-slate-700">{c.author}</span>
                <span className="text-slate-400 ml-1.5">{when(c.created_at)}</span>
                <p className="text-slate-600 mt-0.5">{c.body}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
          </div>

          <div className="flex gap-1.5">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…"
              className="flex-1 px-2 py-1 text-xs rounded border border-slate-300"
              onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
            <button onClick={send} disabled={sending || !text.trim()} className="text-xs px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-50">Send</button>
          </div>
          <button onClick={onClose} className="mt-2 text-[11px] text-slate-400 hover:underline">Close</button>
        </div>
      </div>
    </div>
  )
}

function PhotoGallery({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'progress'>('progress')
  const [selected, setSelected] = useState<JobPhoto | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    fetch(`/api/jobs/${jobId}/photos`).then(r => r.json()).then(d => setPhotos(d.photos || [])).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true); setErr('')
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        form.append('photo_type', photoType)
        const res = await fetch(`/api/jobs/${jobId}/photos`, { method: 'POST', body: form })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Upload failed') }
      }
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Job photos</h2>
        <div className="flex items-center gap-1.5">
          <select value={photoType} onChange={(e) => setPhotoType(e.target.value as typeof photoType)}
            className="text-[11px] px-1.5 py-1 rounded border border-slate-300">
            <option value="progress">Progress</option>
            <option value="before">Before</option>
            <option value="after">After</option>
          </select>
          <label className={`text-[11px] px-2 py-1 rounded bg-slate-800 text-white cursor-pointer ${uploading ? 'opacity-50' : 'hover:bg-slate-900'}`}>
            {uploading ? 'Uploading…' : '+ Add photos'}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
              onChange={(e) => onUpload(e.target.files)} />
          </label>
        </div>
      </div>

      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

      {photos.length === 0
        ? <p className="text-sm text-slate-400">No photos yet.</p>
        : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map(p => (
              <button key={p.id} onClick={() => setSelected(p)} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || 'Job photo'} className="w-full h-full object-cover group-hover:opacity-90" />
                <span className={`absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded font-medium ${PHOTO_TYPE_STYLE[p.photo_type]}`}>{PHOTO_TYPE_LABEL[p.photo_type]}</span>
                {p.source === 'client' && <span className="absolute top-1 right-1 text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Client</span>}
              </button>
            ))}
          </div>
        )}

      {selected && <PhotoLightbox photo={selected} jobId={jobId} onClose={() => setSelected(null)} />}
    </section>
  )
}

export default function JobDetailPage() {
  const id = useParams<{ id: string }>().id
  const [job, setJob] = useState<Job | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM)

  const load = useCallback(() => {
    fetch(`/api/jobs/${id}`).then(r => r.json()).then(d => {
      setJob(d.job || null); setPayments(d.payments || []); setSessions(d.sessions || []); setEvents(d.events || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/crews').then(r => r.json()).then(d => setCrews(d.crews || [])).catch(() => {})
    fetch('/api/team').then(r => r.json()).then(d => setTeam(d.team || [])).catch(() => {})
  }, [])

  async function act(label: string, fn: () => Promise<Response>) {
    setBusy(label); setErr('')
    try { const res = await fn(); const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed'); load(); return true }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); return false }
    finally { setBusy('') }
  }

  const setJobStatus = (status: string) => act(`job-${status}`, () =>
    fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }))

  const markPaid = (p: Payment) => act(`pay-${p.id}`, () =>
    fetch(`/api/jobs/${id}/payments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_id: p.id, status: 'paid' }) }))

  /** Assemble a session-write body from the shared form. */
  function formBody(f: SessionForm) {
    const base: Record<string, unknown> = {
      start_time: new Date(f.start).toISOString(),
      duration_hours: Number(f.duration) || null,
      service_type: f.service.trim() || null,
    }
    if (f.mode === 'crew') { base.crew_id = f.crewId || null; base.assignee_ids = [] }
    else { base.crew_id = null; base.assignee_ids = f.memberIds }
    return base
  }

  const saveNew = async () => {
    const ok = await act('add-session', () =>
      fetch(`/api/jobs/${id}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formBody(form)) }))
    if (ok) { setAdding(false); setForm(EMPTY_FORM) }
  }
  const saveEdit = async (sessionId: string) => {
    const ok = await act(`edit-${sessionId}`, () =>
      fetch(`/api/jobs/${id}/sessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formBody(form)) }))
    if (ok) setEditingId(null)
  }
  const completeSession = (sessionId: string) => act(`complete-${sessionId}`, () =>
    fetch(`/api/jobs/${id}/sessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) }))
  const deleteSession = (sessionId: string) => act(`delete-${sessionId}`, () =>
    fetch(`/api/jobs/${id}/sessions/${sessionId}`, { method: 'DELETE' }))

  const beginEdit = (s: Session) => { setAdding(false); setEditingId(s.id); setForm(formFromSession(s)) }
  const beginAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM, service: job?.title ?? '' }); setAdding(true) }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!job) return <div className="p-8 text-slate-500 text-sm">Job not found.</div>

  const paidCents = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const doneCount = sessions.filter(s => s.status === 'completed').length
  const pct = sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0

  // Sessions arrive sorted by start_time asc → group into months preserving order.
  const groups: { month: string; items: Session[] }[] = []
  for (const s of sessions) {
    const m = monthKey(s.start_time)
    const g = groups.at(-1)
    if (g && g.month === m) g.items.push(s)
    else groups.push({ month: m, items: [s] })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/bookings" className="text-xs text-slate-500 hover:underline">← Schedule</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{job.title || 'Job'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${JOB_STATUS_STYLE[job.status] || 'bg-slate-100'}`}>{job.status}</span>
          </div>
          {job.service_address && <p className="text-slate-500 text-sm mt-1">{job.service_address}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{money(job.total_cents)}</p>
          <p className="text-xs text-slate-400">{money(paidCents)} collected</p>
        </div>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        {job.status === 'scheduled' && <button onClick={() => setJobStatus('in_progress')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">Start job</button>}
        {job.status !== 'completed' && job.status !== 'cancelled' && <button onClick={() => setJobStatus('completed')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Mark complete</button>}
      </div>

      {/* Payment plan */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Payment plan</h2>
        <div className="space-y-1.5">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{p.kind}</span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-slate-700">{p.label}</span>
                {p.trigger && p.trigger !== 'manual' && <span className="ml-2 text-[10px] text-slate-400">{p.trigger.replace(/_/g, ' ')}</span>}
              </span>
              {p.status === 'invoiced' && <span className="text-[10px] text-amber-600 font-medium">due</span>}
              <span className="text-sm font-medium text-slate-900">{money(p.amount_cents)}</span>
              {p.status === 'paid'
                ? <span className="text-[11px] text-green-600 font-medium w-16 text-right">paid</span>
                : <button onClick={() => markPaid(p)} disabled={busy === `pay-${p.id}`} className="text-[11px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-16">Mark paid</button>}
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-slate-400">No payments.</p>}
        </div>
      </section>

      {/* Project timeline */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Project timeline</h2>
          {!adding && <button onClick={beginAdd} className="text-[11px] px-2 py-1 rounded bg-slate-800 text-white hover:bg-slate-900">+ Add visit</button>}
        </div>

        {sessions.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>{doneCount} of {sessions.length} visits complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {adding && (
          <div className="mb-3">
            <SessionEditor form={form} setForm={setForm} crews={crews} team={team}
              onSave={saveNew} onCancel={() => setAdding(false)} saving={busy === 'add-session'} saveLabel="Add visit" />
          </div>
        )}

        {groups.length === 0 && !adding && <p className="text-sm text-slate-400">No visits scheduled.</p>}

        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.month}>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-1.5 sticky top-0">{g.month}</div>
              <div className="relative pl-4 space-y-2 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
                {g.items.map((s) => {
                  const dur = durationHrs(s.start_time, s.end_time)
                  const isEditing = editingId === s.id
                  const done = s.status === 'completed'
                  return (
                    <div key={s.id} className="relative">
                      <span className={`absolute -left-4 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white ${done ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <div className="rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-start gap-3 p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800">{dayLabel(s.start_time)}</span>
                              <span className="text-xs text-slate-500">{timeLabel(s.start_time)}{dur ? ` · ${dur}h` : ''}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SESSION_STATUS_STYLE[s.status || ''] || 'bg-slate-100 text-slate-500'}`}>{s.status || '—'}</span>
                            </div>
                            {s.service_type && s.service_type !== job.title && <p className="text-xs text-slate-500 mt-0.5">{s.service_type}</p>}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {s.crew && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: s.crew.color || '#64748b' }}>{s.crew.name}</span>
                              )}
                              {s.assignees.map((a) => (
                                <span key={a.id} className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.name}</span>
                              ))}
                              {!s.crew && s.assignees.length === 0 && <span className="text-[11px] text-slate-400">Unassigned</span>}
                            </div>
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!done && <button onClick={() => completeSession(s.id)} disabled={busy === `complete-${s.id}`} title="Mark visit complete"
                                className="text-[11px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Done</button>}
                              <button onClick={() => beginEdit(s)} title="Move / reassign"
                                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">Edit</button>
                              <button onClick={() => deleteSession(s.id)} disabled={busy === `delete-${s.id}`} title="Remove visit"
                                className="text-[11px] px-1.5 py-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 disabled:opacity-50">✕</button>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="px-2.5 pb-2.5">
                            <SessionEditor form={form} setForm={setForm} crews={crews} team={team}
                              onSave={() => saveEdit(s.id)} onCancel={() => setEditingId(null)} saving={busy === `edit-${s.id}`} saveLabel="Save visit" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PhotoGallery jobId={id} />

      {/* Activity log */}
      <section>
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Activity</h2>
        <ul className="space-y-1">
          {events.map(e => (
            <li key={e.id} className="text-xs text-slate-500 flex gap-2">
              <span className="text-slate-400">{when(e.created_at)}</span>
              <span className="text-slate-700">{e.event_type.replace(/_/g, ' ')}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-sm text-slate-400">No activity yet.</li>}
        </ul>
      </section>
    </div>
  )
}
