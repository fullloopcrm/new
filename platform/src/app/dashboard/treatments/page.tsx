'use client'

import { useCallback, useEffect, useState } from 'react'
import { warrantyStatus, suggestWarrantyDays, type WarrantyStatus } from '@/lib/pest-warranty'

const APPLICATION_METHODS = ['spray', 'bait', 'dust', 'granular', 'fog', 'injection', 'other']

type LogRow = {
  id: string
  application_date: string
  service_address: string | null
  target_pest: string
  product_name: string
  epa_reg_number: string | null
  active_ingredient: string | null
  application_method: string
  quantity_used: string | null
  dilution_rate: string | null
  area_treated: string | null
  weather_conditions: string | null
  applicator_license_number: string | null
  team_member_id: string | null
  notes: string | null
  warranty_days: number | null
  is_reservice: boolean
  reservice_of_log_id: string | null
}

type Member = { id: string; name: string }

type Form = {
  application_date: string
  service_address: string
  target_pest: string
  product_name: string
  epa_reg_number: string
  active_ingredient: string
  application_method: string
  quantity_used: string
  dilution_rate: string
  area_treated: string
  weather_conditions: string
  applicator_license_number: string
  team_member_id: string
  notes: string
  warranty_days: string
  is_reservice: boolean
  reservice_of_log_id: string
}

function emptyForm(): Form {
  return {
    application_date: new Date().toISOString().slice(0, 10),
    service_address: '', target_pest: '', product_name: '', epa_reg_number: '',
    active_ingredient: '', application_method: 'spray', quantity_used: '',
    dilution_rate: '', area_treated: '', weather_conditions: '',
    applicator_license_number: '', team_member_id: '', notes: '',
    warranty_days: '', is_reservice: false, reservice_of_log_id: '',
  }
}

const WARRANTY_BADGE: Record<WarrantyStatus, { label: string; cls: string }> = {
  none: { label: '—', cls: 'text-gray-400' },
  active: { label: 'Active', cls: 'text-emerald-600 font-medium' },
  expiring_soon: { label: 'Expiring soon', cls: 'text-amber-600 font-medium' },
  expired: { label: 'Expired', cls: 'text-gray-400' },
}

export default function TreatmentLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState<Form>(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, teamRes] = await Promise.all([
        fetch('/api/dashboard/treatments'),
        fetch('/api/team'),
      ])
      const logsJson = await logsRes.json()
      if (!logsRes.ok) throw new Error(logsJson.error || 'Failed to load logs')
      const teamJson = await teamRes.json()
      setLogs(logsJson.logs || [])
      setMembers((teamJson.team || []).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const memberName = (id: string | null) => members.find(m => m.id === id)?.name || '—'

  const submit = async () => {
    if (!form.target_pest.trim() || !form.product_name.trim()) {
      setError('Target pest and product name are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          team_member_id: form.team_member_id || null,
          warranty_days: form.warranty_days.trim() === '' ? null : Number(form.warranty_days),
          reservice_of_log_id: form.is_reservice ? (form.reservice_of_log_id || null) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setForm(emptyForm())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="p-3 md:p-6 max-w-5xl">
      <h2 className="text-2xl font-semibold text-slate-900 mb-1">Treatment Log</h2>
      <p className="text-sm text-gray-500 mb-6">
        Record of chemical/treatment applications — product, target pest, method, rate, and applicator, for regulatory recordkeeping.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Log a treatment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Date">
            <Input type="date" value={form.application_date} onChange={v => set('application_date', v)} />
          </Field>
          <Field label="Applicator">
            <select value={form.team_member_id} onChange={e => set('team_member_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900">
              <option value="">— Select —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Service address"><Input value={form.service_address} onChange={v => set('service_address', v)} /></Field>
          <Field label="Target pest *">
            <Input
              value={form.target_pest}
              onChange={v => set('target_pest', v)}
              onBlur={() => { if (!form.warranty_days.trim()) set('warranty_days', String(suggestWarrantyDays(form.target_pest))) }}
            />
          </Field>
          <Field label="Product name *"><Input value={form.product_name} onChange={v => set('product_name', v)} /></Field>
          <Field label="EPA reg. number"><Input value={form.epa_reg_number} onChange={v => set('epa_reg_number', v)} /></Field>
          <Field label="Active ingredient"><Input value={form.active_ingredient} onChange={v => set('active_ingredient', v)} /></Field>
          <Field label="Application method">
            <select value={form.application_method} onChange={e => set('application_method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900">
              {APPLICATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Quantity used"><Input value={form.quantity_used} onChange={v => set('quantity_used', v)} placeholder="e.g. 2 fl oz" /></Field>
          <Field label="Dilution rate"><Input value={form.dilution_rate} onChange={v => set('dilution_rate', v)} /></Field>
          <Field label="Area treated"><Input value={form.area_treated} onChange={v => set('area_treated', v)} placeholder="e.g. kitchen, basement" /></Field>
          <Field label="Weather conditions"><Input value={form.weather_conditions} onChange={v => set('weather_conditions', v)} placeholder="e.g. 68°F, calm wind" /></Field>
          <Field label="Applicator license #"><Input value={form.applicator_license_number} onChange={v => set('applicator_license_number', v)} /></Field>
          <Field label="Guarantee (days)">
            <Input type="number" value={form.warranty_days} onChange={v => set('warranty_days', v)} placeholder="e.g. 30" />
          </Field>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <input
            type="checkbox" id="is_reservice" checked={form.is_reservice}
            onChange={e => set('is_reservice', e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="is_reservice" className="text-sm text-slate-700">
            This is a free re-service under an existing guarantee
            {form.is_reservice && (
              <select
                value={form.reservice_of_log_id}
                onChange={e => set('reservice_of_log_id', e.target.value)}
                className="ml-2 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white text-slate-900"
              >
                <option value="">— Original visit —</option>
                {logs.filter(l => !l.is_reservice).map(l => (
                  <option key={l.id} value={l.id}>{l.application_date} · {l.target_pest} · {l.product_name}</option>
                ))}
              </select>
            )}
          </label>
        </div>
        <div className="mt-3">
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none" />
          </Field>
        </div>
        <div className="mt-4">
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add log'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent applications</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">No treatments logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Applicator</th>
                  <th className="py-2 pr-3">Target pest</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Guarantee</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const status = warrantyStatus(log.application_date, log.warranty_days)
                  const badge = WARRANTY_BADGE[status]
                  return (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-slate-700">{log.application_date}</td>
                    <td className="py-2 pr-3 text-slate-700">{memberName(log.team_member_id)}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {log.target_pest}
                      {log.is_reservice && <span className="ml-1 text-xs text-blue-600">(re-service)</span>}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{log.product_name}</td>
                    <td className="py-2 pr-3 text-slate-700 capitalize">{log.application_method}</td>
                    <td className="py-2 pr-3 text-slate-500">{log.service_address || '—'}</td>
                    <td className={`py-2 pr-3 ${badge.cls}`}>
                      {log.warranty_days ? `${badge.label} · ${log.warranty_days}d` : badge.label}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Input({ value, onChange, type = 'text', placeholder, onBlur }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; onBlur?: () => void
}) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none" />
  )
}
