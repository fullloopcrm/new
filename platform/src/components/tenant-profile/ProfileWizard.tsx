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
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import ServiceAreaEditor from '@/components/ServiceAreaEditor'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { VoiceTextarea, VoiceMicButton } from './VoiceInput'
import type { ServiceArea } from '@/lib/service-area'
import { PROFILE_SECTION_META as SECTION_META, PROFILE_SECTION_ORDER as SECTION_ORDER, PROFILE_FIELD_NUMBER, passesValidation, type FieldValidation, type ProfileSection, EXPENSE_CATEGORY_PRESETS, STATE_BASE_SALES_TAX, HOUR_OPTIONS, MIN_DAYS_OPTIONS, WEEKDAY_KEYS, WEEKDAY_LABELS } from '@/lib/tenant-profile'
import OnboardingCatalog from './OnboardingCatalog'
import OnboardingClients from './OnboardingClients'
import { OnboardingWelcome, useWelcomeGate } from './OnboardingWelcome'
import { generateTermsOfService, generatePrivacyPolicy } from '@/lib/legal-doc-templates'

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
  input: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array' | 'custom' | 'date'
  options: Array<string | { label: string; value: string | number }> | null
  funnels: string[] | null
  help: string | null
  platformManaged?: boolean
  onboardingHidden?: boolean
  validation?: FieldValidation | null
  dependsOn?: { key: string; value: unknown } | null
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

// Only shows once the tenant has actually typed something that doesn't pass
// the field's shape check — never on a blank field (that's isFilled's job at
// the readiness/activate gate, not a red error mid-typing).
function ValidationHint({ value, validation }: { value: FieldValue; validation: FieldValidation | null | undefined }) {
  if (!validation || !value || passesValidation(value, validation)) return null
  return <p className="mt-1 text-xs text-red-600">{validation.message}</p>
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
  const [missing, setMissing] = useState<{ key: string; label: string; section: ProfileSection }[]>([])
  const [businessName, setBusinessName] = useState('')
  const [tenantId, setTenantId] = useState('')
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
        setTenantId((d.tenantId as string) || '')
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

  const set = (k: string, v: FieldValue) => {
    setForm((f) => ({ ...f, [k]: v }))
    setMissing((m) => m.filter((x) => x.key !== k))
  }

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
      //
      // `step` (the section being left, if this call came from goto) is
      // unioned in explicitly rather than relying solely on `visitedSteps`
      // state: setVisitedSteps below won't have propagated into this
      // closure yet when goto calls saveDraft synchronously right after it,
      // so without this a tenant filling a section and immediately clicking
      // Next/"Save for later" would have that section's data land only in
      // the draft blob, not the real profile, until they revisited it or
      // hit Finish.
      const visitedIdx = new Set([...visitedSteps, step, stepOverride ?? step])
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
      setVisitedSteps(visitedIdx)
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
    setMissing([])
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
      const body = (await res.json().catch(() => ({}))) as { error?: string; missing?: { key: string; label: string; section: ProfileSection }[] }
      if (body.error === 'incomplete' && Array.isArray(body.missing) && body.missing.length > 0) {
        setMissing(body.missing)
        const firstIdx = sections.indexOf(body.missing[0].section)
        if (firstIdx >= 0) await goto(firstIdx)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setMsg('Something went wrong saving. Your draft is safe — try again.')
    } catch {
      setMsg('Something went wrong saving. Your draft is safe — try again.')
    } finally {
      setSaving(false)
    }
  }

  const { showWelcome, dismiss, show: showWelcomeAgain } = useWelcomeGate(token || tenantId || '__pending__')

  if (loading) return <p className="p-8 text-slate-500">Loading your profile…</p>
  if (sections.length === 0) return <p className="p-8 text-slate-500">Nothing to fill in yet.</p>
  if (showWelcome) return <OnboardingWelcome businessName={businessName} sections={sections} onStart={dismiss} />

  const sectionKey = sections[step]
  const meta = SECTION_META[sectionKey] || { title: sectionKey, blurb: '' }
  const HOURS_BLOCK_HIDDEN = new Set(['businessHoursEnd', 'businessHoursSameDaily', 'businessHoursPerDay', 'allowSameDay'])
  // dependsOn.value === false matches "falsy", not just literal false -- a
  // toggle a tenant never touched reads as undefined, and a field gated on
  // "the toggle is off" should still show by default, not only once the
  // tenant has explicitly flipped it off and back. dependsOn.value === true
  // stays strict (undefined correctly does NOT match true).
  const matchesDependsOn = (dep?: { key: string; value: unknown } | null) =>
    !dep || (dep.value === false ? !form[dep.key] : form[dep.key] === dep.value)
  const sectionFields = fields.filter((f) =>
    f.section === sectionKey && !f.readonly && !f.onboardingHidden && f.key !== 'serviceRadius' && !HOURS_BLOCK_HIDDEN.has(f.key) &&
    matchesDependsOn(f.dependsOn),
  )
  const pct = Math.round(((step + 1) / sections.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-28 lg:px-10">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="font-heading text-slate-900">Full Loop</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">CRM</span>
      </div>
      <div className="mb-10">
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {businessName ? `Complete ${businessName}'s profile` : 'Complete your business profile'}
        </h1>
        <p className="mt-3 text-sm text-slate-900">
          Everything you enter here goes straight into your own Full Loop account — it&apos;s what runs your invoices, your texts and emails to clients, your booking site, and your AI agent. Save and finish anytime.
        </p>
        <div className="mt-4 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs text-slate-900">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${saving ? 'bg-amber-400' : 'bg-green-500'}`} />
            {saving ? 'Saving…' : 'Every answer saves automatically as you type — nothing to submit until you\'re ready.'}
          </p>
          {mode.mode === 'token' && (
            <p className="text-xs text-slate-900">
              🔒 This link is private to your business only — your answers are never shared outside your account, and sensitive details (API keys, banking info) are encrypted before they&apos;re stored.
            </p>
          )}
        </div>
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

      {missing.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <p className="font-medium">
            {missing.length} required {missing.length === 1 ? 'question' : 'questions'} still need{missing.length === 1 ? 's' : ''} an answer before you can finish:
          </p>
          <ul className="mt-1.5 space-y-1">
            {missing.map((m) => {
              const idx = sections.indexOf(m.section)
              const sectionTitle = SECTION_META[m.section]?.title
              return (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => idx >= 0 && goto(idx)}
                    className="underline decoration-red-300 underline-offset-2 hover:text-red-900"
                  >
                    {m.label}
                  </button>
                  {sectionTitle && <span className="text-red-500"> — {sectionTitle}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{meta.title}</h2>
        {meta.blurb && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5">
            <span aria-hidden="true" className="text-base leading-none">💡</span>
            <p className="text-sm text-slate-600">{meta.blurb}</p>
          </div>
        )}

        {sectionKey === 'services' && <OnboardingCatalog token={token} industry={form.industry as string | undefined} />}
        {sectionKey === 'clients' && <OnboardingClients token={token} />}

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
                  homeState={form.state as string | undefined}
                  homeCity={form.city as string | undefined}
                  radiusMiles={form.serviceRadius as number | undefined}
                  setField={set}
                  token={token}
                  industry={form.industry as string | undefined}
                  businessHoursEnd={form.businessHoursEnd as string | undefined}
                  businessHoursSameDaily={form.businessHoursSameDaily as boolean | undefined}
                  businessHoursPerDay={form.businessHoursPerDay as Record<string, { start: string; end: string }> | undefined}
                  allowSameDay={form.allowSameDay as boolean | undefined}
                  formSnapshot={form}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? goto(step - 1) : showWelcomeAgain())}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
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
export function FieldRenderer({ field, value, onChange, homeState, homeCity, radiusMiles, setField, token, industry, businessHoursEnd, businessHoursSameDaily, businessHoursPerDay, allowSameDay, formSnapshot }: {
  field: ApiField; value: FieldValue; onChange: (v: FieldValue) => void; homeState?: string; homeCity?: string; radiusMiles?: number; setField?: (key: string, v: FieldValue) => void; token?: string; industry?: string
  businessHoursEnd?: string; businessHoursSameDaily?: boolean; businessHoursPerDay?: Record<string, { start: string; end: string }>; allowSameDay?: boolean
  formSnapshot?: FormState
}) {
  if (field.input === 'custom') {
    if (field.key === 'address') {
      return (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <FieldHelp text={field.help} />
          <AddressAutocomplete
            value={(value as string) || ''}
            onChange={(v) => onChange(v)}
            onSelect={(addr) => {
              onChange(addr.address_line1)
              setField?.('city', addr.city)
              setField?.('state', addr.state)
              setField?.('zip', addr.zip)
            }}
            placeholder="Start typing your business address…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-slate-500">Verified via Radar — pick your address from the dropdown so city/state/ZIP and your service area fill in automatically.</p>
        </div>
      )
    }
    if (field.key === 'serviceArea') {
      return (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <FieldHelp text={field.help} />
          <ServiceAreaEditor
            embedded
            value={(value as ServiceArea | undefined) ?? { scope: 'local', states: [], zones: [] }}
            onChange={(v) => onChange(v as unknown as Record<string, unknown>)}
            homeState={homeState}
            homeCity={homeCity}
            radiusMiles={radiusMiles}
            onRadiusChange={(v) => setField?.('serviceRadius', v)}
            token={token}
          />
        </div>
      )
    }
    if (field.key === 'holidayDates') return <HolidayDatesEditor value={value} onChange={onChange} help={field.help} />
    if (field.key === 'teamRoles') {
      const presets = TEAM_ROLE_PRESETS[industry || 'general'] || TEAM_ROLE_PRESETS.general
      return <TapSelectChips label={field.label} help={field.help} value={value} onChange={onChange} presets={presets} addPlaceholder="Something else? Add it…" />
    }
    if (field.key === 'teamRoleRates') {
      return (
        <RoleRatesEditor
          label={field.label} help={field.help} value={value} onChange={onChange}
          roles={(formSnapshot?.teamRoles as string[]) || []}
        />
      )
    }
    if (field.key === 'defaultWorkingDays') {
      return <WorkingDaysCheckboxes label={field.label} help={field.help} value={value} onChange={onChange} />
    }
    if (field.key === 'teamInvitePhones') {
      return <TagListEditor label={field.label} value={value} onChange={onChange} placeholder="e.g. (555) 123-4567" addLabel="+ Add phone" />
    }
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
    if (field.key === 'expenseCategories') {
      return <ExpenseCategoryCheckboxes label={field.label} help={field.help} value={value} onChange={onChange} />
    }
    if (field.key === 'taxRate') {
      return <TaxRateSelector label={field.label} help={field.help} value={value} onChange={onChange} homeState={homeState} />
    }
    if (field.key === 'differentiators') {
      return (
        <TapSelectChips
          label={field.label} help={field.help} value={value} onChange={onChange}
          presets={DIFFERENTIATOR_PRESETS} addPlaceholder="Something else? Add it…"
        />
      )
    }
    if (field.key === 'targetCustomer') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} industry={industry} />
    }
    if (field.key === 'businessDescription') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} industry={industry} presetMap={BUSINESS_DESCRIPTION_PRESETS} />
    }
    if (field.key === 'secondaryContacts') {
      return <SecondaryContactsEditor label={field.label} help={field.help} value={value} onChange={onChange} />
    }
    if (field.key === 'businessHoursStart') {
      return (
        <BusinessHoursEditor
          start={(value as string) || ''} end={businessHoursEnd || ''}
          sameDaily={businessHoursSameDaily !== false}
          perDay={businessHoursPerDay}
          onStartChange={onChange}
          onEndChange={(v) => setField?.('businessHoursEnd', v)}
          onSameDailyChange={(v) => setField?.('businessHoursSameDaily', v)}
          onPerDayChange={(v) => setField?.('businessHoursPerDay', v)}
          help={field.help}
        />
      )
    }
    if (field.key === 'minDaysAhead') {
      return (
        <SameDayLeadTimeEditor
          minDays={(value as number) ?? null}
          allowSameDay={allowSameDay !== false}
          onMinDaysChange={onChange}
          onAllowSameDayChange={(v) => setField?.('allowSameDay', v)}
          help={field.help}
        />
      )
    }
    if (field.key === 'additionalReviewLinks') {
      return <ReviewLinksEditor label={field.label} help={field.help} value={value} onChange={onChange} />
    }
    if (field.key === 'refundPolicy') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} presetMap={{ general: REFUND_POLICY_PRESETS }} />
    }
    if (field.key === 'cancellationPolicy') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} presetMap={{ general: CANCELLATION_POLICY_PRESETS }} />
    }
    if (field.key === 'reschedulePolicy') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} presetMap={{ general: RESCHEDULE_POLICY_PRESETS }} />
    }
    if (field.key === 'latePaymentPolicy') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} presetMap={{ general: LATE_PAYMENT_POLICY_PRESETS }} />
    }
    if (field.key === 'termsOfService') {
      return (
        <LegalDocEditor
          label={field.label} help={field.help} value={value} onChange={onChange}
          generate={() => generateTermsOfService(legalDocInputsFrom(formSnapshot))}
        />
      )
    }
    if (field.key === 'privacyPolicy') {
      return (
        <LegalDocEditor
          label={field.label} help={field.help} value={value} onChange={onChange}
          generate={() => generatePrivacyPolicy(legalDocInputsFrom(formSnapshot))}
        />
      )
    }
    if (field.key === 'insuranceCarrier') {
      return <SelectWithOtherField label={field.label} help={field.help} value={value} onChange={onChange} options={INSURANCE_CARRIER_OPTIONS} placeholder="Carrier name" />
    }
    if (field.key === 'insuranceCoverage') {
      return <SelectWithOtherField label={field.label} help={field.help} value={value} onChange={onChange} options={INSURANCE_COVERAGE_OPTIONS} placeholder="e.g. $750,000" />
    }
    if (field.key === 'insuranceCertUrl' || field.key === 'licenseDocUrl' || field.key === 'w9Url') {
      return <FileUploadField label={field.label} help={field.help} value={value} onChange={onChange} token={token} folder="compliance" />
    }
    if (field.key === 'businessStory') {
      return <TapAppendChips label={field.label} help={field.help} value={value} onChange={onChange} presetMap={{ general: BUSINESS_STORY_PRESETS }} />
    }
    if (field.key === 'targetKeywords') {
      return (
        <TargetKeywordsEditor
          label={field.label} help={field.help} value={value} onChange={onChange} token={token}
          city={formSnapshot?.city as string | undefined}
          serviceArea={formSnapshot?.serviceArea as ServiceArea | undefined}
          competitors={(formSnapshot?.competitors as string[]) || []}
        />
      )
    }
    if (field.key === 'adPlatforms') {
      return <TapSelectChips label={field.label} help={field.help} value={value} onChange={onChange} presets={AD_PLATFORM_OPTIONS} addPlaceholder="Other platform? Add it…" />
    }
    if (field.key === 'adPerformance') {
      return <TapSelectChips label={field.label} help={field.help} value={value} onChange={onChange} presets={AD_PERFORMANCE_OPTIONS} addPlaceholder="Something else? Add it…" />
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
          <VoiceTextarea
            value={(value as string) || ''}
            onChange={onChange}
            rows={3}
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
    case 'date':
      return (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
          <FieldHelp text={field.help} />
          <input
            id={inputId}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
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
          <ValidationHint value={value} validation={field.validation} />
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

interface HolidayDate { date: string; label: string; recurring?: boolean; source?: 'standard' }

// 2026 dates for the 11 federal holidays, recurring:true (yearly) --
// checking the box inserts these once; unchecking removes only the rows it
// added (source:'standard'), leaving anything the tenant typed in by hand
// alone even if it happens to share a label.
const STANDARD_US_HOLIDAYS: HolidayDate[] = [
  { date: '2026-01-01', label: "New Year's Day", recurring: true, source: 'standard' },
  { date: '2026-01-19', label: 'MLK Day', recurring: true, source: 'standard' },
  { date: '2026-02-16', label: "Presidents' Day", recurring: true, source: 'standard' },
  { date: '2026-05-25', label: 'Memorial Day', recurring: true, source: 'standard' },
  { date: '2026-06-19', label: 'Juneteenth', recurring: true, source: 'standard' },
  { date: '2026-07-04', label: 'Independence Day', recurring: true, source: 'standard' },
  { date: '2026-09-07', label: 'Labor Day', recurring: true, source: 'standard' },
  { date: '2026-10-12', label: 'Columbus Day', recurring: true, source: 'standard' },
  { date: '2026-11-11', label: 'Veterans Day', recurring: true, source: 'standard' },
  { date: '2026-11-26', label: 'Thanksgiving', recurring: true, source: 'standard' },
  { date: '2026-12-25', label: 'Christmas', recurring: true, source: 'standard' },
]

/**
 * +Add / remove list of plain strings — for fields that used to render as
 * "comma-separated" text inputs (a real reported confusion point: teamRoles,
 * see task tracking 2026-08-01) but are conceptually a list of short items,
 * not a sentence.
 */
function TagListEditor({ label, value, onChange, placeholder, addLabel }: {
  label: string; value: FieldValue; onChange: (v: FieldValue) => void; placeholder: string; addLabel: string
}) {
  const items = (Array.isArray(value) ? value : []) as string[]
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft('')
  }
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {item}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
        <button type="button" onClick={add} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50">
          {addLabel}
        </button>
      </div>
    </div>
  )
}

function HolidayDatesEditor({ value, onChange, help }: { value: FieldValue; onChange: (v: FieldValue) => void; help?: string | null }) {
  const dates = (Array.isArray(value) ? value : []) as unknown as HolidayDate[]
  const update = (next: HolidayDate[]) => onChange(next as unknown as Record<string, unknown>)

  const standardLabels = new Set(STANDARD_US_HOLIDAYS.map((h) => h.label))
  const usingStandard = STANDARD_US_HOLIDAYS.every((h) => dates.some((d) => d.label === h.label))
  const toggleStandard = (checked: boolean) => {
    if (checked) {
      const existingLabels = new Set(dates.map((d) => d.label))
      update([...dates, ...STANDARD_US_HOLIDAYS.filter((h) => !existingLabels.has(h.label))])
    } else {
      update(dates.filter((d) => !(d.source === 'standard' && standardLabels.has(d.label))))
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Holidays / blackout dates</label>
      <FieldHelp text={help} />
      <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={usingStandard} onChange={(e) => toggleStandard(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Use standard US holidays
      </label>
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

interface SecondaryContact { name: string; email: string; phone: string; isPrimary?: boolean }

/** Repeatable contact list, "+Add contact" not capped at one, with a single
 *  Primary radio across all rows (picking one clears it from the others —
 *  the system needs exactly one or zero primary, never two). */
function SecondaryContactsEditor({ label, help, value, onChange }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
}) {
  const contacts = (Array.isArray(value) ? value : []) as unknown as SecondaryContact[]

  const update = (next: SecondaryContact[]) => onChange(next as unknown as Record<string, unknown>)
  const updateRow = (i: number, patch: Partial<SecondaryContact>) =>
    update(contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const setPrimary = (i: number) =>
    update(contacts.map((c, j) => ({ ...c, isPrimary: j === i })))
  const addContact = () =>
    update([...contacts, { name: '', email: '', phone: '', isPrimary: contacts.length === 0 }])
  const removeContact = (i: number) => {
    const wasPrimary = contacts[i]?.isPrimary
    const next = contacts.filter((_, j) => j !== i)
    update(wasPrimary ? next.map((c) => ({ ...c, isPrimary: false })) : next)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="space-y-3">
        {contacts.map((c, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <input type="radio" name="secondary-contact-primary" checked={!!c.isPrimary} onChange={() => setPrimary(i)} />
                Primary contact
              </label>
              <button type="button" onClick={() => removeContact(i)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={c.name} onChange={(e) => updateRow(i, { name: e.target.value })} placeholder="Name" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input value={c.email} onChange={(e) => updateRow(i, { email: e.target.value })} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input value={c.phone} onChange={(e) => updateRow(i, { phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            </div>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-xs text-slate-400">No additional contacts yet.</p>}
        <button type="button" onClick={addContact} className="text-xs font-medium text-teal-600 hover:text-teal-700">+ Add contact</button>
      </div>
    </div>
  )
}

const SELECT_CLS = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500'

// Policy presets -- highly patterned across trades (Jeff's call,
// 2026-08-02), so a flat general-purpose list beats an industry-keyed map
// here. Tapping one appends it via TapAppendChips; voice/type still cover
// anything custom.
const CANCELLATION_POLICY_PRESETS = [
  '24hr notice required, no fee', '48hr notice required, $25 fee applies after',
  'No fee, please notify us as soon as possible', 'Same-day cancellations forfeit the deposit',
]
const REFUND_POLICY_PRESETS = [
  'No refunds once work has started', 'Full refund if canceled 24hr+ before service',
  'Partial refund based on work already completed', 'Refunds issued within 5-7 business days',
]
const RESCHEDULE_POLICY_PRESETS = [
  '24hr notice required to reschedule at no charge', '48hr notice required, otherwise a $25 fee applies',
  'Reschedule anytime at no fee, subject to availability', 'One free reschedule, $25 fee after that',
]
const LATE_PAYMENT_POLICY_PRESETS = [
  'Invoice due within 15 days, 1.5% monthly late fee after', 'Invoice due upon receipt, follow-up at 7/14/30 days overdue',
  '5% late fee applied after 10 days past due', 'Future jobs paused until the balance is paid',
]

// Trade-specific starter roles -- same "cover the trades this platform
// actually has real tenants in, fall back to general" rule as
// BUSINESS_DESCRIPTION_PRESETS. TapSelectChips already has a free-text +
// voice escape hatch for anything not listed.
const TEAM_ROLE_PRESETS: Record<string, string[]> = {
  cleaning: ['Lead Cleaner', 'Cleaner', 'Office Manager', 'Sales Rep'],
  window_cleaning: ['Lead Technician', 'Technician', 'Office Manager'],
  carpet_cleaning: ['Lead Technician', 'Technician', 'Office Manager'],
  landscaping: ['Crew Lead', 'Groundskeeper', 'Equipment Operator', 'Sales Rep'],
  lawn_care: ['Crew Lead', 'Groundskeeper', 'Sales Rep'],
  hvac: ['Lead Technician', 'Technician', 'Apprentice', 'Dispatcher'],
  plumbing: ['Lead Technician', 'Technician', 'Apprentice', 'Dispatcher'],
  electrical: ['Lead Technician', 'Technician', 'Apprentice', 'Dispatcher'],
  handyman: ['Lead Handyman', 'Handyman', 'Dispatcher'],
  moving: ['Crew Lead', 'Mover', 'Driver', 'Dispatcher'],
  junk_removal: ['Crew Lead', 'Driver', 'Laborer'],
  pest: ['Lead Technician', 'Technician', 'Office Manager'],
  pool: ['Route Technician', 'Lead Technician', 'Office Manager'],
  general: ['Admin', 'Salesperson', 'Technician', 'Office Manager'],
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 },
]

/** Real number[] (0=Sun..6=Sat) checkboxes -- NOT the generic 'array'+
 *  options case, which always coerces to strings (see tenant-profile.ts
 *  comment on defaultWorkingDays for why that would silently break every
 *  downstream number[] consumer). */
function WorkingDaysCheckboxes({ label, help, value, onChange }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
}) {
  const selected = (Array.isArray(value) ? value : []) as unknown as number[]
  const toggle = (d: number) =>
    onChange((selected.includes(d) ? selected.filter((v) => v !== d) : [...selected, d].sort()) as unknown as Record<string, unknown>)
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="flex flex-wrap gap-3">
        {DAY_OPTIONS.map((d) => (
          <label key={d.value} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={selected.includes(d.value)} onChange={() => toggle(d.value)} className="h-4 w-4 rounded border-slate-300" />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  )
}

interface RoleRate { role: string; hourlyRate: string }

/** Dropdown of already-added roles (from teamRoles, threaded in via
 *  formSnapshot) + a rate field -- no free-typing a role name here, so a
 *  rate can never be set for a role that doesn't exist above. */
function RoleRatesEditor({ label, help, value, onChange, roles }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void; roles: string[]
}) {
  const rates = (Array.isArray(value) ? value : []) as unknown as RoleRate[]
  const update = (next: RoleRate[]) => onChange(next as unknown as Record<string, unknown>)
  const ratedRoles = new Set(rates.map((r) => r.role))
  const availableRoles = roles.filter((r) => !ratedRoles.has(r))
  const [pickedRole, setPickedRole] = useState('')
  const [draftRate, setDraftRate] = useState('')

  const addRate = () => {
    const role = pickedRole || availableRoles[0]
    if (!role || !draftRate.trim()) return
    update([...rates, { role, hourlyRate: draftRate.trim() }])
    setPickedRole(''); setDraftRate('')
  }
  const removeRate = (i: number) => update(rates.filter((_, j) => j !== i))

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      {roles.length === 0 && <p className="mb-2 text-xs text-slate-400">Add team roles above first, then set a rate for each.</p>}
      <div className="space-y-2">
        {rates.map((r, i) => (
          <div key={r.role} className="flex items-center gap-2">
            <span className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{r.role}</span>
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input
                value={r.hourlyRate}
                onChange={(e) => update(rates.map((x, j) => (j === i ? { ...x, hourlyRate: e.target.value } : x)))}
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-5 pr-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button type="button" onClick={() => removeRate(i)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
          </div>
        ))}
        {availableRoles.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={pickedRole || availableRoles[0]} onChange={(e) => setPickedRole(e.target.value)} className={SELECT_CLS}>
              {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input
                value={draftRate}
                onChange={(e) => setDraftRate(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRate() } }}
                inputMode="decimal" placeholder="0"
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-5 pr-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button type="button" onClick={addRate} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              + Add rate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const BUSINESS_STORY_PRESETS = [
  'Started as a side hustle, grew through word-of-mouth', 'Family-owned, serving the area for years',
  'Started after seeing a gap in the market for honest, reliable service', 'Former trade employee who went out on my own',
]
const AD_PLATFORM_OPTIONS = ['Google Ads', 'Facebook/Instagram', 'Yelp Ads', 'Nextdoor', 'Angi/HomeAdvisor', 'Other']
const AD_PERFORMANCE_OPTIONS = ['Getting good leads', 'Leads but poor quality', 'Not sure it\'s working', 'Just started']

type CatalogItemLite = { name: string }

/** Auto-suggests "{service} {location}" keyword phrases from data already
 *  collected -- real catalog services (fetched here directly; catalog
 *  items live in service_types, not onboarding form state, same reason
 *  OnboardingCatalog does its own fetch) x city/service-area zones. Tap to
 *  add/remove, same interaction as TapSelectChips, but the preset list is
 *  computed instead of static. Competitor names are surfaced as context
 *  (not algorithmically expanded into comparison keywords -- that's not
 *  how people actually search, see conversation 2026-08-02). */
function TargetKeywordsEditor({ label, help, value, onChange, token, city, serviceArea, competitors }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void; token?: string
  city?: string; serviceArea?: ServiceArea; competitors?: string[]
}) {
  const selected = (Array.isArray(value) ? value : []) as string[]
  const [services, setServices] = useState<string[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const url = token ? `/api/catalog?token=${encodeURIComponent(token)}` : '/api/catalog'
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: CatalogItemLite[] } | null) => setServices((d?.items || []).map((i) => i.name)))
      .catch(() => {})
  }, [token])

  const locations = useMemo(() => {
    const zoneLabels = (serviceArea?.zones || []).map((z) => z.label).filter(Boolean).slice(0, 3)
    return [city, ...zoneLabels].filter((l): l is string => !!l)
  }, [city, serviceArea])

  const suggestions = useMemo(() => {
    if (!services.length) return []
    const out: string[] = []
    for (const svc of services.slice(0, 5)) {
      out.push(`${svc} near me`)
      for (const loc of locations.slice(0, 2)) out.push(`${svc} ${loc}`)
    }
    // Competitors don't belong IN a keyword (nobody searches "cleaning like
    // [Competitor]", and ranking for someone else's brand name isn't real
    // SEO value) -- but their existence signals "best/top-rated in [city]"
    // positioning terms are worth targeting, since those competitors are
    // presumably already fighting for that exact phrasing. Real tie-in
    // without inventing fake search behavior.
    if (competitors?.length && city) {
      for (const svc of services.slice(0, 3)) {
        out.push(`Best ${svc.toLowerCase()} in ${city}`)
        out.push(`Top-rated ${svc.toLowerCase()} near ${city}`)
      }
    }
    return Array.from(new Set(out)).filter((s) => !selected.includes(s)).slice(0, 14)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, locations, competitors, city])

  const toggle = (kw: string) => onChange(selected.includes(kw) ? selected.filter((k) => k !== kw) : [...selected, kw])
  const addCustom = (text: string) => {
    const v = text.trim()
    if (!v || selected.includes(v)) return
    onChange([...selected, v])
    setDraft('')
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      {!services.length && <p className="mb-2 text-xs text-slate-400">Add services in Services & Pricing first for auto-suggestions here — you can still add keywords manually below.</p>}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((kw) => (
            <button key={kw} type="button" onClick={() => toggle(kw)} className="rounded-full border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
              {kw} ×
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestions.map((kw) => (
            <button key={kw} type="button" onClick={() => toggle(kw)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
              + {kw}
            </button>
          ))}
        </div>
      )}
      {!!competitors?.length && (
        <p className="mb-2 text-xs text-slate-400">Competitors on file: {competitors.join(', ')} — added "best in [city]" suggestions above since they're likely fighting for that positioning too.</p>
      )}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(draft) } }}
          placeholder="Add a keyword or phrase…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
        <VoiceMicButton onResult={addCustom} />
        <button type="button" onClick={() => addCustom(draft)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Add
        </button>
      </div>
    </div>
  )
}

const INSURANCE_CARRIER_OPTIONS = [
  'State Farm', 'Progressive Commercial', 'The Hartford', 'Nationwide', 'Hiscox',
  'Travelers', 'Liberty Mutual', 'Chubb', 'Farmers', 'Next Insurance', 'Berkshire Hathaway (GUARD)',
]
const INSURANCE_COVERAGE_OPTIONS = ['$300,000', '$500,000', '$1,000,000', '$2,000,000']

/** Dropdown of common presets + "Other" reveals a text field -- the stored
 *  value is always just the plain string (no separate isOther flag), so
 *  reading it back just checks whether it's in the known list. */
function SelectWithOtherField({ label, help, value, onChange, options, placeholder }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
  options: string[]; placeholder?: string
}) {
  const current = (value as string) || ''
  const isKnown = options.includes(current)
  const isOther = current !== '' && !isKnown
  const [otherMode, setOtherMode] = useState(isOther)

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <select
        value={otherMode ? 'Other' : current}
        onChange={(e) => {
          if (e.target.value === 'Other') { setOtherMode(true); return }
          setOtherMode(false)
          onChange(e.target.value)
        }}
        className={SELECT_CLS}
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="Other">Other</option>
      </select>
      {otherMode && (
        <input
          value={isKnown ? '' : current}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      )}
    </div>
  )
}

const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

/** Real upload to /api/uploads (dual-auth: session or the same signed
 *  onboarding token every other /onboard/[token] write uses), replacing
 *  the old paste-a-Drive-link pattern. Stores the same plain URL string
 *  the field always stored -- nothing downstream needed to change. */
function FileUploadField({ label, help, value, onChange, token, folder }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
  token?: string; folder: string
}) {
  const url = (value as string) || ''
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true); setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('folder', folder)
      if (token) body.append('token', token)
      const res = await fetch('/api/uploads', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Upload failed'); return }
      onChange(data.url)
    } catch {
      setError('Upload failed — check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {url ? (
        <div className="flex items-center gap-3 text-sm">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">✓ View uploaded file</a>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '📎 Upload file'}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function legalDocInputsFrom(form?: FormState) {
  return {
    businessName: form?.businessName as string | undefined,
    legalName: form?.legalName as string | undefined,
    entityType: form?.entityType as string | undefined,
    city: form?.city as string | undefined,
    state: form?.state as string | undefined,
    phone: form?.phone as string | undefined,
    email: form?.email as string | undefined,
    cancellationPolicy: form?.cancellationPolicy as string | undefined,
    refundPolicy: form?.refundPolicy as string | undefined,
    reschedulePolicy: form?.reschedulePolicy as string | undefined,
    latePaymentPolicy: form?.latePaymentPolicy as string | undefined,
  }
}

/** Auto-drafted legal doc (Terms of Service / Privacy Policy) -- generates
 *  a real draft from already-collected data the first time this renders
 *  with nothing saved yet, shown in an editable voice/text box, never a
 *  blank box. "Regenerate" re-runs the template against current answers
 *  WITHOUT overwriting manual edits unless the tenant explicitly asks --
 *  it's a deliberate action, not a background sync. */
function LegalDocEditor({ label, help, value, onChange, generate }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void; generate: () => string
}) {
  const text = (value as string) || ''
  const drafted = useRef(false)

  useEffect(() => {
    if (drafted.current || text) return
    drafted.current = true
    onChange(generate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        ⚠️ This is a starting template, not legal advice — have an attorney review it before relying on it.
      </div>
      <VoiceTextarea value={text} onChange={onChange} rows={8} placeholder="Generating a draft…" />
      <button
        type="button"
        onClick={() => onChange(generate())}
        className="mt-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        ↻ Regenerate from current info
      </button>
    </div>
  )
}

// Top platforms customers actually search/review home service businesses
// on -- general directories + the trade-specific ones (Angi, HomeAdvisor,
// Thumbtack, Houzz, Porch). "Other" always last as the escape hatch.
const REVIEW_PLATFORM_OPTIONS = [
  'Yelp', 'Facebook', 'Angi', 'HomeAdvisor', 'Thumbtack', 'Houzz', 'Porch',
  'Better Business Bureau', 'Nextdoor', 'TrustPilot', 'Yellow Pages',
  'Bing Places', 'Apple Maps', 'Foursquare', 'Manta', 'MerchantCircle',
  'Superpages', 'CitySearch', "Judy's Book", 'Local.com', 'Insider Pages',
  'Kudzu', 'ShowMeLocal', 'EZLocal', 'Hotfrog', 'Other',
]

interface ReviewLink { platform: string; url: string }

/** Repeatable platform+URL rows for review sites beyond the primary Google
 *  link (which stays a separate scalar field, see tenant-profile.ts comment
 *  -- the live review-request send path only ever reads that one). */
function ReviewLinksEditor({ label, help, value, onChange }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
}) {
  const links = (Array.isArray(value) ? value : []) as unknown as ReviewLink[]
  const update = (next: ReviewLink[]) => onChange(next as unknown as Record<string, unknown>)
  const updateRow = (i: number, patch: Partial<ReviewLink>) =>
    update(links.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const addLink = () => update([...links, { platform: REVIEW_PLATFORM_OPTIONS[0], url: '' }])
  const removeLink = (i: number) => update(links.filter((_, j) => j !== i))

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={l.platform} onChange={(e) => updateRow(i, { platform: e.target.value })} className={`${SELECT_CLS} w-40 shrink-0`}>
              {REVIEW_PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={l.url}
              onChange={(e) => updateRow(i, { url: e.target.value })}
              placeholder="https://…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
            />
            <button type="button" onClick={() => removeLink(i)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
          </div>
        ))}
        {links.length === 0 && <p className="text-xs text-slate-400">No other platforms added yet.</p>}
        <button type="button" onClick={addLink} className="text-xs font-medium text-teal-600 hover:text-teal-700">
          + Add link
        </button>
      </div>
    </div>
  )
}

/** Opening/closing hours -- "same every day" (default) shows one start/end
 *  select pair; "set per day" reveals a 7-row grid, one start/end pair per
 *  weekday. Toggling back to "same every day" doesn't discard the per-day
 *  data (a tenant flipping back and forth shouldn't lose their work), it
 *  just stops being read -- the single pair (businessHoursStart/End) is
 *  always the source of truth when sameDaily is on. */
function BusinessHoursEditor({ start, end, sameDaily, perDay, onStartChange, onEndChange, onSameDailyChange, onPerDayChange, help }: {
  start: string; end: string; sameDaily: boolean; perDay?: Record<string, { start: string; end: string }>
  onStartChange: (v: FieldValue) => void; onEndChange: (v: string) => void
  onSameDailyChange: (v: boolean) => void; onPerDayChange: (v: FieldValue) => void; help?: string | null
}) {
  const days = perDay || {}
  const updateDay = (key: string, patch: Partial<{ start: string; end: string }>) => {
    const current = days[key] || { start: start || '09:00', end: end || '17:00' }
    onPerDayChange({ ...days, [key]: { ...current, ...patch } } as unknown as Record<string, unknown>)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Business hours</label>
      <FieldHelp text={help} />
      <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={sameDaily} onChange={(e) => onSameDailyChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Same hours every day
      </label>
      {sameDaily ? (
        <div className="flex items-center gap-2">
          <select value={start} onChange={(e) => onStartChange(e.target.value)} className={SELECT_CLS}>
            <option value="">Opens…</option>
            {HOUR_OPTIONS.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-sm text-slate-400">to</span>
          <select value={end} onChange={(e) => onEndChange(e.target.value)} className={SELECT_CLS}>
            <option value="">Closes…</option>
            {HOUR_OPTIONS.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ) : (
        <div className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
          {WEEKDAY_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 text-xs text-slate-500">{WEEKDAY_LABELS[key]}</span>
              <select value={days[key]?.start || ''} onChange={(e) => updateDay(key, { start: e.target.value })} className={`${SELECT_CLS} py-1.5 text-xs`}>
                <option value="">Closed</option>
                {HOUR_OPTIONS.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
              </select>
              <span className="text-xs text-slate-400">to</span>
              <select value={days[key]?.end || ''} onChange={(e) => updateDay(key, { end: e.target.value })} className={`${SELECT_CLS} py-1.5 text-xs`}>
                <option value="">Closed</option>
                {HOUR_OPTIONS.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Same-day booking + min-days-ahead lead time, linked so they can't
 *  contradict each other: picking "Same day" sets allowSameDay on; turning
 *  allowSameDay off bumps min-days off 0 (to 1, the next option up).
 *  Turning it back on drops min-days back to 0. One control, two columns
 *  of the same underlying rule. */
function SameDayLeadTimeEditor({ minDays, allowSameDay, onMinDaysChange, onAllowSameDayChange, help }: {
  minDays: number | null; allowSameDay: boolean
  onMinDaysChange: (v: FieldValue) => void; onAllowSameDayChange: (v: boolean) => void; help?: string | null
}) {
  const effectiveMinDays = minDays ?? (allowSameDay ? 0 : 1)

  const changeMinDays = (v: string) => {
    const n = Number(v)
    onMinDaysChange(n)
    onAllowSameDayChange(n === 0)
  }
  const changeAllowSameDay = (checked: boolean) => {
    onAllowSameDayChange(checked)
    if (checked) onMinDaysChange(0)
    else if (effectiveMinDays === 0) onMinDaysChange(1)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Min days ahead to book</label>
      <FieldHelp text={help} />
      <select value={effectiveMinDays} onChange={(e) => changeMinDays(e.target.value)} className={SELECT_CLS}>
        {MIN_DAYS_OPTIONS.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={allowSameDay} onChange={(e) => changeAllowSameDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Allow same-day booking
      </label>
      <p className="mt-1 text-xs text-slate-400">These stay in sync — same-day booking on means zero days ahead required.</p>
    </div>
  )
}

const DIFFERENTIATOR_PRESETS = ['Family-owned', 'Licensed & insured', 'Same-day service', 'Eco-friendly', 'Veteran-owned']

/** Multi-select chips storing a real string[] (see PROFILE_FIELDS
 *  'differentiators' — kind:'array'), plus a free-text+voice add for
 *  anything not in the preset list. Tap a chip to toggle it on/off; custom
 *  additions render as their own removable chip too. */
function TapSelectChips({ label, help, value, onChange, presets, addPlaceholder }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
  presets: string[]; addPlaceholder: string
}) {
  const selected = (Array.isArray(value) ? value : []) as string[]
  const [draft, setDraft] = useState('')
  const toggle = (chip: string) =>
    onChange(selected.includes(chip) ? selected.filter((c) => c !== chip) : [...selected, chip])
  const addCustom = (text: string) => {
    const v = text.trim()
    if (!v || selected.includes(v)) return
    onChange([...selected, v])
    setDraft('')
  }
  const customChips = selected.filter((s) => !presets.includes(s))

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="flex flex-wrap gap-2">
        {presets.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => toggle(chip)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected.includes(chip) ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {chip}
          </button>
        ))}
        {customChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => toggle(chip)}
            className="rounded-full border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700"
          >
            {chip} ×
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(draft) } }}
          placeholder={addPlaceholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
        <VoiceMicButton onResult={addCustom} />
        <button type="button" onClick={() => addCustom(draft)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Add
        </button>
      </div>
    </div>
  )
}

// Target-customer chip presets, industry-aware (falls back to 'general').
// Deliberately covers the trades this platform's real tenants are in
// (cleaning, landscaping, home trades) rather than guessing at all 53 —
// extend as more industries onboard real tenants.
const TARGET_CUSTOMER_PRESETS: Record<string, string[]> = {
  cleaning: ['Busy families', 'Working professionals', 'Property managers', 'Airbnb hosts', 'Elderly/senior clients', 'New parents'],
  window_cleaning: ['Homeowners', 'Property managers', 'Retail storefronts', 'Office buildings'],
  carpet_cleaning: ['Homeowners', 'Landlords/property managers', 'Pet owners', 'Move-in/move-out tenants'],
  landscaping: ['Homeowners', 'HOAs', 'Commercial properties', 'Property managers'],
  lawn_care: ['Homeowners', 'HOAs', 'Small businesses'],
  hvac: ['Homeowners', 'Property managers', 'Small businesses', 'New construction'],
  plumbing: ['Homeowners', 'Property managers', 'Small businesses', 'Emergency callers'],
  electrical: ['Homeowners', 'Property managers', 'Small businesses', 'New construction'],
  handyman: ['Homeowners', 'Landlords', 'Small businesses', 'Elderly/senior clients'],
  moving: ['Renters', 'Homeowners', 'Small businesses', 'Students'],
  junk_removal: ['Homeowners', 'Landlords/property managers', 'Estate cleanouts', 'Contractors'],
  pest: ['Homeowners', 'Property managers', 'Restaurants', 'Landlords'],
  pool: ['Homeowners', 'HOAs', 'Vacation rentals'],
  general: ['Homeowners', 'Property managers', 'Small businesses', 'Landlords'],
}

/** Tapping a chip appends its phrase into the free-text value (comma-joined)
 *  instead of replacing it — target customer stays a sentence/paragraph the
 *  AI persona reads directly (see persona-file.ts), not a structured array,
 *  so chips are a fast-start, not the whole answer. Voice/typing still fully
 *  edit the result below. */
const BUSINESS_DESCRIPTION_PRESETS: Record<string, string[]> = {
  cleaning: ['Residential cleaning', 'Commercial/office cleaning', 'Deep cleaning', 'Move-in/move-out cleaning', 'Recurring maintenance cleaning'],
  window_cleaning: ['Residential window cleaning', 'Commercial storefront cleaning', 'High-rise/multi-story cleaning'],
  carpet_cleaning: ['Residential carpet cleaning', 'Commercial carpet cleaning', 'Upholstery cleaning', 'Stain/pet-odor treatment'],
  landscaping: ['Lawn maintenance', 'Landscape design & installation', 'Seasonal cleanup', 'Irrigation & hardscape'],
  lawn_care: ['Weekly/biweekly mowing', 'Fertilization & weed control', 'Seasonal cleanup'],
  hvac: ['AC/heating repair', 'System installation', 'Maintenance plans', 'Emergency service'],
  plumbing: ['Repairs & leak fixes', 'Drain cleaning', 'Water heater service', 'Emergency plumbing'],
  electrical: ['Repairs & troubleshooting', 'Panel upgrades', 'New installations', 'Emergency electrical'],
  handyman: ['General home repairs', 'Small remodels', 'Furniture assembly', 'Punch-list/to-do-list work'],
  moving: ['Local moving', 'Long-distance moving', 'Packing services', 'Commercial/office moves'],
  junk_removal: ['Residential junk removal', 'Estate cleanouts', 'Construction debris removal', 'Commercial hauling'],
  pest: ['Residential pest control', 'Commercial pest control', 'Termite treatment', 'Preventive/recurring service'],
  pool: ['Weekly pool maintenance', 'Pool cleaning & chemical balancing', 'Equipment repair', 'Opening/closing service'],
  general: ['Residential service', 'Commercial service', 'Repairs & maintenance', 'Installation'],
}

function TapAppendChips({ label, help, value, onChange, industry, presetMap }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void; industry?: string; presetMap?: Record<string, string[]>
}) {
  const map = presetMap || TARGET_CUSTOMER_PRESETS
  const presets = map[industry || 'general'] || map.general
  const text = (value as string) || ''
  const append = (phrase: string) => {
    if (text.toLowerCase().includes(phrase.toLowerCase())) return
    onChange(text ? `${text}, ${phrase}` : phrase)
  }
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="mb-2 flex flex-wrap gap-2">
        {presets.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => append(chip)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600"
          >
            + {chip}
          </button>
        ))}
      </div>
      <VoiceTextarea value={text} onChange={onChange} rows={2} placeholder="Tap a starting point above, then refine — type or talk." />
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

function ExpenseCategoryCheckboxes({ label, help, value, onChange }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void
}) {
  const selected = (Array.isArray(value) ? value : []) as string[]
  const toggle = (cat: string) =>
    onChange(selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat])
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EXPENSE_CATEGORY_PRESETS.map((cat) => (
          <label key={cat} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(cat)}
              onChange={() => toggle(cat)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {cat}
          </label>
        ))}
      </div>
    </div>
  )
}

const CUSTOM_TAX_RATE = '__custom__'

function TaxRateSelector({ label, help, value, onChange, homeState }: {
  label: string; help?: string | null; value: FieldValue; onChange: (v: FieldValue) => void; homeState?: string
}) {
  const baseRate = homeState ? STATE_BASE_SALES_TAX[homeState] : undefined
  const hasBase = baseRate !== undefined
  const numericValue = typeof value === 'number' ? value : value ? Number(value) : null
  const isCustom = !hasBase || (numericValue != null && numericValue !== baseRate)

  if (!hasBase) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
        <FieldHelp text={help || 'Set your state above to get a suggested starting rate.'} />
        <input
          type="number"
          value={numericValue ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <FieldHelp text={help} />
      <select
        value={isCustom ? CUSTOM_TAX_RATE : String(baseRate)}
        onChange={(e) => onChange(e.target.value === CUSTOM_TAX_RATE ? (isCustom ? numericValue : null) : baseRate)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
      >
        <option value={String(baseRate)}>{baseRate}% — {homeState} base rate</option>
        <option value={CUSTOM_TAX_RATE}>Custom — I know my exact combined rate</option>
      </select>
      {isCustom && (
        <input
          type="number"
          placeholder="Your combined rate (state + local)"
          value={numericValue ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      )}
    </div>
  )
}
