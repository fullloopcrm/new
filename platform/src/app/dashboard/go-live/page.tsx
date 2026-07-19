'use client'

import { useEffect, useState, useCallback } from 'react'

type Task = {
  id: string
  task_type: string
  status: string
  notes: string | null
  completed_at: string | null
  blocked_reason: string | null
}

type Readiness = {
  ready: boolean
  tasksRemaining: number
  gatePassed: boolean
  gateBlockers: string[]
}

const STATUS_CYCLE: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
  blocked: 'in_progress',
  skipped: 'pending',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
  blocked: 'bg-red-50 text-red-600',
  skipped: 'bg-slate-100 text-slate-400 line-through',
}

export default function GoLivePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    fetch('/api/dashboard/onboarding')
      .then(r => r.json())
      .then(d => {
        setTasks(d.tasks || [])
        setReadiness(d.readiness || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(task: Task, status: string, blockedReason?: string) {
    setBusy(task.id); setErr('')
    try {
      const res = await fetch('/api/dashboard/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, status, blocked_reason: blockedReason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Update failed')
      setTasks(ts => ts.map(t => (t.id === task.id ? d.task : t)))
      setReadiness(d.readiness)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  async function blockTask(task: Task) {
    const reason = prompt('What\'s blocking this step?') || ''
    await setStatus(task, 'blocked', reason)
  }

  async function goLive() {
    setBusy('activate'); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/dashboard/onboarding/activate', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.blockers?.length ? d.blockers.join('; ') : (d.error || 'Not ready'))
      setMsg(`🎉 You're live — ${d.tenant?.name || 'your business'} is active.`)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>

  const done = tasks.filter(t => ['completed', 'skipped'].includes(t.status)).length

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Go Live</h1>
      <p className="text-slate-600 text-sm mt-1 mb-5">
        Finish setup, then flip your business live. Going live turns on client reminders and review follow-ups.
      </p>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <div className="mb-4 text-xs text-slate-500">{done} / {tasks.length} steps done</div>

      <div className="space-y-2 mb-6">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setStatus(t, STATUS_CYCLE[t.status] || 'completed')}
              disabled={busy === t.id}
              title={t.status === 'blocked' && t.blocked_reason ? t.blocked_reason : undefined}
              className={`shrink-0 text-[11px] px-2 py-1 rounded font-medium capitalize ${STATUS_STYLE[t.status] || 'bg-slate-100'}`}>
              {busy === t.id ? '…' : t.status.replace(/_/g, ' ')}
            </button>
            <span className="flex-1 text-sm text-slate-700">
              {t.notes || t.task_type}
              {t.status === 'blocked' && t.blocked_reason && (
                <span className="block text-xs text-red-500">{t.blocked_reason}</span>
              )}
            </span>
            {t.status !== 'skipped' && t.status !== 'completed' && t.status !== 'blocked' && (
              <button onClick={() => blockTask(t)} disabled={busy === t.id}
                className="text-[11px] text-slate-400 hover:text-slate-600">block</button>
            )}
            {t.status !== 'skipped' && t.status !== 'completed' && (
              <button onClick={() => setStatus(t, 'skipped')} disabled={busy === t.id}
                className="text-[11px] text-slate-400 hover:text-slate-600">skip</button>
            )}
          </div>
        ))}
        {tasks.length === 0 && <p className="text-sm text-slate-400">No setup tasks — you&apos;re all set.</p>}
      </div>

      {readiness && !readiness.gatePassed && readiness.gateBlockers.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
          <p className="font-medium mb-1">Before you can go live, fix:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {readiness.gateBlockers.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      <button
        onClick={goLive}
        disabled={!readiness?.ready || busy === 'activate'}
        className="w-full py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
        {busy === 'activate' ? 'Going live…' : readiness?.ready ? 'Go Live 🚀' : `Go Live (${readiness?.tasksRemaining ?? '…'} steps left)`}
      </button>
    </div>
  )
}
