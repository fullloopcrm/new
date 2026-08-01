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
import { PROFILE_SECTION_META as SECTION_META, PROFILE_SECTION_ORDER as SECTION_ORDER, PROFILE_FIELD_NUMBER } from '@/lib/tenant-profile'
import OnboardingCatalog from './OnboardingCatalog'

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
  help: string | null
  platformManaged?: boolean
  onboardingHidden?: boolean
}

// Grayed, disabled stand-in for platformManaged fields (vendor API keys,
// internal SEO/analytics config) -- a home-service business owner has no
// reason to have these on hand. Shown so the question isn't just silently
// missing (they can see it exists and why it's locked), but never an active
// input: nothing here should look like something they're expected to fill.
function PlatformManagedField({ number, label }: { number: string | undefined; label: string }) {
  return (
    <div className="opacity-60">
      <label className="mb-1 block text-sm font-medium text-slate-500">{number ? `${number} ` : ''}{label}</label>
      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
        <span aria-hidden>🔒</span> Full Loop sets this up for you — no action needed here.
      </div>
    </div>
  )
}

function FieldHelp({ text }: { text: string | null | undefined }) {
  if (!text) return null
  return <p className="mb-1.5 text-xs text-slate-500">{text}</p>
}

// Long-form fields (paragraphs, structured lists/pairs, editors with their
// own internal rows) need the full row in the 2-column grid — cramming them
// into a half-width cell is what made this feel like a cramped contact form.
function isWideField(f: ApiField): boolean {
  return f.input === 'textarea' || f.input === 'custom' || (f.input === 'array' && !f.options)
}

type FormState = Record<string, FieldValue>

type Mode = { mode: 'session' } | { mode: 'token'; token: string }

export function ProfileWizard({ mode, onComplete }: { mode: Mode; onComplete?: () => void }) {
  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<ApiField[]>([])
  const [form, setForm] = useState<FormState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [businessName, setBusinessName] = useState('')
  // Which section INDICES have actually been landed on — not a contiguous
  // "0..step" range, because the tab nav lets the tenant jump straight to
  // section 9 from section 1. Only sections in this set are safe to
  // live-write: everything else is still blank in `form`, and sending blank
  // through applyProfileWrite clears the real field.
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))

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
        setBusinessName((d.name as string) || '')
        const values: FormState = {}
        for (const f of (d.fields || []) as ApiField[]) values[f.key] = f.value
        const draft = (d.draft || {}) as Record<string, unknown>
        const { __step, ...draftFields } = draft
        setForm({ ...values, ...(draftFields as FormState) })
        if (typeof __step === 'number') {
          setStep(__step)
          // A resumed draft only ever recorded a single last-position step
          // (the old sequential Next/Back nav), so 0..__step is the correct
          // reconstruction of what was visited before this session started.
          setVisitedSteps((v) => new Set([...v, ...Array.from({ length: __step + 1 }, (_, i) => i)]))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: FieldValue) => setForm((f) => ({ ...f, [k]: v }))

  const sections = useMemo(() => {
    const present = new Set(fields.map((f) => f.section))
    return SECTION_ORDER.filter((s) => present.has(s))
  }, [fields])

  const saveDraft = useCallback(
    async (silent = false, stepOverride?: number) => {
      setSaving(true)
      // Live-write only fields from sections actually visited — never the
      // whole form. Not-yet-visited sections are blank in `form`, and
      // coerceFieldValue turns blank into an explicit clear, so sending them
      // would null out real data on every autosave.
      const visitedIdx = new Set([...visitedSteps, stepOverride ?? step])
      const visitedSections = new Set(sections.filter((_, i) => visitedIdx.has(i)))
      const data: FormState = {}
      for (const f of fields) {
        if (!f.readonly && visitedSections.has(f.section as typeof SECTION_ORDER[number])) data[f.key] = form[f.key]
      }
      await fetch('/api/tenant-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, draft: form, step: stepOverride ?? step, data }),
      }).catch(() => {})
      setSaving(false)
      if (!silent) {
        setMsg('Saved — you can pick up where you left off anytime.')
        setTimeout(() => setMsg(''), 3000)
      }
    },
    [form, step, token, sections, fields, visitedSteps],
  )

  // Debounced autosave — skips the initial load (form is {} until the fetch
  // above resolves) so it never overwrites a real draft with an empty one.
  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => saveDraft(true), 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading])

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
  const sectionFields = fields.filter((f) => f.section === sectionKey && !f.readonly && !f.onboardingHidden)
  const pct = Math.round(((step + 1) / sections.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-400">
        <span className="font-heading text-slate-900">Full Loop</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">CRM</span>
      </div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {businessName ? `Complete ${businessName}'s profile` : 'Complete your business profile'}
        </h1>
        <p className="text-sm text-slate-500">
          Everything you enter here goes straight into your own Full Loop account — it&apos;s what runs your invoices, your texts and emails to clients, your booking site, and your AI agent. Save and finish anytime.
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${saving ? 'bg-amber-400' : 'bg-green-500'}`} />
          {saving ? 'Saving…' : 'Every answer saves automatically as you type — nothing to submit until you\'re ready.'}
        </p>
        {mode.mode === 'token' && (
          <p className="mt-1 text-xs text-slate-400">
            🔒 This link is private to your business only — your answers are never shared outside your account, and sensitive details (API keys, banking info) are encrypted before they&apos;re stored.
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {sections.map((s, i) => {
          const m = SECTION_META[s] || { title: s, blurb: '' }
          const isCurrent = i === step
          const isDone = i < step
          return (
            <button
              key={s}
              type="button"
              onClick={() => goto(i)}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                isCurrent
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : isDone
                    ? 'border-slate-300 bg-slate-50 text-slate-500 hover:border-teal-400 hover:text-teal-600'
                    : 'border-slate-200 text-slate-400 hover:border-teal-400 hover:text-teal-600'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                isCurrent ? 'bg-teal-600 text-white' : isDone ? 'bg-slate-300 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {i + 1}
              </span>
              {m.title}
            </button>
          )
        })}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{meta.title}</h2>
        {meta.blurb && <p className="mb-5 text-sm text-slate-500">{meta.blurb}</p>}

        {sectionKey === 'services' && <OnboardingCatalog token={token} />}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {sectionFields.map((f) => (
            <div key={f.key} className={isWideField(f) ? 'md:col-span-2' : undefined}>
              {f.platformManaged ? (
                <PlatformManagedField number={PROFILE_FIELD_NUMBER[f.key]} label={f.label} />
              ) : (
                <FieldRenderer
                  field={{ ...f, label: `${PROFILE_FIELD_NUMBER[f.key] || ''} ${f.label}`.trim() }}
                  value={form[f.key]}
                  onChange={(v) => set(f.key, v)}
                />
              )}
            </div>
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
          <FieldHelp text={field.help} />
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
    if (field.key === 'faqs') {
      return (
        <PairListEditor
          label={field.label}
          value={value}
          onChange={onChange}
          keyA="question" keyB="answer"
          placeholderA="Question customers actually ask" placeholderB="How you answer it"
          addLabel="+ Add FAQ"
        />
      )
    }
    if (field.key === 'objectionHandlers') {
      return (
        <PairListEditor
          label={field.label}
          value={value}
          onChange={onChange}
          keyA="trigger" keyB="response"
          placeholderA="If they say..." placeholderB="...respond with"
          addLabel="+ Add objection"
        />
      )
    }
    if (field.key === 'addons') {
      return (
        <PairListEditor
          label={field.label}
          value={value}
          onChange={onChange}
          keyA="label" keyB="price"
          placeholderA="Add-on name" placeholderB="Price (optional)"
          addLabel="+ Add add-on"
        />
      )
    }
    return null
  }

  const options = (field.options || []).map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
  const inputId = `field-${field.key}`

  switch (field.input) {
    case 'textarea':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <FieldHelp text={field.help} />
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
          <FieldHelp text={field.help} />
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
          <FieldHelp text={field.help} />
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
          <FieldHelp text={field.help} />
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
        <div>
          <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-slate-700">
            <input id={inputId} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            {field.label}
          </label>
          {field.help && <p className="mt-1 ml-6 text-xs text-slate-500">{field.help}</p>}
        </div>
      )
    case 'array':
      if (options.length > 0) {
        const selected = (value as string[]) || []
        return (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
            <FieldHelp text={field.help} />
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
          <FieldHelp text={field.help} />
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
          <FieldHelp text={field.help} />
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

/**
 * Generic editor for the {keyA, keyB}[] shape shared by faqs
 * ({question, answer}), objectionHandlers ({trigger, response}), and addons
 * ({label, price}) — one component instead of three near-identical ones, per
 * the same reasoning as HolidayDatesEditor/SocialLinksEditor above: these are
 * structured objects, not scalars, so the generic array input can't render
 * them.
 */
function PairListEditor({
  label, value, onChange, keyA, keyB, placeholderA, placeholderB, addLabel,
}: {
  label: string
  value: FieldValue
  onChange: (v: FieldValue) => void
  keyA: string
  keyB: string
  placeholderA: string
  placeholderB: string
  addLabel: string
}) {
  const rows = (Array.isArray(value) ? value : []) as unknown as Record<string, string>[]
  const update = (next: Record<string, string>[]) => onChange(next as unknown as Record<string, unknown>)

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              placeholder={placeholderA}
              value={row[keyA] || ''}
              onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, [keyA]: e.target.value } : r)))}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder={placeholderB}
              value={row[keyB] || ''}
              onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, [keyB]: e.target.value } : r)))}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button type="button" onClick={() => update(rows.filter((_, j) => j !== i))} className="mt-1.5 text-xs text-slate-400 hover:text-red-500">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => update([...rows, { [keyA]: '', [keyB]: '' }])}
          className="text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
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
