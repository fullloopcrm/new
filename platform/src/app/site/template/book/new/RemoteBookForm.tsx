'use client'

/**
 * Booking intake for REMOTE, retainer-style service tenants (e.g. virtual
 * assistants) — no physical address, no single appointment slot. Captures the
 * service, hours + cadence (one-time / weekly / bi-weekly / monthly), a start
 * date, timezone, and scope. Shared/config-driven: the server page renders this
 * instead of the on-site cleaning form when the tenant's industry is remote.
 */
import { useState } from 'react'
import type { ServiceOption } from '../../_config/types'
import SmsConsent from '../../_components/SmsConsent'
import { useSpamGuard, Honeypot } from '@/hooks/useSpamGuard'

const CADENCE: { value: string; label: string }[] = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const ZONES = ['Eastern (ET)', 'Central (CT)', 'Mountain (MT)', 'Pacific (PT)', 'Other']

export default function RemoteBookForm({ services, businessName }: { services: ServiceOption[]; businessName: string }) {
  const active = services.filter(s => !s.emergency)
  const [smsConsent, setSmsConsent] = useState(false)
  const [form, setForm] = useState({
    service_type: active[0]?.value ?? '',
    hours: '10',
    cadence: 'weekly',
    date: '',
    timezone: 'Eastern (ET)',
    scope: '',
    name: '',
    email: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string; service_type?: string; date?: string }>({})
  const { honeypotRef, getSpamGuardFields } = useSpamGuard()

  const set = (k: keyof typeof form, v: string) => { setForm(p => ({ ...p, [k]: v })); setFieldErrors(prev => ({ ...prev, [k]: undefined })) }
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  function validateForm(): typeof fieldErrors {
    const errors: typeof fieldErrors = {}
    if (!form.name.trim()) errors.name = 'Please enter your name.'
    if (!form.email.trim()) errors.email = 'Please enter your email.'
    if (!form.phone.trim()) errors.phone = 'Please enter your phone number.'
    if (!form.service_type) errors.service_type = 'Please choose a service.'
    if (!form.date) errors.date = 'Please choose a start date.'
    return errors
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // Show every missing/invalid field at once so the client knows exactly
    // what's blocking their request, instead of one gate per resubmit.
    const errors = validateForm()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setError('Please fix the highlighted fields below.'); return }
    const cadenceLabel = CADENCE.find(c => c.value === form.cadence)?.label ?? 'One-time'
    const notes = [
      `Plan: ${form.hours} hrs / ${cadenceLabel.toLowerCase()}`,
      `Timezone: ${form.timezone}`,
      form.scope.trim() ? `Scope: ${form.scope.trim()}` : '',
    ].filter(Boolean).join(' — ')

    setSubmitting(true)
    try {
      const res = await fetch('/api/client/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          service_type: form.service_type,
          date: form.date,
          estimated_hours: Number(form.hours) || 10,
          recurring_type: form.cadence || undefined,
          notes,
          sms_opt_in: smsConsent,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          src: 'remote-book',
          ...getSpamGuardFields(),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Something went wrong. Please try again.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">You&rsquo;re all set — we&rsquo;ll be in touch</h1>
        <p className="text-sm text-slate-600 leading-relaxed">We got your request and a real person is reviewing it. We&rsquo;ll reach out shortly to confirm your plan and get your assistant started.</p>
      </div>
    )
  }

  const label = 'block text-xs font-semibold text-slate-500 tracking-widest uppercase mb-2'
  const input = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-600'

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto my-12 px-4 space-y-6">
      <Honeypot inputRef={honeypotRef} />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Start your plan</h1>
        <p className="text-sm text-slate-500">Tell us what you need and how often. No appointment or address needed — your assistant works remotely.</p>
      </div>

      <div>
        <label className={label}>Service</label>
        <select value={form.service_type} onChange={e => set('service_type', e.target.value)} className={`${input} ${fieldErrors.service_type ? 'border-red-400 ring-1 ring-red-300' : ''}`} required>
          {active.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
        </select>
        {fieldErrors.service_type && <p className="text-red-600 text-xs mt-1">{fieldErrors.service_type}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Hours</label>
          <input type="number" min={1} value={form.hours} onChange={e => set('hours', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>How often</label>
          <select value={form.cadence} onChange={e => set('cadence', e.target.value)} className={input}>
            {CADENCE.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Start date</label>
          <input type="date" min={minDate} value={form.date} onChange={e => set('date', e.target.value)} className={`${input} ${fieldErrors.date ? 'border-red-400 ring-1 ring-red-300' : ''}`} required />
          {fieldErrors.date && <p className="text-red-600 text-xs mt-1">{fieldErrors.date}</p>}
        </div>
        <div>
          <label className={label}>Your timezone</label>
          <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={input}>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>What do you need help with?</label>
        <textarea value={form.scope} onChange={e => set('scope', e.target.value)} rows={3} className={input + ' resize-y'} placeholder="e.g. inbox + calendar management, 20 hrs/week, tools you use…" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={`${input} ${fieldErrors.name ? 'border-red-400 ring-1 ring-red-300' : ''}`} required />
          {fieldErrors.name && <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className={label}>Phone</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={`${input} ${fieldErrors.phone ? 'border-red-400 ring-1 ring-red-300' : ''}`} required />
          {fieldErrors.phone && <p className="text-red-600 text-xs mt-1">{fieldErrors.phone}</p>}
        </div>
      </div>
      <div>
        <label className={label}>Email</label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={`${input} ${fieldErrors.email ? 'border-red-400 ring-1 ring-red-300' : ''}`} required />
        {fieldErrors.email && <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>}
      </div>

      <SmsConsent businessName={businessName} checked={smsConsent} onChange={setSmsConsent} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">
        {submitting ? 'Sending…' : 'Request my assistant →'}
      </button>
    </form>
  )
}
