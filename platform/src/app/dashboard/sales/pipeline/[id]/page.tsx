'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PIPELINE_STAGES, stageMeta } from '@/lib/pipeline'

type Deal = {
  id: string
  title: string | null
  stage: string
  value_cents: number | null
  probability: number | null
  expected_close_date: string | null
  source: string | null
  notes: string | null
  follow_up_at: string | null
  follow_up_note: string | null
  stage_changed_at: string | null
  created_at: string
  closed_at: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null
}

type Activity = {
  id: string
  type: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function formatCents(cents: number | null): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [deal, setDeal] = useState<Deal | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const [noteText, setNoteText] = useState('')

  const [form, setForm] = useState({
    title: '', value_dollars: '', probability: '', expected_close_date: '',
    source: '', notes: '', follow_up_at: '', follow_up_note: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/deals/${id}`)
      .then(r => r.json())
      .then(data => {
        setDeal(data.deal)
        setActivities(data.activities || [])
        if (data.deal) {
          setForm({
            title: data.deal.title || '',
            value_dollars: data.deal.value_cents ? (data.deal.value_cents / 100).toString() : '',
            probability: data.deal.probability != null ? String(data.deal.probability) : '',
            expected_close_date: data.deal.expected_close_date || '',
            source: data.deal.source || '',
            notes: data.deal.notes || '',
            follow_up_at: data.deal.follow_up_at ? data.deal.follow_up_at.slice(0, 16) : '',
            follow_up_note: data.deal.follow_up_note || '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function moveToStage(stage: string) {
    setErr(''); setMsg('')
    const res = await fetch(`/api/deals/${id}/stage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }),
    })
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || 'Failed')
    load()
  }

  async function saveForm() {
    setErr(''); setMsg('')
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title || null,
        value_cents: form.value_dollars ? Math.round(parseFloat(form.value_dollars) * 100) : 0,
        probability: form.probability ? parseInt(form.probability) : null,
        expected_close_date: form.expected_close_date || null,
        source: form.source || null,
        notes: form.notes || null,
        follow_up_at: form.follow_up_at || null,
        follow_up_note: form.follow_up_note || null,
      }),
    })
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error || 'Failed')
      return
    }
    setEditing(false); setMsg('Saved'); load()
  }

  async function addNote() {
    if (!noteText.trim()) return
    setErr('')
    const res = await fetch(`/api/deals/${id}/activities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'note', description: noteText }),
    })
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'Failed'); return }
    setNoteText(''); load()
  }

  async function delDeal() {
    if (!confirm('Delete this deal permanently?')) return
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'Failed'); return }
    router.push('/dashboard/sales/pipeline')
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!deal) return <div className="p-8 text-slate-500 text-sm">Not found.</div>

  const meta = stageMeta(deal.stage)

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/dashboard/sales/pipeline" className="text-xs text-slate-500 hover:underline">← Pipeline</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{deal.title || deal.clients?.name || 'Untitled Deal'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${meta.color}`}>{meta.label}</span>
          </div>
          {deal.clients && (
            <Link href={`/dashboard/clients/${deal.clients.id}`} className="text-sm text-teal-600 hover:underline">
              {deal.clients.name}
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">{formatCents(deal.value_cents)}</p>
          {deal.probability != null && (
            <p className="text-xs text-slate-500">{deal.probability}% probability · weighted {formatCents(Math.round(((deal.value_cents || 0) * deal.probability) / 100))}</p>
          )}
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* Stage stepper */}
      <div className="mb-5 bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-1">
        {PIPELINE_STAGES.map(s => (
          <button
            key={s.value}
            onClick={() => moveToStage(s.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              deal.stage === s.value
                ? `${s.color} ring-2 ring-teal-400`
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button onClick={delDeal} className="ml-auto px-3 py-1.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Details / editor */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm">Details</h3>
              <button onClick={() => setEditing(v => !v)} className="text-xs text-teal-600 hover:underline">
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Title" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.value_dollars} onChange={e => setForm({ ...form, value_dollars: e.target.value })}
                    placeholder="Value ($)" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" min="0" max="100" value={form.probability}
                    onChange={e => setForm({ ...form, probability: e.target.value })}
                    placeholder="Probability %" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={form.expected_close_date}
                    onChange={e => setForm({ ...form, expected_close_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="text" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                    placeholder="Source" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input type="datetime-local" value={form.follow_up_at}
                  onChange={e => setForm({ ...form, follow_up_at: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <input value={form.follow_up_note} onChange={e => setForm({ ...form, follow_up_note: e.target.value })}
                  placeholder="Follow-up note" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  placeholder="Notes" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={saveForm} className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                  Save
                </button>
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Value</dt><dd className="text-slate-900">{formatCents(deal.value_cents)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Probability</dt><dd className="text-slate-900">{deal.probability ?? 0}%</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Expected close</dt><dd className="text-slate-900">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Source</dt><dd className="text-slate-900">{deal.source || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Follow-up</dt><dd className={`text-sm ${deal.follow_up_at && new Date(deal.follow_up_at) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                  {deal.follow_up_at ? new Date(deal.follow_up_at).toLocaleString() : '—'}
                </dd></div>
                {deal.follow_up_note && <div><p className="text-xs text-slate-500 mb-1">Follow-up note</p><p className="text-sm text-slate-700">{deal.follow_up_note}</p></div>}
                {deal.notes && <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.notes}</p></div>}
              </dl>
            )}
          </section>

          {/* Add note */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-2">Log Activity</h3>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
              placeholder="Add a note, call summary, or meeting recap…"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2" />
            <div className="flex justify-end">
              <button onClick={addNote} disabled={!noteText.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                Log
              </button>
            </div>
          </section>

          {/* Activity timeline */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Timeline</h3>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map(a => (
                  <li key={a.id} className="pl-3 border-l-2 border-slate-200">
                    <p className="text-xs text-slate-400 uppercase">{a.type}</p>
                    {a.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {deal.clients && (
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Client</h3>
              <Link href={`/dashboard/clients/${deal.clients.id}`} className="block text-teal-600 text-sm font-medium hover:underline mb-2">
                {deal.clients.name}
              </Link>
              {deal.clients.email && <p className="text-xs text-slate-500">{deal.clients.email}</p>}
              {deal.clients.phone && <p className="text-xs text-slate-500">{deal.clients.phone}</p>}
              {deal.clients.address && <p className="text-xs text-slate-500 mt-2">{deal.clients.address}</p>}
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Convert</h3>
            <div className="space-y-2">
              <Link
                href={deal.clients
                  ? `/dashboard/sales/quotes/new?client_id=${deal.clients.id}`
                  : '/dashboard/sales/quotes/new'}
                className="block px-3 py-2 text-xs font-medium text-center rounded bg-white border border-slate-300 hover:bg-slate-50">
                Create Quote
              </Link>
              <Link
                href={deal.clients
                  ? `/dashboard/sales/invoices/new?client_id=${deal.clients.id}`
                  : '/dashboard/sales/invoices/new'}
                className="block px-3 py-2 text-xs font-medium text-center rounded bg-white border border-slate-300 hover:bg-slate-50">
                Create Invoice
              </Link>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Meta</h3>
            <dl className="text-xs space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-700">{new Date(deal.created_at).toLocaleDateString()}</dd></div>
              {deal.stage_changed_at && <div className="flex justify-between"><dt className="text-slate-500">In stage since</dt><dd className="text-slate-700">{new Date(deal.stage_changed_at).toLocaleDateString()}</dd></div>}
              {deal.closed_at && <div className="flex justify-between"><dt className="text-slate-500">Closed</dt><dd className="text-slate-700">{new Date(deal.closed_at).toLocaleDateString()}</dd></div>}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
