'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { stageMeta } from '@/lib/pipeline'
import { CloseoutDetail } from '@/components/closeout-detail'

type Assignee = { id: string; name: string }
type Job = {
  id: string
  title: string | null
  status: string
  total_cents: number
  service_address: string | null
  notes: string | null
  starts_on: string | null
  ends_on: string | null
}
type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; unit: string | null; notes: string | null }
type Quote = { id: string; quote_number: string | null; deal_id: string | null }
type Deal = { id: string; title: string; stage: string; value_cents: number }
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
type JobExpense = { id: string; category: string; amount: number; vendor_name: string | null; description: string | null; receipt_url: string | null; date: string }
/** From GET /api/jobs/[id]/budget-variance -- variance is null when the job's quote has no saved Master Budget yet. */
type BudgetVariance = {
  variance: { budgeted_total_cents: number; actual_total_cents: number; variance_cents: number; projected_margin_bps: number | null } | null
}
type Crew = { id: string; name: string; color: string | null; members: Assignee[] }
type TeamMember = { id: string; name: string | null }
type Annotation =
  | { type: 'arrow'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'text'; x: number; y: number; text: string }
  | { type: 'circle'; x: number; y: number; r: number }
type JobPhoto = {
  id: string; url: string; photo_type: 'before' | 'after' | 'progress'
  source: 'crew' | 'client'; caption: string | null; uploaded_by: string | null; taken_at: string
  tags: string[]; pair_id: string | null; annotations: Annotation[]
}
type PhotoComment = { id: string; body: string | null; author: string; created_at: string }

/** Renders stored shapes over an image. viewBox is 0-100 on both axes — the
 * image must fill its container edge-to-edge (no letterboxing) for
 * percentage coords to align, so callers use w-full h-auto, not object-contain. */
function AnnotationOverlay({ annotations }: { annotations: Annotation[] }) {
  if (annotations.length === 0) return null
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#ef4444" />
        </marker>
      </defs>
      {annotations.map((a, i) => {
        if (a.type === 'arrow') return <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#ef4444" strokeWidth="0.6" markerEnd="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
        if (a.type === 'circle') return <circle key={i} cx={a.x} cy={a.y} r={a.r} fill="none" stroke="#ef4444" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        return <text key={i} x={a.x} y={a.y} fontSize="4" fill="#ef4444" fontWeight="bold" style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 0.8 }}>{a.text}</text>
      })}
    </svg>
  )
}
type ChecklistItem = { id: string; label: string; done: boolean; done_at: string | null }

const EXPENSE_CATEGORIES = ['Materials', 'Supplies', 'Equipment rental', 'Fuel', 'Permits', 'Subcontractor', 'Other']

function money(c: number) { return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
function when(iso: string | null) { return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' }
function dayLabel(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—' }
function timeLabel(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '' }
function monthKey(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unscheduled' }
/** DATE-only column (no time component) — parse as local, not UTC, to avoid an off-by-one day. */
function dateOnlyLabel(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
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
  unscheduled: 'bg-slate-100 text-slate-500', scheduled: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700',
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
  photo, jobId, allPhotos, onClose, onChanged,
}: { photo: JobPhoto; jobId: string; allPhotos: JobPhoto[]; onClose: () => void; onChanged: () => void }) {
  const [comments, setComments] = useState<PhotoComment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [pairing, setPairing] = useState(false)
  const [tool, setTool] = useState<'none' | 'arrow' | 'text' | 'circle'>('none')
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null)

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

  const patchPhoto = async (patch: Record<string, unknown>) => {
    await fetch(`/api/jobs/${jobId}/photos/${photo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    onChanged()
  }

  const addTag = async () => {
    const t = tagInput.trim()
    if (!t || photo.tags.includes(t.toLowerCase())) { setTagInput(''); return }
    await patchPhoto({ tags: [...photo.tags, t] })
    setTagInput('')
  }
  const removeTag = (t: string) => patchPhoto({ tags: photo.tags.filter((x) => x !== t) })

  const addAnnotation = (a: Annotation) => patchPhoto({ annotations: [...photo.annotations, a] })
  const clearAnnotations = () => patchPhoto({ annotations: [] })

  const onImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'none') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (tool === 'text') {
      const t = window.prompt('Label text:')
      if (t?.trim()) addAnnotation({ type: 'text', x, y, text: t.trim() })
      return
    }
    if (tool === 'circle') {
      addAnnotation({ type: 'circle', x, y, r: 5 })
      return
    }
    // arrow: first click sets the start point, second click completes it
    if (!arrowStart) { setArrowStart({ x, y }); return }
    addAnnotation({ type: 'arrow', x1: arrowStart.x, y1: arrowStart.y, x2: x, y2: y })
    setArrowStart(null)
  }

  const pair = photo.pair_id ? allPhotos.find((p) => p.id === photo.pair_id) : null
  const pairCandidates = allPhotos.filter((p) =>
    p.id !== photo.id && !p.pair_id &&
    ((photo.photo_type === 'before' && p.photo_type === 'after') || (photo.photo_type === 'after' && p.photo_type === 'before')))

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {pair ? (
          <div className="grid grid-cols-2 gap-px bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(photo.photo_type === 'before' ? photo : pair).url} alt="Before" className="w-full max-h-[50vh] object-contain bg-slate-900" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(photo.photo_type === 'before' ? pair : photo).url} alt="After" className="w-full max-h-[50vh] object-contain bg-slate-900" />
          </div>
        ) : (
          <div className="relative bg-slate-900 cursor-crosshair" onClick={onImageClick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.caption || 'Job photo'} className="w-full h-auto block" />
            <AnnotationOverlay annotations={photo.annotations} />
            {arrowStart && (
              <span className="absolute w-2 h-2 rounded-full bg-red-500 -translate-x-1/2 -translate-y-1/2" style={{ left: `${arrowStart.x}%`, top: `${arrowStart.y}%` }} />
            )}
          </div>
        )}
        {!pair && (
          <div className="flex items-center gap-1.5 px-3 pt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {(['arrow', 'text', 'circle'] as const).map((tl) => (
              <button key={tl} onClick={() => { setTool(tool === tl ? 'none' : tl); setArrowStart(null) }}
                className={`text-[10px] px-2 py-0.5 rounded capitalize ${tool === tl ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {tl}
              </button>
            ))}
            {photo.annotations.length > 0 && <button onClick={clearAnnotations} className="text-[10px] text-slate-400 hover:underline">clear annotations</button>}
            {tool === 'arrow' && <span className="text-[10px] text-slate-400">{arrowStart ? 'click end point' : 'click start point'}</span>}
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PHOTO_TYPE_STYLE[photo.photo_type]}`}>{PHOTO_TYPE_LABEL[photo.photo_type]}</span>
            <span className="text-[10px] text-slate-400">{photo.source === 'client' ? 'From client' : (photo.uploaded_by || 'Crew')}</span>
            <span className="text-[10px] text-slate-400">{when(photo.taken_at)}</span>
          </div>
          {photo.caption && <p className="text-sm text-slate-700 mb-2">{photo.caption}</p>}

          <div className="flex flex-wrap items-center gap-1 mb-2">
            {photo.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                {t}
                <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-red-600">✕</button>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTag() }}
              placeholder="+ tag" className="text-[10px] w-16 px-1 py-0.5 rounded border border-slate-200" />
          </div>

          {(photo.photo_type === 'before' || photo.photo_type === 'after') && (
            <div className="mb-2">
              {pair
                ? <button onClick={() => patchPhoto({ pair_id: null })} className="text-[11px] text-slate-400 hover:underline">Unpair from {PHOTO_TYPE_LABEL[pair.photo_type]}</button>
                : pairing
                  ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pairCandidates.length === 0 && <span className="text-[11px] text-slate-400">No unpaired {photo.photo_type === 'before' ? 'after' : 'before'} photos.</span>}
                      {pairCandidates.map((c) => (
                        <button key={c.id} onClick={() => { patchPhoto({ pair_id: c.id }); setPairing(false) }}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 hover:bg-slate-50">{when(c.taken_at)}</button>
                      ))}
                      <button onClick={() => setPairing(false)} className="text-[10px] text-slate-400">cancel</button>
                    </div>
                  )
                  : <button onClick={() => setPairing(true)} className="text-[11px] text-slate-500 hover:underline">Pair with {photo.photo_type === 'before' ? 'an after' : 'a before'} photo</button>}
            </div>
          )}

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [sharing, setSharing] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/jobs/${jobId}/photos`).then(r => r.json()).then(d => setPhotos(d.photos || [])).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  const allTags = Array.from(new Set(photos.flatMap((p) => p.tags))).sort()
  const visible = activeTag ? photos.filter((p) => p.tags.includes(activeTag)) : photos
  const selected = selectedId ? photos.find((p) => p.id === selectedId) || null : null

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

  const share = async () => {
    setSharing(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/share`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        const url = `${window.location.origin}${d.path}`
        setShareLink(url)
        navigator.clipboard?.writeText(url).catch(() => {})
      }
    } finally { setSharing(false) }
  }

  const togglePick = (id: string) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id); else next.add(id)
    setPicked(next)
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: picked.size > 0 ? Array.from(picked) : undefined }),
      })
      if (!res.ok) throw new Error('Report generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'job-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setSelecting(false); setPicked(new Set())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Report generation failed')
    } finally { setGenerating(false) }
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Job photos</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={share} disabled={sharing} className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {sharing ? 'Creating link…' : 'Share with client'}
          </button>
          <button onClick={() => { setSelecting(!selecting); setPicked(new Set()) }}
            className={`text-[11px] px-2 py-1 rounded border ${selecting ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {selecting ? 'Cancel' : 'Report'}
          </button>
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

      {shareLink && (
        <p className="text-[11px] text-green-600 mb-2">Link copied: <span className="text-slate-500">{shareLink}</span></p>
      )}
      {selecting && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
          <span>{picked.size > 0 ? `${picked.size} selected` : 'None selected — report will include all photos'}</span>
          <button onClick={generateReport} disabled={generating} className="px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-50">
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {allTags.map((t) => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTag === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0
        ? <p className="text-sm text-slate-400">{photos.length === 0 ? 'No photos yet.' : 'No photos with this tag.'}</p>
        : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {visible.map(p => (
              <button key={p.id} onClick={() => selecting ? togglePick(p.id) : setSelectedId(p.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border group ${selecting && picked.has(p.id) ? 'border-slate-800 ring-2 ring-slate-800' : 'border-slate-200'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || 'Job photo'} className="w-full h-full object-cover group-hover:opacity-90" />
                <span className={`absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded font-medium ${PHOTO_TYPE_STYLE[p.photo_type]}`}>{PHOTO_TYPE_LABEL[p.photo_type]}</span>
                {p.source === 'client' && <span className="absolute top-1 right-1 text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Client</span>}
                {p.pair_id && <span className="absolute bottom-1 right-1 text-[9px] px-1 py-0.5 rounded bg-white/90 text-slate-600 font-medium">Paired</span>}
                {selecting && (
                  <span className={`absolute bottom-1 left-1 w-4 h-4 rounded-full border-2 ${picked.has(p.id) ? 'bg-slate-800 border-slate-800' : 'bg-white/80 border-slate-400'}`} />
                )}
              </button>
            ))}
          </div>
        )}

      {selected && (
        <PhotoLightbox photo={selected} jobId={jobId} allPhotos={photos} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </section>
  )
}

function Checklist({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/jobs/${jobId}/checklist`).then(r => r.json()).then(d => setItems(d.items || [])).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  const toggle = async (item: ChecklistItem) => {
    setItems(items.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
    await fetch(`/api/jobs/${jobId}/checklist/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !item.done }),
    })
  }

  const remove = async (id: string) => {
    setItems(items.filter(i => i.id !== id))
    await fetch(`/api/jobs/${jobId}/checklist/${id}`, { method: 'DELETE' })
  }

  const add = async () => {
    if (!newLabel.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: newLabel }),
      })
      if (res.ok) { setNewLabel(''); load() }
    } finally { setAdding(false) }
  }

  const doneCount = items.filter(i => i.done).length

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-800">Checklist</h2>
        {items.length > 0 && <span className="text-[11px] text-slate-400">{doneCount} of {items.length} done</span>}
      </div>

      <div className="space-y-1 mb-2">
        {items.map(i => (
          <div key={i.id} className="flex items-center gap-2 p-1.5 rounded border border-slate-200 bg-white group">
            <input type="checkbox" checked={i.done} onChange={() => toggle(i)} className="shrink-0" />
            <span className={`flex-1 text-sm ${i.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{i.label}</span>
            <button onClick={() => remove(i.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs">✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No checklist items yet.</p>}
      </div>

      <div className="flex gap-1.5">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Add a checklist item…"
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300" />
        <button onClick={add} disabled={adding || !newLabel.trim()} className="text-xs px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-50">Add</button>
      </div>
    </section>
  )
}

export default function JobDetailPage() {
  const id = useParams<{ id: string }>().id
  const [job, setJob] = useState<Job | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [expenses, setExpenses] = useState<JobExpense[]>([])
  const [expenseForm, setExpenseForm] = useState({ vendor: '', amount: '', category: EXPENSE_CATEGORIES[0], note: '' })
  const [expenseFile, setExpenseFile] = useState<File | null>(null)
  const [uploadingExpense, setUploadingExpense] = useState(false)
  const [budgetVariance, setBudgetVariance] = useState<BudgetVariance['variance']>(null)
  const [details, setDetails] = useState({ notes: '', ends_on: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    fetch(`/api/jobs/${id}`).then(r => r.json()).then(d => {
      setJob(d.job || null); setClient(d.client || null); setQuote(d.quote || null); setDeal(d.deal || null)
      setPayments(d.payments || []); setSessions(d.sessions || []); setEvents(d.events || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])
  const loadExpenses = useCallback(() => {
    fetch(`/api/jobs/${id}/expenses`).then(r => r.json()).then(d => setExpenses(d.expenses || [])).catch(() => {})
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => {
    fetch('/api/crews').then(r => r.json()).then(d => setCrews(d.crews || [])).catch(() => {})
    fetch('/api/team').then(r => r.json()).then(d => setTeam(d.team || [])).catch(() => {})
  }, [])
  useEffect(() => {
    if (job) setDetails({ notes: job.notes ?? '', ends_on: job.ends_on ?? '' })
  }, [job])
  useEffect(() => {
    // sales.view-gated, and null (not an error) until the job's quote has a
    // saved Master Budget -- section below hides itself in either case.
    fetch(`/api/jobs/${id}/budget-variance`).then(r => r.json()).then((d: BudgetVariance) => setBudgetVariance(d.variance || null)).catch(() => {})
  }, [id])

  async function act(label: string, fn: () => Promise<Response>) {
    setBusy(label); setErr('')
    try { const res = await fn(); const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed'); load(); return true }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); return false }
    finally { setBusy('') }
  }

  const setJobStatus = (status: string) => act(`job-${status}`, () =>
    fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }))

  const detailsDirty = !!job && (details.notes !== (job.notes ?? '') || details.ends_on !== (job.ends_on ?? ''))
  const saveDetails = () => act('save-details', () =>
    fetch(`/api/jobs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: details.notes.trim() || null, ends_on: details.ends_on || null }),
    }))

  const markPaid = (p: Payment) => act(`pay-${p.id}`, () =>
    fetch(`/api/jobs/${id}/payments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_id: p.id, status: 'paid' }) }))

  async function addExpense() {
    const amount = Number(expenseForm.amount)
    if (!amount || amount <= 0) { setErr('Enter a valid amount'); return }
    setUploadingExpense(true); setErr('')
    try {
      let receiptUrl: string | null = null
      if (expenseFile) {
        const fd = new FormData()
        fd.set('file', expenseFile)
        fd.set('folder', 'job-receipts')
        const upRes = await fetch('/api/uploads', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Receipt upload failed')
        receiptUrl = upData.url
      }
      const res = await fetch(`/api/jobs/${id}/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseForm.category,
          amount,
          vendor_name: expenseForm.vendor.trim() || null,
          description: expenseForm.note.trim() || null,
          receipt_url: receiptUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add receipt')
      setExpenseForm({ vendor: '', amount: '', category: EXPENSE_CATEGORIES[0], note: '' })
      setExpenseFile(null)
      loadExpenses()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add receipt')
    } finally {
      setUploadingExpense(false)
    }
  }

  const deleteExpense = (expenseId: string) => act(`del-expense-${expenseId}`, () =>
    fetch(`/api/jobs/${id}/expenses/${expenseId}`, { method: 'DELETE' })).then((ok) => { if (ok) loadExpenses() })

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
  const toggleDetail = (sessionId: string) => setExpandedSessions((prev) => {
    const next = new Set(prev)
    if (next.has(sessionId)) next.delete(sessionId); else next.add(sessionId)
    return next
  })

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!job) return <div className="p-8 text-slate-500 text-sm">Job not found.</div>

  const paidCents = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const owedCents = Math.max(0, job.total_cents - paidCents)
  const costCents = expenses.reduce((s, e) => s + e.amount, 0)
  const marginCents = paidCents - costCents
  const doneCount = sessions.filter(s => s.status === 'completed').length
  const pct = sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0

  // Everyone who has touched this job: direct session assignees + members of any
  // crew ever scheduled on it. Derived from sessions/crews already loaded — the
  // data model has no separate "who worked on this job" table.
  const crewById = new Map(crews.map(c => [c.id, c]))
  const workedOn = new Map<string, string>()
  for (const s of sessions) {
    for (const a of s.assignees) workedOn.set(a.id, a.name)
    if (s.crew_id) crewById.get(s.crew_id)?.members.forEach(m => workedOn.set(m.id, m.name))
  }

  // Sessions arrive sorted by start_time asc → group into months preserving order.
  const groups: { month: string; items: Session[] }[] = []
  for (const s of sessions) {
    const m = monthKey(s.start_time)
    const g = groups.at(-1)
    if (g && g.month === m) g.items.push(s)
    else groups.push({ month: m, items: [s] })
  }

  return (
    <div>
      <Link href="/dashboard/bookings" className="text-xs text-slate-500 hover:underline">← Schedule</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{job.title || 'Job'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${JOB_STATUS_STYLE[job.status] || 'bg-slate-100'}`}>{job.status}</span>
            {sessions.length > 0 && <span className="text-xs text-slate-400">{pct}% complete</span>}
          </div>
          {job.service_address && <p className="text-slate-500 text-sm mt-1">{job.service_address}</p>}
          {(job.starts_on || job.ends_on) && (
            <p className="text-xs text-slate-400 mt-1">
              {job.starts_on ? dateOnlyLabel(job.starts_on) : 'Unscheduled'}
              {job.ends_on ? ` → est. completion ${dateOnlyLabel(job.ends_on)}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{money(job.total_cents)}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Collected</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{money(paidCents)}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Owed</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{money(owedCents)}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">% Complete</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{sessions.length > 0 ? `${pct}%` : '—'}</p>
        </div>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        {job.status === 'scheduled' && <button onClick={() => setJobStatus('in_progress')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">Start job</button>}
        {job.status !== 'completed' && job.status !== 'cancelled' && <button onClick={() => setJobStatus('completed')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Mark complete</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-w-0">

      {/* Details */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Details</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <label className="flex flex-col gap-1 max-w-[220px]">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Estimated completion date</span>
            <input type="date" value={details.ends_on} onChange={(e) => setDetails({ ...details, ends_on: e.target.value })}
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Job notes</span>
            <textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} rows={4}
              placeholder="Add job notes…" className="px-2 py-1.5 text-xs rounded border border-slate-300 bg-white resize-y w-full" />
          </label>
          {detailsDirty && (
            <button onClick={saveDetails} disabled={busy === 'save-details'}
              className="px-3 py-1 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
              {busy === 'save-details' ? 'Saving…' : 'Save details'}
            </button>
          )}
        </div>
      </section>

      {/* Payment plan */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Payments</h2>
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

      {/* Costs & receipts */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Costs & receipts</h2>
          <span className="text-sm font-medium text-slate-900">{money(costCents)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-white">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Collected</p>
            <p className="text-sm font-semibold text-green-600">{money(paidCents)}</p>
          </div>
          <div className="p-2 rounded-lg border border-slate-200 bg-white">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Actual cost</p>
            <p className="text-sm font-semibold text-red-600">{money(costCents)}</p>
          </div>
          <div className="p-2 rounded-lg border border-slate-200 bg-white">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Margin</p>
            <p className={`text-sm font-semibold ${marginCents >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{money(marginCents)}</p>
          </div>
          {budgetVariance && (
            <div className="p-2 rounded-lg border border-slate-200 bg-white">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{budgetVariance.budgeted_total_cents - costCents < 0 ? 'Over budget' : 'Remaining'}</p>
              <p className={`text-sm font-semibold ${budgetVariance.budgeted_total_cents - costCents < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {money(Math.abs(budgetVariance.budgeted_total_cents - costCents))}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 mb-3">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Vendor</span>
              <input type="text" value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                placeholder="e.g. Home Depot" className="px-2 py-1 text-xs rounded border border-slate-300 bg-white w-36" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Amount</span>
              <input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00" className="px-2 py-1 text-xs rounded border border-slate-300 bg-white w-24" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Category</span>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="px-2 py-1 text-xs rounded border border-slate-300 bg-white">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Receipt photo</span>
              <label className="inline-flex items-center px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-600 cursor-pointer hover:bg-slate-50 w-fit">
                {expenseFile ? expenseFile.name.slice(0, 18) : 'Choose photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setExpenseFile(e.target.files?.[0] ?? null)}
                  className="hidden" />
              </label>
            </label>
            <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Note (optional)</span>
              <input type="text" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                className="px-2 py-1 text-xs rounded border border-slate-300 bg-white" />
            </label>
          </div>
          <button onClick={addExpense} disabled={uploadingExpense}
            className="px-3 py-1 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
            {uploadingExpense ? 'Adding…' : '+ Add receipt'}
          </button>
        </div>

        <div className="space-y-1.5">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{e.category}</span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-slate-700">{e.vendor_name || 'Receipt'}</span>
                {e.description && <span className="ml-2 text-[11px] text-slate-400">{e.description}</span>}
                {e.receipt_url && <a href={e.receipt_url} target="_blank" rel="noreferrer" className="ml-2 text-[11px] text-blue-600 hover:underline">view</a>}
              </span>
              <span className="text-[11px] text-slate-400">{dayLabel(e.date)}</span>
              <span className="text-sm font-medium text-slate-900 w-20 text-right">{money(e.amount)}</span>
              <button onClick={() => deleteExpense(e.id)} disabled={busy === `del-expense-${e.id}`} title="Remove"
                className="text-[11px] px-1.5 py-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 disabled:opacity-50">✕</button>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-sm text-slate-400">No receipts logged.</p>}
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
                  const isDetailOpen = expandedSessions.has(s.id)
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
                              <button onClick={() => toggleDetail(s.id)} title="Time, bill, payments & payouts for this visit"
                                className={`text-[11px] px-2 py-1 rounded border ${isDetailOpen ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                {isDetailOpen ? 'Hide' : 'Details'}
                              </button>
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
                        {isDetailOpen && (
                          <div className="px-2.5 pb-2.5">
                            <CloseoutDetail bookingId={s.id} onAnyChange={load} />
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

      <Checklist jobId={id} />
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

      {/* Sidebar */}
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Client</h2>
          {client ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">{client.name}</p>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{client.phone}</span>
                  <a href={`tel:${client.phone}`} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Call</a>
                  <a href={`sms:${client.phone}`} className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Text</a>
                </div>
              )}
              {client.email && <p className="text-sm text-slate-500 break-all">{client.email}</p>}
              {(client.address || client.unit) && (
                <p className="text-sm text-slate-500">{[client.address, client.unit].filter(Boolean).join(', ')}</p>
              )}
              {client.notes && <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 mt-2">{client.notes}</p>}
              <Link href={`/dashboard/clients/${client.id}`} className="text-xs text-blue-600 hover:underline inline-block pt-1">View client →</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No client on this job.</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Source lead</h2>
          {deal ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-800">{deal.title}</p>
              <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded font-medium ${stageMeta(deal.stage).color}`}>{stageMeta(deal.stage).label}</span>
              {quote?.quote_number && <p className="text-xs text-slate-400">Quote {quote.quote_number}</p>}
              <Link href={`/dashboard/sales/pipeline/${deal.id}`} className="text-xs text-blue-600 hover:underline inline-block pt-1">View deal →</Link>
            </div>
          ) : quote ? (
            <div className="space-y-1.5">
              <p className="text-sm text-slate-500">Converted from quote{quote.quote_number ? ` ${quote.quote_number}` : ''}, not linked to a pipeline deal.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not created from a lead or quote.</p>
          )}
        </section>

        {budgetVariance && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Budget vs. actual</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Budgeted</span><span className="text-slate-800">{money(budgetVariance.budgeted_total_cents)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Actual (Master Budget)</span><span className="text-slate-800">{money(budgetVariance.actual_total_cents)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Receipts logged</span><span className="text-slate-800">{money(costCents)}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-slate-100">
                <span className="text-slate-500">Variance</span>
                <span className={`font-medium ${budgetVariance.variance_cents < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {budgetVariance.variance_cents < 0 ? 'Over by ' : 'Under by '}{money(Math.abs(budgetVariance.variance_cents))}
                </span>
              </div>
              {budgetVariance.projected_margin_bps !== null && (
                <div className="flex justify-between"><span className="text-slate-500">Projected margin</span><span className="text-slate-800">{(budgetVariance.projected_margin_bps / 100).toFixed(1)}%</span></div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Team on this job</h2>
          {workedOn.size > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...workedOn.entries()].map(([wid, name]) => (
                <span key={wid} className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{name}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No one assigned yet.</p>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
