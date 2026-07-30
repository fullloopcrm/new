'use client'

/**
 * Registry-driven profile wizard — the ONE form both the in-dashboard
 * onboarding wizard (mode="session", Clerk auth) and the public, no-login
 * /onboard/[token] link (mode="token") render. Fields come from GET
 * /api/tenant-profile, which serializes PROFILE_FIELDS
 * (src/lib/tenant-profile.ts) — the section list, field order, labels,
 * input types, and options are the registry, not hand-written JSX. That's
 * what makes "every field matches the profile" true structurally instead of
 * by convention: there is nowhere else to add a field except the registry,
 * and every renderer (this one, Settings' eventual migration, the admin
 * route) reads the same one.
 *
 * Autosave: 1.5s debounce on any field change, same pattern as the original
 * dashboard onboarding wizard this replaces. PUT persists the raw draft
 * (tenants.onboarding_draft) so closing the tab mid-field never loses input.
 *
 * `input: 'custom'` fields are special-cased by key (serviceArea →
 * ServiceAreaEditor in embedded/controlled mode, holidayDates → a small
 * date-list editor, socialLinks → one row of platform inputs) instead of a
 * generic control, since their values are structured objects/arrays, not
 * scalars.
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import ServiceAreaEditor from '@/components/ServiceAreaEditor'
import type { ServiceArea } from '@/lib/service-area'

export type FieldValue = string | number | boolean | string[] | Record<string, unknown> | null | undefined

export interface ApiField {
  key: string
  label: string
  section: string
  value: FieldValue
  filled: boolean
  tier: 'critical' | 'recommended' | 'optional'
  readonly: boolean
  kind: 'text' | 'number' | 'array' | 'bool'
  input: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array' | 'custom'
  options: Array<string | { label: string; value: string | number }> | null
  funnels: string[] | null
}

type FormState = Record<string, FieldValue>

const SECTION_META: Record<string, { title: string; blurb: string }> = {
  identity: { title: 'Business Identity', blurb: 'Legal details for invoices, taxes, and 1099/W-2 filing.' },
  contact: { title: 'Address & Contact', blurb: 'Where you operate and how customers reach you.' },
  brand: { title: 'Brand', blurb: 'How your business looks and sounds across your site and AI.' },
  services: { title: 'Services & Pricing', blurb: 'What you charge — the rest is set per-service.' },
  scheduling: { title: 'Scheduling', blurb: 'Hours, booking rules, and holidays.' },
  payments: { title: 'Payments', blurb: 'How clients pay you.' },
  comms: { title: 'Communications', blurb: 'How you send email, text, and AI replies.' },
  reviews: { title: 'Reviews', blurb: 'Where review requests point.' },
  referrals: { title: 'Referrals', blurb: 'Commission and payout rules for your referral program.' },
  proposals: { title: 'Proposals', blurb: 'Terms and deposit rules for pipeline-funnel quotes.' },
  team: { title: 'Team Defaults', blurb: 'Defaults applied to new team members.' },
  compliance: { title: 'Licensing & Insurance', blurb: 'Trade credentials that build trust and meet compliance.' },
  seo: { title: 'Lead Handling & SEO', blurb: 'How leads are captured and attributed.' },
  ai: { title: 'AI Persona', blurb: 'How your AI agent sounds and behaves.' },
}
const SECTION_ORDER = ['identity', 'contact', 'brand', 'services', 'scheduling', 'payments', 'comms', 'reviews', 'referrals', 'proposals', 'team', 'compliance', 'seo', 'ai']

type Mode = { mode: 'session' } | { mode: 'token'; token: string }

export function ProfileWizard({ mode, onComplete }: { mode: Mode; onComplete?: () => void }) {
  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<ApiField[]>([])
  const [form, setForm] = useState<FormState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const token = mode.mode === 'token' ? mode.token : undefined

  const apiUrl = useCallback(
    (base: string) => (token ? `${base}?token=${encodeURIComponent(token)}` : base),
    [token],
  )

  useEffect(() => {
    fetch(apiUrl('/api/tenant-profile'))
      .then((r) => r.json())
      .then((d) => {
        setFields(d.fields || [])
        const values: FormState = {}
        for (const f of (d.fields || []) as ApiField[]) values[f.key] = f.value
        const draft = (d.draft || {}) as Record<string, unknown>
        const { __step, ...draftFields } = draft
        setForm({ ...values, ...(draftFields as FormState) })
        if (typeof __step === 'number') setStep(__step)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: FieldValue) => setForm((f) => ({ ...f, [k]: v }))

  const saveDraft = useCallback(
    async (silent = false, stepOverride?: number) => {
      setSaving(true)
      await fetch('/api/tenant-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, draft: form, step: stepOverride ?? step }),
      }).catch(() => {})
      setSaving(false)
      if (!silent) {
        setMsg('Saved — you can pick up where you left off anytime.')
        setTimeout(() => setMsg(''), 3000)
      }
    },
    [form, step, token],
  )

  // Debounced autosave — skips the initial load (form is {} until the fetch
  // above resolves) so it never overwrites a real draft with an empty one.
  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => saveDraft(true), 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading])

  const sections = useMemo(() => {
    const present = new Set(fields.map((f) => f.section))
    return SECTION_ORDER.filter((s) => present.has(s))
  }, [fields])

  const goto = async (next: number) => {
    await saveDraft(true, next)
    setStep(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tenant-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, data: form }),
      })
      if (res.ok) {
        onComplete?.()
        return
      }
      setMsg('Something went wrong saving. Your draft is safe — try again.')
    } catch {
      setMsg('Something went wrong saving. Your draft is safe — try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-8 text-slate-500">Loading your profile…</p>
  if (sections.length === 0) return <p className="p-8 text-slate-500">Nothing to fill in yet.</p>

  const sectionKey = sections[step]
  const meta = SECTION_META[sectionKey] || { title: sectionKey, blurb: '' }
  const sectionFields = fields.filter((f) => f.section === sectionKey && !f.readonly)
  const pct = Math.round(((step + 1) / sections.length) * 100)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Complete your business profile</h1>
        <p className="text-sm text-slate-500">
          This wires your account across billing, HR, finance, your site, and AI. Save and finish anytime.
        </p>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Step {step + 1} of {sections.length} · {meta.title}</span>
        <span>{pct}%</span>
      </div>
      <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{meta.title}</h2>
        {meta.blurb && <p className="mb-5 text-sm text-slate-500">{meta.blurb}</p>}

        <div className="space-y-4">
          {sectionFields.map((f) => (
            <FieldRenderer key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => step > 0 && goto(step - 1)}
          disabled={step === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveDraft(false)}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save for later'}
          </button>
          {step < sections.length - 1 ? (
            <button onClick={() => goto(step + 1)} disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              Next
            </button>
          ) : (
            <button onClick={submit} disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Finishing…' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---- generic field renderer, dispatches to a custom block by key when input === 'custom' ---- */
export function FieldRenderer({ field, value, onChange }: { field: ApiField; value: FieldValue; onChange: (v: FieldValue) => void }) {
  if (field.input === 'custom') {
    if (field.key === 'serviceArea') {
      return (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <ServiceAreaEditor
            embedded
            value={(value as ServiceArea | undefined) ?? { scope: 'local', states: [], zones: [] }}
            onChange={(v) => onChange(v as unknown as Record<string, unknown>)}
          />
        </div>
      )
    }
    if (field.key === 'holidayDates') return <HolidayDatesEditor value={value} onChange={onChange} />
    if (field.key === 'socialLinks') return <SocialLinksEditor value={value} onChange={onChange} />
    return null
  }

  const options = (field.options || []).map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
  const inputId = `field-${field.key}`

  switch (field.input) {
    case 'textarea':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <textarea
            id={inputId}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )
    case 'number':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <input
            id={inputId}
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )
    case 'select':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <select
            id={inputId}
            value={(value as string | number) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={String(o.value)} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )
    case 'color':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <div className="flex items-center gap-2">
            <input type="color" aria-hidden value={(value as string) || '#0d9488'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
            <input
              id={inputId}
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      )
    case 'toggle':
      return (
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-slate-700">
          <input id={inputId} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {field.label}
        </label>
      )
    case 'array':
      if (options.length > 0) {
        const selected = (value as string[]) || []
        return (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
            <div className="flex flex-wrap gap-3">
              {options.map((o) => (
                <label key={String(o.value)} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(String(o.value))}
                    onChange={() =>
                      onChange(selected.includes(String(o.value)) ? selected.filter((v) => v !== o.value) : [...selected, String(o.value)])
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        )
      }
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label} <span className="text-slate-400">(comma-separated)</span></label>
          <input
            id={inputId}
            value={((value as string[]) || []).join(', ')}
            onChange={(e) => onChange(e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )
    default:
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <input
            id={inputId}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )
  }
}

interface HolidayDate { date: string; label: string; recurring?: boolean }

function HolidayDatesEditor({ value, onChange }: { value: FieldValue; onChange: (v: FieldValue) => void }) {
  const dates = (Array.isArray(value) ? value : []) as unknown as HolidayDate[]
  const update = (next: HolidayDate[]) => onChange(next as unknown as Record<string, unknown>)

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Holidays / blackout dates</label>
      <div className="space-y-2">
        {dates.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="date" value={d.date || ''} onChange={(e) => update(dates.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <input placeholder="Label (e.g. Thanksgiving)" value={d.label || ''} onChange={(e) => update(dates.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <label className="flex items-center gap-1 text-xs text-slate-500">
              <input type="checkbox" checked={!!d.recurring} onChange={(e) => update(dates.map((x, j) => (j === i ? { ...x, recurring: e.target.checked } : x)))} />
              yearly
            </label>
            <button type="button" onClick={() => update(dates.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => update([...dates, { date: '', label: '', recurring: false }])} className="text-xs font-medium text-teal-600 hover:text-teal-700">
          + Add date
        </button>
      </div>
    </div>
  )
}

const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x'] as const

function SocialLinksEditor({ value, onChange }: { value: FieldValue; onChange: (v: FieldValue) => void }) {
  const social = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, string>
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Social links</label>
      <div className="grid grid-cols-2 gap-3">
        {SOCIAL_PLATFORMS.map((p) => (
          <input
            key={p}
            placeholder={p[0].toUpperCase() + p.slice(1)}
            value={social[p] || ''}
            onChange={(e) => onChange({ ...social, [p]: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        ))}
      </div>
    </div>
  )
}
