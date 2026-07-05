'use client'

/**
 * Registry-driven tenant-profile form with field-level live-save.
 *
 * Renders itself from the GET /api/admin/businesses/[id]/profile field list — one
 * <Field> renderer per input type, grouped by section. Every edit auto-saves via
 * PATCH { field, value } (debounced on change, immediate on blur): no draft blob,
 * no "Save" button, no data loss. Each save routes to its real store server-side
 * and returns fresh readiness, which drives the completeness rail + launch gate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Tier = 'critical' | 'recommended' | 'optional'
type Input = 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array'
type Opt = string | { label: string; value: string | number }

interface Field {
  key: string; label: string; section: string; value: unknown; filled: boolean
  tier: Tier; readonly: boolean; kind: string; input: Input; options: Opt[] | null; funnels: string[] | null
}
interface Readiness {
  funnel: string
  completeness: { filled: number; applicable: number; pct: number }
  sections: { section: string; filled: number; applicable: number; missingCritical: string[] }[]
  launchBlockers: string[]
  canLaunch: boolean
}
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
interface ActivationStep { key: string; label: string; status: string; detail?: string }
interface ActivationResult { ok?: boolean; activated?: boolean; ready?: boolean; steps?: ActivationStep[]; ownerPin?: string | null; error?: string }

const SECTION_TITLES: Record<string, string> = {
  identity: 'Business Identity', contact: 'Contact & Location', brand: 'Brand & Site',
  services: 'Services & Pricing', scheduling: 'Scheduling', payments: 'Payments',
  comms: 'Comms & Integrations', reviews: 'Reviews', referrals: 'Referrals & Finance',
  proposals: 'Proposals', team: 'Team Defaults', compliance: 'Licensing & Insurance',
  ai: 'AI Persona', seo: 'Leads & SEO',
}
const SECTION_ORDER = ['identity', 'contact', 'brand', 'services', 'scheduling', 'payments', 'comms', 'reviews', 'referrals', 'proposals', 'team', 'ai', 'compliance', 'seo']

const optValue = (o: Opt) => (typeof o === 'string' ? o : o.value)
const optLabel = (o: Opt) => (typeof o === 'string' ? o : o.label)

export function ProfileForm({ tenantId }: { tenantId: string }) {
  const [fields, setFields] = useState<Field[]>([])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [activating, setActivating] = useState(false)
  const [activation, setActivation] = useState<ActivationResult | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch(`/api/admin/businesses/${tenantId}/profile`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        setFields(d.profile.fields)
        setValues(Object.fromEntries(d.profile.fields.map((f: Field) => [f.key, f.value])))
        setReadiness(d.readiness)
        setLoading(false)
      })
      .catch((e) => { setError(e.message || 'Failed to load'); setLoading(false) })
  }, [tenantId])

  const save = useCallback(async (key: string, value: unknown) => {
    setSaveState((s) => ({ ...s, [key]: 'saving' }))
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/profile`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ field: key, value }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (d.readiness) setReadiness(d.readiness)
      setSaveState((s) => ({ ...s, [key]: 'saved' }))
      setTimeout(() => setSaveState((s) => (s[key] === 'saved' ? { ...s, [key]: 'idle' } : s)), 1500)
    } catch {
      setSaveState((s) => ({ ...s, [key]: 'error' }))
    }
  }, [tenantId])

  const activate = useCallback(async () => {
    setActivating(true)
    setActivation(null)
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/activate`, { method: 'POST', credentials: 'include' })
      const d: ActivationResult = await res.json()
      setActivation(d)
      // Refresh readiness — activation may flip status / seed fields.
      const g = await fetch(`/api/admin/businesses/${tenantId}/profile`, { credentials: 'include' })
      if (g.ok) setReadiness((await g.json()).readiness)
    } catch {
      setActivation({ error: 'Activation request failed — retry.' })
    }
    setActivating(false)
  }, [tenantId])

  const onChange = (key: string, value: unknown, immediate = false) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (timers.current[key]) clearTimeout(timers.current[key])
    if (immediate) { save(key, value); return }
    timers.current[key] = setTimeout(() => save(key, value), 700)
  }

  const bySection = useMemo(() => {
    const m: Record<string, Field[]> = {}
    for (const f of fields) (m[f.section] ||= []).push(f)
    return m
  }, [fields])

  if (loading) return <p className="text-slate-500 p-6">Loading profile…</p>
  if (error) return <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Form */}
      <div className="flex-1 space-y-8 max-w-2xl">
        {SECTION_ORDER.filter((s) => bySection[s]?.length).map((section) => {
          const all = bySection[section]
          const visible = all.filter((f) => f.tier !== 'optional' || showOptional)
          if (!visible.length) return null
          const sec = readiness?.sections.find((x) => x.section === section)
          return (
            <section key={section} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-heading font-semibold text-slate-900">{SECTION_TITLES[section] || section}</h3>
                {sec && <span className="text-xs text-slate-400">{sec.filled}/{sec.applicable}</span>}
              </div>
              <div className="space-y-4">
                {visible.map((f) => (
                  <FieldRow key={f.key} field={f} value={values[f.key]} state={saveState[f.key] || 'idle'} onChange={onChange} />
                ))}
              </div>
            </section>
          )
        })}
        <button onClick={() => setShowOptional((v) => !v)} className="text-sm font-medium text-teal-600 hover:text-teal-700">
          {showOptional ? 'Hide optional fields' : 'Show all optional fields'}
        </button>
      </div>

      {/* Readiness rail */}
      {readiness && (
        <aside className="lg:w-72 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-heading font-semibold text-slate-900">Readiness</span>
              <span className="text-2xl font-bold text-slate-900">{readiness.completeness.pct}%</span>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all ${readiness.canLaunch ? 'bg-green-500' : 'bg-teal-600'}`} style={{ width: `${readiness.completeness.pct}%` }} />
            </div>
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Funnel: {readiness.funnel}</p>
            {readiness.launchBlockers.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Before launch ({readiness.launchBlockers.length}):</p>
                <ul className="space-y-1 text-sm text-slate-500">
                  {readiness.launchBlockers.map((b) => (
                    <li key={b} className="flex items-start gap-1.5"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />{b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm font-medium text-green-600">All critical fields set — ready to activate.</p>
            )}
            <button
              onClick={activate}
              disabled={!readiness.canLaunch || activating}
              className="mt-5 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-cta font-bold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              title={readiness.canLaunch ? 'Run activation' : 'Fill the critical fields first'}
            >
              {activating ? 'Activating…' : readiness.canLaunch ? 'Activate business →' : 'Not ready to activate'}
            </button>

            {activation && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                {activation.error ? (
                  <p className="text-red-600">{activation.error}</p>
                ) : (
                  <>
                    <p className={`mb-2 font-semibold ${activation.activated ? 'text-green-600' : 'text-orange-600'}`}>
                      {activation.activated ? 'Activated — live ✓' : 'Ran — not yet live'}
                    </p>
                    {activation.ownerPin && (
                      <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-amber-700">Owner PIN <strong>{activation.ownerPin}</strong> — shown once</p>
                    )}
                    <ul className="space-y-0.5">
                      {(activation.steps || []).map((s) => (
                        <li key={s.key} className="flex items-start gap-1.5 text-slate-500">
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${s.status === 'done' ? 'bg-green-500' : s.status === 'failed' ? 'bg-red-500' : 'bg-orange-400'}`} />
                          <span>{s.label}{s.detail ? <span className="text-slate-400"> — {s.detail}</span> : null}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

function StateDot({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  const map: Record<Exclude<SaveState, 'idle'>, [string, string]> = {
    saving: ['bg-slate-300', 'Saving…'], saved: ['bg-green-500', 'Saved'], error: ['bg-red-500', 'Save failed — retry'],
  }
  const [dot, label] = map[state]
  return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</span>
}

function FieldRow({ field: f, value, state, onChange }: {
  field: Field; value: unknown; state: SaveState; onChange: (k: string, v: unknown, immediate?: boolean) => void
}) {
  const labelEl = (
    <div className="mb-1 flex items-center gap-2">
      <label className="text-sm font-medium text-slate-700">{f.label}</label>
      {f.tier === 'critical' && <span className="text-[9px] uppercase font-semibold text-orange-500">required</span>}
      <StateDot state={state} />
    </div>
  )
  const cls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500'

  if (f.readonly) {
    const shown = Array.isArray(value) ? value.join(', ') : value == null || value === '' ? '—' : String(value)
    return (
      <div>{labelEl}
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{shown}
          <span className="ml-2 text-[11px] text-slate-400">(set elsewhere)</span>
        </div>
      </div>
    )
  }

  const commit = (v: unknown) => onChange(f.key, v, true)
  const type = f.input

  return (
    <div>{labelEl}
      {type === 'textarea' ? (
        <textarea className={cls} rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(f.key, e.target.value)} onBlur={(e) => commit(e.target.value)} />
      ) : type === 'select' ? (
        <select className={cls} value={(value as string | number) ?? ''} onChange={(e) => commit(e.target.value)}>
          <option value="">Select…</option>
          {(f.options || []).map((o) => <option key={String(optValue(o))} value={optValue(o)}>{optLabel(o)}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!value} onChange={(e) => commit(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {value ? 'On' : 'Off'}
        </label>
      ) : type === 'color' ? (
        <div className="flex gap-2">
          <input type="color" value={(value as string) || '#0d9488'} onChange={(e) => commit(e.target.value)} className="h-9 w-10 rounded border border-slate-300" />
          <input className={cls} value={(value as string) ?? ''} onChange={(e) => onChange(f.key, e.target.value)} onBlur={(e) => commit(e.target.value)} />
        </div>
      ) : type === 'number' ? (
        <input type="number" className={cls} value={(value as number | string) ?? ''} onChange={(e) => onChange(f.key, e.target.value)} onBlur={(e) => commit(e.target.value)} />
      ) : type === 'array' ? (
        <input className={cls} placeholder="comma, separated"
          value={Array.isArray(value) ? value.join(', ') : (value as string) ?? ''}
          onChange={(e) => onChange(f.key, e.target.value)} onBlur={(e) => commit(e.target.value)} />
      ) : (
        <input className={cls} value={(value as string) ?? ''} onChange={(e) => onChange(f.key, e.target.value)} onBlur={(e) => commit(e.target.value)} />
      )}
    </div>
  )
}
