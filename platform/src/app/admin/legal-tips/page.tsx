'use client'

/**
 * Legal Overlook tip library admin. Every tip is created inactive — it can
 * only reach a tenant's dashboard after a human explicitly flips "Active"
 * here, which is meant to happen only once a real attorney has reviewed the
 * content. This page never generates tip content; it only stores what a
 * human types in.
 */
import { useEffect, useState } from 'react'

const TRADE_OPTIONS = [
  '', 'cleaning', 'window_cleaning', 'gutter', 'carpet_cleaning', 'air_duct', 'pressure_washing',
  'pool', 'chimney', 'lawn_care', 'irrigation', 'snow_removal', 'tree_service', 'pest',
  'junk_removal', 'dumpster', 'towing', 'appliance_repair', 'garage_door', 'locksmith',
  'septic', 'handyman', 'hvac', 'plumbing', 'electrical', 'landscaping', 'remodeling',
  'roofing', 'siding', 'painting', 'flooring', 'concrete', 'deck', 'fencing', 'general',
]

const STATE_OPTIONS = [
  '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY', 'DC',
]

const TRIGGER_OPTIONS = [
  { value: 'always', label: 'Always (general tip)' },
  { value: 'license_missing', label: 'No license on file' },
  { value: 'license_expiring', label: 'License expiring soon' },
  { value: 'insurance_missing', label: 'No insurance on file' },
  { value: 'insurance_expiring', label: 'Insurance expiring soon' },
]

type Trigger = { id: string; trigger_type: string; days_before: number | null }
type Tip = {
  id: string
  title: string
  body: string
  trade_key: string | null
  state_code: string | null
  source_citation: string | null
  is_active: boolean
  review_due_date: string | null
  created_at: string
  legal_tip_triggers: Trigger[]
}

const emptyForm = {
  title: '', tip_body: '', trade_key: '', state_code: '', source_citation: '',
  review_due_date: '', trigger_type: 'always', days_before: '',
}

export default function LegalTipsAdminPage() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    fetch('/api/admin/legal-tips')
      .then((r) => r.json())
      .then((data) => setTips(data.tips || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const create = async () => {
    if (!form.title.trim() || !form.tip_body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/legal-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, days_before: form.days_before ? Number(form.days_before) : null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
      } else {
        setForm(emptyForm)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (tip: Tip) => {
    setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, is_active: !t.is_active } : t)))
    await fetch(`/api/admin/legal-tips/${tip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !tip.is_active }),
    }).catch(() => load())
  }

  const remove = async (id: string) => {
    setTips((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/admin/legal-tips/${id}`, { method: 'DELETE' }).catch(() => load())
  }

  return (
    <div className="max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Legal Overlook — Tip Library</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every tip starts inactive. Only flip a tip Active after a real attorney has reviewed the
          content — that flag is the only thing standing between this text and a tenant&apos;s dashboard.
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-[10px] text-slate-400 uppercase tracking-wide">New tip (starts inactive)</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Tip body — the exact attorney-approved text shown to the tenant"
          value={form.tip_body}
          onChange={(e) => setForm({ ...form, tip_body: e.target.value })}
          rows={4}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Source citation (optional, e.g. NY Labor Law § 220)"
          value={form.source_citation}
          onChange={(e) => setForm({ ...form, source_citation: e.target.value })}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Trade (blank = all trades)</label>
            <select
              value={form.trade_key}
              onChange={(e) => setForm({ ...form, trade_key: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            >
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t || 'All trades'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">State (blank = all states)</label>
            <select
              value={form.state_code}
              onChange={(e) => setForm({ ...form, state_code: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            >
              {STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || 'All states'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Trigger</label>
            <select
              value={form.trigger_type}
              onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            >
              {TRIGGER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {(form.trigger_type === 'license_expiring' || form.trigger_type === 'insurance_expiring') && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Days before expiry (default 30)</label>
              <input
                type="number"
                value={form.days_before}
                onChange={(e) => setForm({ ...form, days_before: e.target.value })}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Review due date (optional)</label>
          <input
            type="date"
            value={form.review_due_date}
            onChange={(e) => setForm({ ...form, review_due_date: e.target.value })}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={create}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Save tip (inactive)
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : tips.length === 0 ? (
        <p className="text-sm text-slate-400">No tips yet.</p>
      ) : (
        <div className="space-y-3">
          {tips.map((tip) => (
            <div key={tip.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                      tip.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {tip.is_active ? 'Active' : 'Inactive — unreviewed'}
                  </span>
                  <h3 className="font-medium mt-1">{tip.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {tip.trade_key || 'All trades'} · {tip.state_code || 'All states'} ·{' '}
                    {tip.legal_tip_triggers?.map((t) => t.trigger_type).join(', ') || 'no trigger'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(tip)}
                    className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    {tip.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => remove(tip.id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">{tip.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
