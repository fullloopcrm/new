'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Entity = {
  id: string
  name: string
  legal_name: string | null
  ein: string | null
  entity_type: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  is_default: boolean
  active: boolean
  fiscal_year_start: number
}

const ENTITY_TYPES = [
  { value: '', label: '—' },
  { value: 'sole_prop', label: 'Sole Prop' },
  { value: 'llc', label: 'LLC' },
  { value: 's_corp', label: 'S-Corp' },
  { value: 'c_corp', label: 'C-Corp' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
]

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    name: '', legal_name: '', ein: '', entity_type: '',
    address: '', city: '', state: '', zip: '',
    make_default: false,
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/finance/entities').then(r => r.json()).then(d => {
      setEntities(d.entities || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    setErr('')
    if (!form.name.trim()) { setErr('Name required'); return }
    const res = await fetch('/api/finance/entities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return }
    setShowForm(false)
    setForm({ name: '', legal_name: '', ein: '', entity_type: '', address: '', city: '', state: '', zip: '', make_default: false })
    load()
  }

  async function makeDefault(id: string) {
    await fetch(`/api/finance/entities/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ make_default: true }),
    })
    load()
  }

  async function archive(id: string) {
    if (!confirm('Archive this entity? Its data remains but is hidden from active views.')) return
    const res = await fetch(`/api/finance/entities/${id}`, { method: 'DELETE' })
    if (!res.ok) alert((await res.json()).error || 'Failed')
    load()
  }

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="mt-1 mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Entities</h1>
          <p className="text-sm text-slate-500">Separate legal / accounting units under this login. Reports consolidate across all by default.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
          {showForm ? 'Cancel' : '+ New Entity'}
        </button>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Display name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Legal name" value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="EIN (XX-XXXXXXX)" value={form.ein} onChange={e => setForm({ ...form, ein: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input placeholder="Street address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="md:col-span-2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Zip" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 mb-3">
            <input type="checkbox" checked={form.make_default} onChange={e => setForm({ ...form, make_default: e.target.checked })} />
            Make default (new bank accounts / manual entries land here)
          </label>
          <div className="flex justify-end">
            <button onClick={create} className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
              Save
            </button>
          </div>
        </section>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : entities.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No entities yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">EIN</th>
                <th className="px-5 py-2 font-medium">Location</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entities.map(e => (
                <tr key={e.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{e.name}</p>
                    {e.legal_name && <p className="text-xs text-slate-500">{e.legal_name}</p>}
                    {e.is_default && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">default</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-500 uppercase text-xs">{e.entity_type || '—'}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{e.ein || '—'}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {[e.city, e.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!e.is_default && (
                      <button onClick={() => makeDefault(e.id)} className="text-xs text-teal-600 hover:underline mr-2">
                        Make default
                      </button>
                    )}
                    {!e.is_default && (
                      <button onClick={() => archive(e.id)} className="text-xs text-red-500 hover:text-red-700">
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
