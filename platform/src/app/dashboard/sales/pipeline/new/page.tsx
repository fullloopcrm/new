'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PIPELINE_STAGES } from '@/lib/pipeline'

type Client = { id: string; name: string; email: string | null; phone: string | null }

export default function NewDealPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])

  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [valueDollars, setValueDollars] = useState('')
  const [stage, setStage] = useState('lead')
  const [probability, setProbability] = useState('10')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [source, setSource] = useState('manual')
  const [notes, setNotes] = useState('')
  const [followUpAt, setFollowUpAt] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/clients?limit=500').then(r => r.json()).then(data => {
      setClients(Array.isArray(data) ? data : data.clients || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const meta = PIPELINE_STAGES.find(s => s.value === stage)
    if (meta) setProbability(String(meta.defaultProbability))
  }, [stage])

  async function save() {
    setErr('')
    if (!clientId && !title.trim()) { setErr('Select a client or enter a title'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId || null,
          title: title || null,
          value_cents: valueDollars ? Math.round(parseFloat(valueDollars) * 100) : 0,
          stage,
          probability: probability ? parseInt(probability) : 10,
          expected_close_date: expectedCloseDate || null,
          source: source || 'manual',
          notes: notes || null,
          follow_up_at: followUpAt || null,
          follow_up_note: followUpNote || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const newId = data.id || data.deal?.id
      if (newId) router.push(`/dashboard/sales/pipeline/${newId}`)
      else router.push('/dashboard/sales/pipeline')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/sales/pipeline" className="text-xs text-slate-500 hover:underline">← Pipeline</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">New Deal</h1>

      {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Client</h2>
        <select value={clientId} onChange={e => setClientId(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">— No client (prospect) —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>)}
        </select>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Deal</h2>
        <label className="block text-xs text-slate-500 uppercase mb-1">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Roofing replacement — Main House"
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Value ($)</label>
            <input type="text" value={valueDollars} onChange={e => setValueDollars(e.target.value)}
              placeholder="5000"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Expected Close</label>
            <input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Stage</label>
            <select value={stage} onChange={e => setStage(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Probability (%)</label>
            <input type="number" min="0" max="100" value={probability} onChange={e => setProbability(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-heading font-semibold text-slate-900 mb-3">Follow-up</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Follow-up at</label>
            <input type="datetime-local" value={followUpAt} onChange={e => setFollowUpAt(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase mb-1">Source</label>
            <input type="text" value={source} onChange={e => setSource(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="block text-xs text-slate-500 uppercase mb-1">Follow-up note</label>
        <input type="text" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="block text-xs text-slate-500 uppercase mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/sales/pipeline" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</Link>
        <button onClick={save} disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Create Deal'}
        </button>
      </div>
    </div>
  )
}
