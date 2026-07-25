'use client'

/**
 * Onboarding profile wizard — the tenant owner fills their full business profile
 * across five sections. Every field routes to its existing home on submit (see
 * /api/dashboard/onboarding/profile). Draft autosaves on step change and via the
 * "Save for later" button, so the owner can leave and resume.
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_STEPS } from '@/lib/onboarding-steps'

type Profile = Record<string, string | number | boolean | undefined>

interface WebsiteStatus {
  domain: string | null
  domain_name: string | null
  dns_configured: boolean
  email_domain_verified: boolean
  website_published: boolean
  website_url: string | null
  enable_legacy_seo_pages: boolean
}

const ENTITY_TYPES = ['LLC', 'S-Corp', 'C-Corp', 'Sole Proprietor', 'Partnership', 'Nonprofit']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STEPS = ONBOARDING_STEPS

// Data importers surfaced in the final onboarding step. Clients first — schedules
// match appointments to imported clients.
const IMPORTS: Array<{ href: string; title: string; desc: string }> = [
  { href: '/dashboard/clients/import', title: '1. Client list', desc: 'Upload a CSV of your customers. We map columns and skip duplicates.' },
  { href: '/dashboard/schedules/import', title: '2. Schedule', desc: 'Existing & recurring appointments, matched to your clients.' },
  { href: '/dashboard/finance/import', title: '3. Finance', desc: 'Import bank transactions to seed your books.' },
]

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [website, setWebsite] = useState<WebsiteStatus | null>(null)
  const [websiteSaving, setWebsiteSaving] = useState(false)

  useEffect(() => {
    if (STEPS[step]?.key !== 'website' || website) return
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const t = (data.tenant?.tenant || data.tenant || data) as Record<string, unknown>
        setWebsite({
          domain: (t.domain as string) || null,
          domain_name: (t.domain_name as string) || null,
          dns_configured: !!t.dns_configured,
          email_domain_verified: !!t.email_domain_verified,
          website_published: !!t.website_published,
          website_url: (t.website_url as string) || null,
          enable_legacy_seo_pages: !!t.enable_legacy_seo_pages,
        })
      })
      .catch(() => {})
  }, [step, website])

  const toggleWebsiteField = async (k: 'website_published' | 'enable_legacy_seo_pages', v: boolean) => {
    if (!website) return
    setWebsite({ ...website, [k]: v })
    setWebsiteSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [k]: v }),
      })
    } finally {
      setWebsiteSaving(false)
    }
  }

  useEffect(() => {
    fetch('/api/dashboard/onboarding/profile')
      .then((r) => r.json())
      .then((d) => {
        // __step is the wizard's own bookkeeping (see saveDraft below), not a
        // form field — strip it out before merging into the field state.
        const { __step, ...draftFields } = (d.draft || {}) as Record<string, unknown>
        // Draft (in-progress) wins over saved prefill so a resume is exact.
        setForm({ ...(d.prefill || {}), ...draftFields } as Profile)
        if (typeof __step === 'number') setStep(Math.min(Math.max(__step, 0), STEPS.length - 1))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const saveDraft = useCallback(
    async (silent = false, stepOverride?: number) => {
      setSaving(true)
      await fetch('/api/dashboard/onboarding/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: form, step: stepOverride ?? step }),
      }).catch(() => {})
      setSaving(false)
      if (!silent) {
        setMsg('Saved — you can pick up where you left off anytime.')
        setTimeout(() => setMsg(''), 3000)
      }
    },
    [form, step],
  )

  const goto = async (next: number) => {
    await saveDraft(true, next)
    setStep(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: form }),
      })
      if (res.ok) {
        router.push('/dashboard?onboarded=1')
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

  const s = STEPS[step]
  const pct = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header + progress */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Complete your business profile</h1>
        <p className="text-sm text-slate-500">
          This wires your account across billing, HR, finance, your site, and AI. Save and finish anytime.
        </p>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Step {step + 1} of {STEPS.length} · {s.title}</span>
        <span>{pct}%</span>
      </div>
      <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{s.title}</h2>
        <p className="mb-5 text-sm text-slate-500">{s.blurb}</p>

        {s.key === 'identity' && (
          <div className="space-y-4">
            <Field label="Business name (public)" k="businessName" form={form} set={set} placeholder="Sparkle Cleaning NYC" />
            <Field label="Legal entity name" k="legalName" form={form} set={set} placeholder="Sparkle Cleaning LLC" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Entity type" k="entityType" form={form} set={set} options={ENTITY_TYPES} />
              <Field label="EIN / Tax ID" k="ein" form={form} set={set} placeholder="12-3456789" />
            </div>
            <Select
              label="Fiscal year starts"
              k="fiscalYearStart"
              form={form}
              set={set}
              options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
            />
          </div>
        )}

        {s.key === 'contact' && (
          <div className="space-y-4">
            <Field label="Street address" k="address" form={form} set={set} placeholder="123 Main St, Suite 4" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" k="city" form={form} set={set} />
              <Field label="State" k="state" form={form} set={set} placeholder="NY" />
              <Field label="ZIP" k="zip" form={form} set={set} placeholder="10001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business phone" k="phone" form={form} set={set} placeholder="(555) 123-4567" />
              <Field label="Business email" k="email" form={form} set={set} placeholder="hello@yourbiz.com" />
            </div>
            <Field label="Website" k="websiteUrl" form={form} set={set} placeholder="https://yourbiz.com" />
            <Field label="Business hours" k="businessHours" form={form} set={set} placeholder="Mon–Fri 8am–6pm" />
          </div>
        )}

        {s.key === 'website' && (
          <WebsiteStep website={website} saving={websiteSaving} onToggle={toggleWebsiteField} />
        )}

        {s.key === 'brand' && (
          <div className="space-y-4">
            <Field label="Logo URL" k="logoUrl" form={form} set={set} placeholder="https://…/logo.png" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color" k="primaryColor" form={form} set={set} placeholder="#0d9488" />
              <Field label="Secondary color" k="secondaryColor" form={form} set={set} placeholder="#0f172a" />
            </div>
            <Field label="Tagline" k="tagline" form={form} set={set} placeholder="Spotless homes, every time." />
            <Textarea label="What your business does (for your site + AI)" k="businessDescription" form={form} set={set} />
            <Textarea label="Your story (optional)" k="businessStory" form={form} set={set} />
          </div>
        )}

        {s.key === 'compliance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trade license #" k="licenseNumber" form={form} set={set} />
              <Field label="License state" k="licenseState" form={form} set={set} placeholder="NY" />
            </div>
            <Field label="License expiry" k="licenseExpiry" form={form} set={set} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Insurance carrier" k="insuranceCarrier" form={form} set={set} />
              <Field label="Policy #" k="insurancePolicy" form={form} set={set} />
            </div>
            <Field label="Coverage amount" k="insuranceCoverage" form={form} set={set} placeholder="$1,000,000" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={!!form.bonded} onChange={(e) => set('bonded', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              We are bonded
            </label>
          </div>
        )}

        {s.key === 'import' && (
          <div className="space-y-3">
            {IMPORTS.map((imp) => (
              <a key={imp.href} href={imp.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-teal-400">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{imp.title}</span>
                  <span className="block text-xs text-slate-500">{imp.desc}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">Open</span>
              </a>
            ))}
            <p className="text-xs text-slate-400">Each opens its own importer. Come back and hit Finish when you&apos;re done — you can always import more later.</p>
          </div>
        )}

        {s.key === 'social' && (
          <div className="space-y-4">
            <Field label="Google review link" k="googleReviewLink" form={form} set={set} placeholder="https://g.page/r/…" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facebook" k="facebookUrl" form={form} set={set} />
              <Field label="Instagram" k="instagramUrl" form={form} set={set} />
              <Field label="TikTok" k="tiktokUrl" form={form} set={set} />
              <Field label="LinkedIn" k="linkedinUrl" form={form} set={set} />
              <Field label="YouTube" k="youtubeUrl" form={form} set={set} />
              <Field label="X / Twitter" k="xUrl" form={form} set={set} />
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => (step === 0 ? router.push('/dashboard') : goto(step - 1))}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveDraft(false)}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save for later'}
          </button>
          {step < STEPS.length - 1 ? (
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

/* ---- website setup step ---- */
function WebsiteStep({
  website,
  saving,
  onToggle,
}: {
  website: WebsiteStatus | null
  saving: boolean
  onToggle: (k: 'website_published' | 'enable_legacy_seo_pages', v: boolean) => void
}) {
  if (!website) return <p className="text-sm text-slate-400">Loading…</p>

  const checks = [
    { label: 'Domain configured', done: !!(website.domain || website.domain_name), detail: website.domain || website.domain_name || 'No domain set' },
    { label: 'DNS configured', done: website.dns_configured, detail: website.dns_configured ? 'DNS records verified' : 'DNS not configured — point your domain to Vercel' },
    { label: 'Email domain verified', done: website.email_domain_verified, detail: website.email_domain_verified ? 'Emails send from your domain' : 'Not verified — emails send from default domain' },
    { label: 'Website published', done: website.website_published, detail: website.website_published ? 'Your website is live' : 'Website not yet published' },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${check.done ? 'border border-green-300 bg-green-50' : 'border border-slate-300'}`}>
              {check.done && (
                <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm ${check.done ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}`}>{check.label}</p>
              <p className="text-xs text-slate-400">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {website.website_url && (
        <a href={website.website_url} target="_blank" rel="noopener noreferrer" className="block text-sm text-teal-600 underline hover:text-teal-700">
          {website.website_url}
        </a>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <ToggleRow
          label="Site published"
          helper="When off, public visits to your domain return a placeholder."
          checked={website.website_published}
          disabled={saving}
          onChange={(v) => onToggle('website_published', v)}
        />
        <ToggleRow
          label="Legacy SEO pages enabled"
          helper="Renders the area × service long-tail pages copied from your source site."
          checked={website.enable_legacy_seo_pages}
          disabled={saving}
          onChange={(v) => onToggle('enable_legacy_seo_pages', v)}
        />
      </div>
      <p className="text-xs text-slate-400">DNS and domain setup are configured by your admin — reach out if either needs to change.</p>
    </div>
  )
}

function ToggleRow({ label, helper, checked, disabled, onChange }: { label: string; helper?: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {helper && <span className="mt-0.5 block text-xs text-slate-400">{helper}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 translate-y-0.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

/* ---- field primitives ---- */
function Field({ label, k, form, set, placeholder, type = 'text' }: { label: string; k: string; form: Profile; set: (k: string, v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={(form[k] as string) || ''}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}

function Textarea({ label, k, form, set }: { label: string; k: string; form: Profile; set: (k: string, v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={(form[k] as string) || ''}
        onChange={(e) => set(k, e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}

function Select({ label, k, form, set, options }: { label: string; k: string; form: Profile; set: (k: string, v: string | number) => void; options: (string | { label: string; value: string | number })[] }) {
  const norm = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={(form[k] as string | number) ?? ''}
        onChange={(e) => set(k, e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Select…</option>
        {norm.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
