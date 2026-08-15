'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { validateEmail } from '@/lib/validate-email'
import { formatPhone } from '@/lib/format'
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-sources'
import SmsConsent from '@/app/site/template/_components/SmsConsent'
import { useSpamGuard, Honeypot } from '@/hooks/useSpamGuard'

interface ServiceOption {
  name: string
  rate: number
  default_hours: number
}

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'] as const

export default function BookNewForm({
  services,
  businessName,
  primaryColor,
  phone,
  selfBookDiscountCents,
}: {
  services: ServiceOption[]
  businessName: string
  primaryColor: string
  phone: string
  selfBookDiscountCents: number
}) {
  const { honeypotRef, getSpamGuardFields } = useSpamGuard()
  const discountDollars = selfBookDiscountCents / 100
  const defaultService = services[0]

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    service_type: defaultService?.name || '',
    date: '',
    time: '10:00 AM',
    notes: '',
    lead_source: '',
  })
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string; address?: string; date?: string; lead_source?: string }>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [done, setDone] = useState(false)
  const [pin, setPin] = useState('')
  const [smsOptIn, setSmsOptIn] = useState(false)
  const policyRef = useRef<HTMLDivElement | null>(null)

  const selectedService = services.find((s) => s.name === form.service_type)
  const hourlyRate = selectedService?.rate ?? 0
  const estimatedHours = Math.max(1, selectedService?.default_hours ?? 1)
  const estimatedTotal = hourlyRate * estimatedHours

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateForm(): typeof fieldErrors {
    const errors: typeof fieldErrors = {}
    if (!form.name.trim()) errors.name = 'Please enter your name.'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a valid phone number.'
    const emailCheck = validateEmail(form.email)
    if (!emailCheck.valid) errors.email = emailCheck.error || 'Please enter a valid email.'
    if (!form.address.trim()) errors.address = 'Please enter your address.'
    if (!form.date) errors.date = 'Please choose a date.'
    if (!form.lead_source) errors.lead_source = 'Please tell us how you found us.'
    return errors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const errors = validateForm()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setError('Please fix the highlighted fields below.'); return }
    setShowRecap(true)
  }

  async function handleConfirmSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/client/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          unit: form.unit.trim(),
          service_type: form.service_type,
          date: form.date,
          time: form.time,
          notes: form.notes.trim(),
          hourly_rate: hourlyRate > 0 ? hourlyRate : undefined,
          estimated_hours: estimatedHours,
          lead_source: form.lead_source,
          self_book: true,
          self_book_discount_cents: selfBookDiscountCents,
          sms_opt_in: smsOptIn,
          client_confirmed: true,
          confirmed_at: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          ...getSpamGuardFields(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError((data && data.error) || 'Something went wrong. Please try again or text us.')
        setSubmitting(false)
        setShowRecap(false)
        return
      }
      if (data?.clients?.pin) setPin(data.clients.pin)
      setShowRecap(false)
      setDone(true)
    } catch {
      setError(`Network error. Please try again or call ${phone}.`)
      setSubmitting(false)
      setShowRecap(false)
    }
  }

  const labelCls = 'block text-xs font-semibold text-zinc-400 tracking-widest uppercase mb-2'
  const inputCls = 'w-full px-3 py-2.5 bg-[#141414] border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent transition'
  const brandStyle = { ['--brand' as string]: primaryColor } as React.CSSProperties

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16" style={brandStyle}>
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl bg-green-400/10 text-green-400">✓</div>
          <div className="inline-block bg-amber-400/10 text-amber-400 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3">Pending Confirmation</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Request submitted.</h1>
          <p className="text-zinc-400 text-sm mb-6">
            This isn&rsquo;t finalized yet — {businessName} reviews and confirms shortly. You&rsquo;ll get a text/email locking in your date and time. Your <strong className="text-green-400">${discountDollars} self-booking discount</strong> is noted on your request.
          </p>
          {pin && (
            <div className="rounded-lg p-4 mb-6 border border-zinc-700 bg-[#0A0A0A]">
              <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">Your PIN</p>
              <p className="text-3xl font-bold tracking-widest text-white">{pin}</p>
            </div>
          )}
          <Link href="/" className="inline-block text-black px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90" style={{ backgroundColor: primaryColor }}>Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] py-10 md:py-16 px-4" style={brandStyle}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 bg-green-400/10 text-green-400">
              Book online &amp; save ${discountDollars}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">Book your service.</h1>
            <p className="text-zinc-400 text-sm">Skip the call — fill this out and {businessName} confirms your time. Self-bookers save <span className="font-semibold text-green-400">${discountDollars}</span>.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-[#111111] rounded-2xl shadow-xl p-6 md:p-8 space-y-5 border border-zinc-800">
            <Honeypot inputRef={honeypotRef} />

            {services.length > 1 ? (
              <div>
                <label className={labelCls}>Service</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {services.map((s) => {
                    const active = form.service_type === s.name
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => update('service_type', s.name)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${active ? 'text-black border-transparent' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
                        style={active ? { backgroundColor: primaryColor } : undefined}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Service</label>
                <div className="px-3 py-2.5 rounded-lg border border-zinc-700 bg-[#141414] text-sm text-white">{defaultService?.name || 'Pest Control'}</div>
              </div>
            )}

            {hourlyRate > 0 && (
              <div className="bg-[#141414] border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 tracking-widest uppercase">Estimate</p>
                  <p className="text-xs text-zinc-400 mt-0.5">${hourlyRate}/hr &middot; {estimatedHours}-hour minimum &middot; billed for actual time worked</p>
                  <p className="text-xs text-green-400 font-semibold mt-1">&minus;${discountDollars} self-booking discount noted at billing</p>
                </div>
                <p className="text-2xl font-bold tracking-wide text-white">~${estimatedTotal}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" required min={minDate} value={form.date} onChange={(e) => { update('date', e.target.value); setFieldErrors((prev) => ({ ...prev, date: undefined })) }} className={`${inputCls} ${fieldErrors.date ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                {fieldErrors.date && <p className="text-red-400 text-xs mt-1">{fieldErrors.date}</p>}
              </div>
              <div>
                <label className={labelCls}>Preferred time</label>
                <select value={form.time} onChange={(e) => update('time', e.target.value)} className={inputCls}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" required placeholder="First and last" value={form.name} onChange={(e) => { update('name', e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })) }} className={`${inputCls} ${fieldErrors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" required placeholder="(212) 555-1234" value={form.phone} onChange={(e) => { update('phone', formatPhone(e.target.value)); setFieldErrors((prev) => ({ ...prev, phone: undefined })) }} className={`${inputCls} ${fieldErrors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
              </div>
            </div>

            <SmsConsent businessName={businessName} checked={smsOptIn} onChange={setSmsOptIn} />

            <div>
              <label className={labelCls}>Email</label>
              <input type="email" required placeholder="Enter your email" value={form.email} onChange={(e) => { update('email', e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })) }} className={`${inputCls} ${fieldErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <AddressAutocomplete value={form.address} onChange={(v) => { update('address', v); setFieldErrors((prev) => ({ ...prev, address: undefined })) }} placeholder="Start typing your street..." className={`${inputCls} ${fieldErrors.address ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {fieldErrors.address && <p className="text-red-400 text-xs mt-1">{fieldErrors.address}</p>}
              <input type="text" placeholder="Apt / Unit (optional)" value={form.unit} onChange={(e) => update('unit', e.target.value)} className={`${inputCls} mt-2`} />
            </div>

            <div>
              <label className={labelCls}>How did you hear about us?</label>
              <select value={form.lead_source} onChange={(e) => { update('lead_source', e.target.value); setFieldErrors((prev) => ({ ...prev, lead_source: undefined })) }} className={`${inputCls} ${fieldErrors.lead_source ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                <option value="">Select one...</option>
                {LEAD_SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {fieldErrors.lead_source && <p className="text-red-400 text-xs mt-1">{fieldErrors.lead_source}</p>}
            </div>

            <div>
              <label className={labelCls}>Anything we should know?</label>
              <textarea rows={2} placeholder="Access, pest details, focus areas..." value={form.notes} onChange={(e) => update('notes', e.target.value)} className={`${inputCls} resize-none`} />
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

            <div ref={policyRef} className="bg-[#141414] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 leading-relaxed">
              No payment now &middot; billed for actual time worked &middot; you&rsquo;ll review &amp; confirm the recap on the next step &middot; or call {phone}
            </div>

            <button type="submit" disabled={submitting} className="w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90 disabled:opacity-50 text-black" style={{ backgroundColor: primaryColor }}>
              {submitting ? 'Submitting…' : 'Review & book'}
            </button>
          </form>
        </div>
      </div>

      {showRecap && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto">
            <h2 className="text-xl font-bold tracking-tight mb-1 text-white">Confirm your request</h2>
            <p className="text-xs text-zinc-500 mb-4">Review the details — clicking Confirm sends it to {businessName}.</p>
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4 mb-4 text-sm space-y-1.5 text-zinc-200">
              <div><span className="text-zinc-500">Service:</span> {form.service_type}</div>
              <div><span className="text-zinc-500">When:</span> {form.date} @ {form.time}</div>
              <div><span className="text-zinc-500">Address:</span> {form.address}{form.unit ? `, ${form.unit}` : ''}</div>
              {hourlyRate > 0 && <div><span className="text-zinc-500">Rate:</span> ${hourlyRate}/hr &times; {estimatedHours}-hour minimum &middot; ~${estimatedTotal} estimate</div>}
              <div className="pt-1 border-t border-zinc-800"><span className="text-zinc-500">Discount:</span> <span className="font-semibold text-green-400">${discountDollars} self-booking discount noted</span></div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowRecap(false)} disabled={submitting} className="flex-1 bg-zinc-800 text-zinc-200 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-zinc-700 transition disabled:opacity-50">Back</button>
              <button type="button" onClick={handleConfirmSubmit} disabled={submitting} className="flex-1 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90 disabled:opacity-50 text-black" style={{ backgroundColor: primaryColor }}>{submitting ? 'Confirming…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
