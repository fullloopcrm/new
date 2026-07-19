'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { stageMeta } from '@/lib/pipeline'
import { CloseoutDetail } from '@/components/closeout-detail'
import { SmsComposeBox, EmailComposeBox } from '@/components/client-message-compose'

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
type Expense = { id: string; category: string; subcategory: string | null; description: string | null; vendor_name: string | null; amount: number; date: string; receipt_url: string | null }
/** From GET /api/jobs/[id]/budget-variance (W4's lane) -- variance is null when the job's quote has no saved Master Budget yet. */
type BudgetVariance = {
  variance: { budgeted_total_cents: number; actual_total_cents: number; variance_cents: number; projected_margin_bps: number | null } | null
}
type Crew = { id: string; name: string; color: string | null; members: Assignee[] }
type TeamMember = { id: string; name: string | null }

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

export default function JobDetailPage() {
  const id = useParams<{ id: string }>().id
  const [job, setJob] = useState<Job | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [messagePanel, setMessagePanel] = useState<'sms' | 'email' | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgetVariance, setBudgetVariance] = useState<BudgetVariance['variance']>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [notesDraft, setNotesDraft] = useState('')

  const load = useCallback(() => {
    fetch(`/api/jobs/${id}`).then(r => r.json()).then(d => {
      setJob(d.job || null); setClient(d.client || null); setQuote(d.quote || null); setDeal(d.deal || null)
      setPayments(d.payments || []); setSessions(d.sessions || []); setEvents(d.events || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (job) setNotesDraft(job.notes ?? '') }, [job])
  useEffect(() => {
    fetch('/api/crews').then(r => r.json()).then(d => setCrews(d.crews || [])).catch(() => {})
    fetch('/api/team').then(r => r.json()).then(d => setTeam(d.team || [])).catch(() => {})
  }, [])
  useEffect(() => {
    // finance.view-gated on the backend — a viewer without finance access just
    // gets an empty list here rather than a broken page.
    fetch(`/api/finance/expenses?job_id=${id}`).then(r => r.json()).then(d => setExpenses(d.expenses || [])).catch(() => {})
  }, [id])
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

  const notesDirty = !!job && notesDraft !== (job.notes ?? '')
  const saveNotes = () => act('save-notes', () =>
    fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notesDraft.trim() || null }) }))

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
  const toggleDetail = (sessionId: string) => setExpandedSessions((prev) => {
    const next = new Set(prev)
    if (next.has(sessionId)) next.delete(sessionId); else next.add(sessionId)
    return next
  })

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!job) return <div className="p-8 text-slate-500 text-sm">Job not found.</div>

  const paidCents = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const owedCents = Math.max(0, job.total_cents - paidCents)
  const expensesTotalCents = expenses.reduce((s, e) => s + (e.amount || 0), 0)
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
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{money(job.total_cents)}</p>
          <p className="text-xs text-slate-400">{money(paidCents)} collected{owedCents > 0 ? ` · ${money(owedCents)} owed` : ''}</p>
        </div>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        {job.status === 'scheduled' && <button onClick={() => setJobStatus('in_progress')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">Start job</button>}
        {job.status !== 'completed' && job.status !== 'cancelled' && <button onClick={() => setJobStatus('completed')} disabled={!!busy} className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Mark complete</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-w-0">

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Job notes</h2>
        <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={4} placeholder="Add job notes…"
          className="w-full text-sm text-slate-600 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 resize-y" />
        {notesDirty && (
          <button onClick={saveNotes} disabled={busy === 'save-notes'}
            className="mt-2 px-3 py-1 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
            {busy === 'save-notes' ? 'Saving…' : 'Save notes'}
          </button>
        )}
      </section>

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

      {/* Supplies & expenses */}
      {expenses.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Supplies & expenses</h2>
            <span className="text-sm font-medium text-slate-900">{money(expensesTotalCents)}</span>
          </div>
          <div className="space-y-1.5">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{e.category}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm text-slate-700">{e.vendor_name || e.description || 'Expense'}</span>
                  {e.vendor_name && e.description && <span className="ml-2 text-xs text-slate-400">{e.description}</span>}
                  <span className="ml-2 text-[10px] text-slate-400">{dateOnlyLabel(e.date)}</span>
                </span>
                {e.receipt_url && <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline shrink-0">Receipt</a>}
                <span className="text-sm font-medium text-slate-900 shrink-0">{money(e.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
                  <button
                    onClick={() => setMessagePanel(messagePanel === 'sms' ? null : 'sms')}
                    className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100"
                  >
                    Text
                  </button>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 break-all">{client.email}</span>
                  <button
                    onClick={() => setMessagePanel(messagePanel === 'email' ? null : 'email')}
                    className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 shrink-0"
                  >
                    Email
                  </button>
                </div>
              )}
              {(client.address || client.unit) && (
                <p className="text-sm text-slate-500">{[client.address, client.unit].filter(Boolean).join(', ')}</p>
              )}
              {client.notes && <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 mt-2">{client.notes}</p>}
              <Link href={`/dashboard/clients/${client.id}`} className="text-xs text-blue-600 hover:underline inline-block pt-1">View client →</Link>
              {messagePanel === 'sms' && <SmsComposeBox clientId={client.id} onSent={() => setMessagePanel(null)} />}
              {messagePanel === 'email' && <EmailComposeBox clientId={client.id} onSent={() => setMessagePanel(null)} />}
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
              <div className="flex justify-between"><span className="text-slate-500">Actual</span><span className="text-slate-800">{money(budgetVariance.actual_total_cents)}</span></div>
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
