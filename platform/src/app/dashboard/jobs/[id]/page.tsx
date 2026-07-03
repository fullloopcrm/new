'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Job = { id: string; title: string | null; status: string; total_cents: number; service_address: string | null; notes: string | null }
type Payment = { id: string; label: string; kind: string; amount_cents: number; status: string; trigger: string; paid_at: string | null }
type Session = { id: string; start_time: string | null; end_time: string | null; status: string }
type EventRow = { id: string; event_type: string; created_at: string }

function money(c: number) { return ((c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
function when(iso: string | null) { return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' }

const JOB_STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-600', cancelled: 'bg-slate-100 text-slate-500',
}

export default function JobDetailPage() {
  const id = useParams<{ id: string }>().id
  const [job, setJob] = useState<Job | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [newSession, setNewSession] = useState('')

  const load = useCallback(() => {
    fetch(`/api/jobs/${id}`).then(r => r.json()).then(d => {
      setJob(d.job || null); setPayments(d.payments || []); setSessions(d.sessions || []); setEvents(d.events || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])

  async function act(label: string, fn: () => Promise<Response>) {
    setBusy(label); setErr('')
    try { const res = await fn(); const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed'); load() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }

  const setJobStatus = (status: string) => act(`job-${status}`, () =>
    fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }))

  const markPaid = (p: Payment) => act(`pay-${p.id}`, () =>
    fetch(`/api/jobs/${id}/payments`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_id: p.id, status: 'paid' }) }))

  const addSession = () => act('add-session', () =>
    fetch(`/api/jobs/${id}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start_time: new Date(newSession).toISOString() }) }))
      .then(() => setNewSession(''))

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!job) return <div className="p-8 text-slate-500 text-sm">Job not found.</div>

  const paidCents = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)

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

      {/* Sessions */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Schedule</h2>
        <div className="space-y-1.5 mb-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
              <span className="flex-1 text-sm text-slate-700">{when(s.start_time)}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.status}</span>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-sm text-slate-400">No sessions scheduled.</p>}
        </div>
        <div className="flex gap-2">
          <input type="datetime-local" value={newSession} onChange={e => setNewSession(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-slate-300" />
          <button onClick={addSession} disabled={!newSession || busy === 'add-session'}
            className="px-3 py-1 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">Add session</button>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Timeline</h2>
        <ul className="space-y-1">
          {events.map(e => (
            <li key={e.id} className="text-xs text-slate-500 flex gap-2">
              <span className="text-slate-400">{when(e.created_at)}</span>
              <span className="text-slate-700">{e.event_type}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-sm text-slate-400">No activity yet.</li>}
        </ul>
      </section>
    </div>
  )
}
