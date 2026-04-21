'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Business = {
  id: string
  name: string
  industry: string
  slug: string
  phone: string | null
  email: string | null
  website_url: string | null
  domain_name: string | null
  address: string | null
  tagline: string | null
  primary_color: string
  secondary_color: string | null
  business_hours: string | null
  payment_methods: string[] | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  stripe_api_key: string | null
  stripe_account_id: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  resend_api_key: string | null
  resend_domain: string | null
  email_from: string | null
  anthropic_api_key: string | null
  selena_config: Record<string, unknown> | null
  setup_progress: Record<string, boolean>
}

type VerifyCheck = { ok: boolean; detail: string }
type VerifyResponse = {
  dns_a?: VerifyCheck
  dns_cname_www?: VerifyCheck
  mx_records?: VerifyCheck
  ssl_active?: VerifyCheck
  resend_domain_verified?: VerifyCheck
  telnyx_number_active?: VerifyCheck
  stripe_account?: VerifyCheck
  stripe_webhook_configured?: VerifyCheck
}

const STEPS = [
  { key: 'business', label: 'Business', sub: 'Name, industry, contact' },
  { key: 'services', label: 'Services', sub: 'Offerings, hours, pricing' },
  { key: 'selena', label: 'Selena AI', sub: 'Voice & persona' },
  { key: 'integrations', label: 'Integrations', sub: 'Stripe, Telnyx, Resend' },
  { key: 'team', label: 'Team', sub: 'Members & payouts' },
  { key: 'verify', label: 'Verify & Launch', sub: 'Checks + invite owner' },
] as const

type StepKey = (typeof STEPS)[number]['key']

export default function OnboardingWizardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const tenantId = params.id

  const [biz, setBiz] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<StepKey>('business')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Business step
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [address, setAddress] = useState('')
  const [tagline, setTagline] = useState('')

  // Services step
  const [serviceAreasText, setServiceAreasText] = useState('')
  const [businessHours, setBusinessHours] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['zelle', 'credit_card', 'cash'])

  // Selena step
  const [aiName, setAiName] = useState('Selena')
  const [tone, setTone] = useState('warm_friendly')
  const [language, setLanguage] = useState('en')
  const [emojiUsage, setEmojiUsage] = useState('one_per_message')

  // Integrations step
  const [stripeKey, setStripeKey] = useState('')
  const [stripeAcct, setStripeAcct] = useState('')
  const [telnyxKey, setTelnyxKey] = useState('')
  const [telnyxPhone, setTelnyxPhone] = useState('')
  const [resendKey, setResendKey] = useState('')
  const [resendDomain, setResendDomain] = useState('')
  const [emailFrom, setEmailFrom] = useState('')

  // Team step (link out)
  // Verify step
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/businesses/${tenantId}`)
      .then(r => r.json())
      .then(data => {
        const b: Business = data.business || data
        setBiz(b)
        setName(b.name || '')
        setPhone(b.phone || '')
        setEmail(b.email || '')
        setDomain(b.domain_name || '')
        setAddress(b.address || '')
        setTagline(b.tagline || '')
        setBusinessHours(b.business_hours || '')
        setPaymentMethods(Array.isArray(b.payment_methods) ? b.payment_methods : ['zelle', 'credit_card', 'cash'])
        const cfg = (b.selena_config || {}) as Record<string, unknown>
        setAiName((cfg.ai_name as string) || 'Selena')
        setTone((cfg.tone as string) || 'warm_friendly')
        setLanguage((cfg.language as string) || 'en')
        setEmojiUsage((cfg.emoji_usage as string) || 'one_per_message')
        if (Array.isArray(cfg.service_areas)) setServiceAreasText((cfg.service_areas as string[]).join('\n'))
        setStripeAcct(b.stripe_account_id || '')
        setTelnyxPhone(b.telnyx_phone || '')
        setResendDomain(b.resend_domain || '')
        setEmailFrom(b.email_from || '')
        setOwnerEmail(b.owner_email || '')
        setOwnerName(b.owner_name || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tenantId])

  useEffect(() => { load() }, [load])

  async function patchBusiness(updates: Record<string, unknown>, markStep?: StepKey) {
    setErr(''); setMsg('')
    const current = biz?.setup_progress || {}
    const body: Record<string, unknown> = { ...updates }
    if (markStep) body.setup_progress = { ...current, [`wizard_${markStep}`]: true }
    const res = await fetch(`/api/admin/businesses/${tenantId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Save failed')
    }
    return res.json()
  }

  async function saveBusinessStep(next: boolean) {
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true)
    try {
      await patchBusiness({
        name, phone: phone || null, email: email || null,
        domain_name: domain || null, address: address || null, tagline: tagline || null,
      }, 'business')
      setMsg('Saved')
      if (next) setStep('services')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function saveServicesStep(next: boolean) {
    setSaving(true)
    try {
      const areas = serviceAreasText.split('\n').map(s => s.trim()).filter(Boolean)
      const currentCfg = (biz?.selena_config || {}) as Record<string, unknown>
      await patchBusiness({
        business_hours: businessHours || null,
        payment_methods: paymentMethods,
        selena_config: { ...currentCfg, service_areas: areas },
      }, 'services')
      setMsg('Saved')
      if (next) setStep('selena')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function saveSelenaStep(next: boolean) {
    setSaving(true)
    try {
      const currentCfg = (biz?.selena_config || {}) as Record<string, unknown>
      await patchBusiness({
        selena_config: { ...currentCfg, ai_name: aiName, tone, language, emoji_usage: emojiUsage },
      }, 'selena')
      setMsg('Saved')
      if (next) setStep('integrations')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function saveIntegrationsStep(next: boolean) {
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {}
      if (stripeKey) updates.stripe_api_key = stripeKey
      if (stripeAcct) updates.stripe_account_id = stripeAcct
      if (telnyxKey) updates.telnyx_api_key = telnyxKey
      if (telnyxPhone) updates.telnyx_phone = telnyxPhone
      if (resendKey) updates.resend_api_key = resendKey
      if (resendDomain) updates.resend_domain = resendDomain
      if (emailFrom) updates.email_from = emailFrom
      await patchBusiness(updates, 'integrations')
      setMsg('Saved')
      if (next) setStep('team')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function runVerify() {
    setVerifying(true); setErr('')
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/verify-checklist`, { method: 'POST' })
      const data = await res.json()
      setVerifyData(data)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setVerifying(false)
  }

  async function inviteOwner() {
    if (!ownerEmail) { setErr('Owner email required'); return }
    setInviting(true); setErr('')
    try {
      await patchBusiness({ owner_email: ownerEmail, owner_name: ownerName }, 'verify')
      const res = await fetch('/api/admin/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, email: ownerEmail, role: 'owner' }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      await patchBusiness({}, 'verify')
      setMsg(`Owner invite sent to ${ownerEmail}`)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setInviting(false)
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!biz) return <div className="p-8 text-slate-500 text-sm">Tenant not found.</div>

  const completed = biz.setup_progress || {}
  const completedCount = STEPS.filter(s => completed[`wizard_${s.key}`]).length
  const pct = Math.round((completedCount / STEPS.length) * 100)

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/admin/businesses/${tenantId}`} className="text-xs text-slate-500 hover:underline">← Back to business profile</Link>
      <div className="flex items-start justify-between flex-wrap gap-3 mt-1 mb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Onboarding Wizard</h1>
          <p className="text-sm text-slate-500">{biz.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase">Progress</p>
          <p className="text-2xl font-bold text-teal-700">{pct}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Step list */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
        {STEPS.map((s, i) => {
          const done = !!completed[`wizard_${s.key}`]
          const active = step === s.key
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`p-3 rounded-lg text-left border transition-colors ${
                active ? 'border-teal-500 bg-teal-50' :
                done ? 'border-green-200 bg-green-50' :
                'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  done ? 'bg-green-600 text-white' : active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>{done ? '✓' : i + 1}</span>
                <p className="text-xs font-semibold text-slate-900">{s.label}</p>
              </div>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </button>
          )
        })}
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* Step content */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        {step === 'business' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Business basics</h2>
            <Field label="Business name *">
              <input value={name} onChange={e => setName(e.target.value)} className="input" />
            </Field>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className="input" /></Field>
              <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} className="input" /></Field>
            </div>
            <Field label="Domain (e.g., example.com)"><input value={domain} onChange={e => setDomain(e.target.value)} className="input" placeholder="mycompany.com" /></Field>
            <Field label="Address"><input value={address} onChange={e => setAddress(e.target.value)} className="input" /></Field>
            <Field label="Tagline"><input value={tagline} onChange={e => setTagline(e.target.value)} className="input" placeholder="Trusted cleaning pros" /></Field>
            <StepFooter saving={saving} onSave={() => saveBusinessStep(false)} onNext={() => saveBusinessStep(true)} />
          </div>
        )}

        {step === 'services' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Services, areas, hours</h2>
            <p className="text-xs text-slate-500 mb-3">
              Services themselves are seeded per-industry by the provisioner. Edit the full list in{' '}
              <Link href={`/admin/businesses/${tenantId}#services`} className="text-teal-600 hover:underline">business profile</Link>.
            </p>
            <Field label="Service areas (one per line)">
              <textarea value={serviceAreasText} onChange={e => setServiceAreasText(e.target.value)} rows={4} className="input" placeholder="Manhattan&#10;Brooklyn&#10;Queens" />
            </Field>
            <Field label="Business hours (free text)">
              <input value={businessHours} onChange={e => setBusinessHours(e.target.value)} className="input" placeholder="Mon-Fri 8am-6pm, Sat 9am-3pm" />
            </Field>
            <Field label="Payment methods">
              <div className="flex gap-2 flex-wrap">
                {['zelle', 'venmo', 'apple_pay', 'credit_card', 'cash', 'check', 'bank_transfer'].map(pm => (
                  <label key={pm} className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm">
                    <input
                      type="checkbox"
                      checked={paymentMethods.includes(pm)}
                      onChange={e => {
                        if (e.target.checked) setPaymentMethods([...paymentMethods, pm])
                        else setPaymentMethods(paymentMethods.filter(x => x !== pm))
                      }}
                    />
                    <span>{pm}</span>
                  </label>
                ))}
              </div>
            </Field>
            <StepFooter saving={saving} onSave={() => saveServicesStep(false)} onNext={() => saveServicesStep(true)} />
          </div>
        )}

        {step === 'selena' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Selena AI persona</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="AI name"><input value={aiName} onChange={e => setAiName(e.target.value)} className="input" /></Field>
              <Field label="Language">
                <select value={language} onChange={e => setLanguage(e.target.value)} className="input">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="bilingual">Bilingual (detect per-client)</option>
                </select>
              </Field>
              <Field label="Tone">
                <select value={tone} onChange={e => setTone(e.target.value)} className="input">
                  <option value="warm_friendly">Warm &amp; friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="concise">Concise &amp; direct</option>
                </select>
              </Field>
              <Field label="Emoji usage">
                <select value={emojiUsage} onChange={e => setEmojiUsage(e.target.value)} className="input">
                  <option value="none">None</option>
                  <option value="one_per_message">One per message</option>
                  <option value="liberal">Liberal</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Full persona editing (Q&amp;A bank, escalation rules, booking flow) lives in{' '}
              <Link href={`/admin/businesses/${tenantId}/selena-persona`} className="text-teal-600 hover:underline">Selena persona →</Link>
            </p>
            <StepFooter saving={saving} onSave={() => saveSelenaStep(false)} onNext={() => saveSelenaStep(true)} />
          </div>
        )}

        {step === 'integrations' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Integration keys</h2>
            <p className="text-xs text-amber-700 mb-3">
              Keys entered here are encrypted at rest. Fields left blank keep existing values. Last-4 of existing keys shown as placeholders.
            </p>

            <h3 className="font-semibold text-sm text-slate-900 mt-3">Stripe</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label={`Secret key${biz.stripe_api_key ? ' (saved)' : ''}`}>
                <input type="password" value={stripeKey} onChange={e => setStripeKey(e.target.value)} className="input" placeholder={biz.stripe_api_key ? '●●●●●●●●' : 'sk_live_...'} />
              </Field>
              <Field label="Connect account ID">
                <input value={stripeAcct} onChange={e => setStripeAcct(e.target.value)} className="input" placeholder="acct_..." />
              </Field>
            </div>

            <h3 className="font-semibold text-sm text-slate-900 mt-3">Telnyx</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label={`API key${biz.telnyx_api_key ? ' (saved)' : ''}`}>
                <input type="password" value={telnyxKey} onChange={e => setTelnyxKey(e.target.value)} className="input" placeholder={biz.telnyx_api_key ? '●●●●●●●●' : 'KEY...'} />
              </Field>
              <Field label="Phone number (E.164)">
                <input value={telnyxPhone} onChange={e => setTelnyxPhone(e.target.value)} className="input" placeholder="+12125551212" />
              </Field>
            </div>

            <h3 className="font-semibold text-sm text-slate-900 mt-3">Resend</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label={`API key${biz.resend_api_key ? ' (saved)' : ''}`}>
                <input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)} className="input" placeholder={biz.resend_api_key ? '●●●●●●●●' : 're_...'} />
              </Field>
              <Field label="Verified domain">
                <input value={resendDomain} onChange={e => setResendDomain(e.target.value)} className="input" placeholder="mycompany.com" />
              </Field>
              <Field label="From address">
                <input value={emailFrom} onChange={e => setEmailFrom(e.target.value)} className="input" placeholder="hello@mycompany.com" />
              </Field>
            </div>

            <StepFooter saving={saving} onSave={() => saveIntegrationsStep(false)} onNext={() => saveIntegrationsStep(true)} />
          </div>
        )}

        {step === 'team' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Team members</h2>
            <p className="text-sm text-slate-600 mb-3">
              Add team members from the tenant&apos;s Team page. Each needs name + phone. 1099 tax info gets captured at year-end for payroll prep.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/team?impersonate=${tenantId}`} className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
                Open Team page →
              </Link>
              <button
                onClick={async () => {
                  setSaving(true)
                  try {
                    await patchBusiness({}, 'team')
                    setMsg('Marked complete')
                    setStep('verify')
                    load()
                  } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
                  setSaving(false)
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"
              >Mark complete &amp; continue →</button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Verify &amp; launch</h2>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Run live checks against DNS, SSL, Resend, Telnyx, and Stripe.</p>
              <button onClick={runVerify} disabled={verifying}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                {verifying ? 'Checking…' : 'Run checks'}
              </button>
            </div>

            {verifyData && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                {(Object.entries(verifyData) as Array<[string, VerifyCheck]>).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span className={v.ok ? 'text-green-600' : 'text-red-600'}>{v.ok ? '✓' : '✗'}</span>
                    <span className="text-slate-900 font-medium">{k.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 text-xs">{v.detail}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-sm text-slate-900 mb-3">Invite the owner</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <Field label="Owner name"><input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="input" /></Field>
                <Field label="Owner email"><input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className="input" placeholder="owner@example.com" /></Field>
              </div>
              <button
                onClick={inviteOwner}
                disabled={inviting || !ownerEmail}
                className="w-full md:w-auto px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              >{inviting ? 'Sending invite…' : 'Send owner invite & mark launched'}</button>
            </div>

            <div className="pt-4 flex justify-between">
              <button onClick={() => setStep('team')} className="text-xs text-slate-500 hover:underline">← Back</button>
              <button
                onClick={() => router.push(`/admin/businesses/${tenantId}`)}
                className="text-xs text-slate-500 hover:underline"
              >Close wizard</button>
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .input { width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 uppercase mb-1">{label}</span>
      {children}
    </label>
  )
}

function StepFooter({ saving, onSave, onNext }: { saving: boolean; onSave: () => void; onNext: () => void }) {
  return (
    <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
      <button onClick={onSave} disabled={saving}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save draft'}
      </button>
      <button onClick={onNext} disabled={saving}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save & continue →'}
      </button>
    </div>
  )
}
