'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { validateEmail } from '@/lib/validate-email'
import { formatPhone } from '@/lib/format'
import type { SiteConfig } from '../../_config/types'

/**
 * Trade-agnostic standard booking form. Config-driven (services, theme,
 * contact all come from the tenant's SiteConfig) so any vertical can book
 * without cleaning-specific pricing, cleaner-picking, or supplies logic.
 *
 * This is the FOUNDATION form the sales/booking strategy extends later
 * (recurring, deposits, per-service mode). The cleaning-specific form at
 * /book/new stays untouched and live.
 *
 * The $10 self-booking discount is kept as the conversion hook. It is shown
 * to the client and flagged on the payload (self_book_discount_cents); it is
 * NOT yet auto-applied to the final bill — that is the payments phase.
 */

// Slots match the booking API's time map (9AM–4PM). Do not add 8AM here — the
// API silently floors unknown labels to 9AM.
const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'] as const

const SELF_BOOK_DISCOUNT_CENTS = 1000

function trackEvent(action: string, sessionId: string, extra: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({
      domain: typeof window !== 'undefined' ? window.location.hostname : '',
      page: '/book/standard',
      action,
      session_id: sessionId,
      ...extra,
    })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {}
}

function StandardBookContent({ config }: { config: SiteConfig }) {
  const { services, theme, contact, identity } = config
  const primary = theme.primary
  const accent = theme.accent

  const standardValue = services.find((s) => !s.emergency)?.value ?? services[0]?.value ?? 'Standard Service'

  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const srcDomain = searchParams.get('src') || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    service_type: standardValue as string,
    date: '',
    time: '10:00 AM',
    notes: '',
  })
  const [emailErr, setEmailErr] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [done, setDone] = useState(false)
  const [pin, setPin] = useState('')

  const sessionIdRef = useRef<string>('')
  const startedRef = useRef(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    sessionIdRef.current = `sb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    startedRef.current = true
    trackEvent('form_start', sessionIdRef.current, { ref_code: refCode || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) { setError('Please enter a valid phone number.'); return }
    const emailCheck = validateEmail(form.email)
    if (!emailCheck.valid) { setEmailErr(emailCheck.error || 'Invalid email'); setError('Please enter a valid email.'); return }
    setEmailErr('')
    if (!form.address.trim()) { setError('Please enter your address.'); return }
    if (!form.date) { setError('Please choose a date.'); return }
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
          self_book: true,
          self_book_discount_cents: SELF_BOOK_DISCOUNT_CENTS,
          ref_code: refCode || null,
          src: srcDomain || null,
          client_confirmed: true,
          confirmed_at: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
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
      submittedRef.current = true
      trackEvent('form_success', sessionIdRef.current, { ref_code: refCode || null })
      setShowRecap(false)
      setDone(true)
    } catch {
      setError(`Network error. Please try again or text ${contact.phone}.`)
      setSubmitting(false)
      setShowRecap(false)
    }
  }

  const labelCls = 'block text-xs font-semibold text-slate-500 tracking-widest uppercase mb-2'
  const inputCls =
    'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent transition'
  const inputStyle = { ['--tw-ring-color' as string]: accent } as React.CSSProperties

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: `${accent}33` }}>✓</div>
          <div className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3">Pending Confirmation</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: primary }}>Request submitted.</h1>
          <p className="text-slate-600 text-sm mb-6">
            This isn&rsquo;t finalized yet — {identity.name} reviews and confirms shortly. You&rsquo;ll get a text/email locking in your date and time. Your <strong>$10 self-booking discount</strong> is noted on your request.
          </p>
          {pin && (
            <div className="rounded-lg p-4 mb-6 border" style={{ backgroundColor: `${accent}22`, borderColor: `${accent}66` }}>
              <p className="text-xs text-slate-500 tracking-widest uppercase mb-1">Your PIN</p>
              <p className="text-3xl font-bold tracking-widest" style={{ color: primary }}>{pin}</p>
            </div>
          )}
          <Link href="/" className="inline-block text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90" style={{ backgroundColor: primary }}>Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-10 md:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4" style={{ backgroundColor: `${accent}33`, color: primary }}>
              Book online &amp; save $10
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: primary }}>Book your service.</h1>
            <p className="text-slate-500 text-sm">Skip the call — fill this out and {identity.name} confirms your time. Self-bookers save <span className="font-semibold" style={{ color: primary }}>$10</span>.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-5 border border-slate-100">
            {/* Service */}
            <div>
              <label className={labelCls}>Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.filter((s) => !s.emergency).map((s) => {
                  const active = form.service_type === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => update('service_type', s.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${active ? 'text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
                      style={active ? { backgroundColor: primary, borderColor: primary } : undefined}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" required min={minDate} value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Preferred time</label>
                <select value={form.time} onChange={(e) => update('time', e.target.value)} className={inputCls} style={inputStyle}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Name + phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" required placeholder="First and last" value={form.name} onChange={(e) => update('name', e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" required placeholder="(212) 555-1234" value={form.phone} onChange={(e) => update('phone', formatPhone(e.target.value))} className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" required placeholder="Enter your email" value={form.email} onChange={(e) => { update('email', e.target.value); setEmailErr('') }} className={inputCls} style={inputStyle} />
              {emailErr && <p className="text-red-600 text-xs mt-1">{emailErr}</p>}
            </div>

            {/* Address */}
            <div>
              <label className={labelCls}>Address</label>
              <AddressAutocomplete value={form.address} onChange={(v) => update('address', v)} placeholder="Start typing your street..." className={inputCls} />
              <input type="text" placeholder="Apt / Unit (optional)" value={form.unit} onChange={(e) => update('unit', e.target.value)} className={`${inputCls} mt-2`} style={inputStyle} />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Anything we should know?</label>
              <textarea rows={2} placeholder="Access, focus areas, details..." value={form.notes} onChange={(e) => update('notes', e.target.value)} className={`${inputCls} resize-none`} style={inputStyle} />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

            <button type="submit" disabled={submitting} className="w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: primary }}>
              {submitting ? 'Submitting…' : 'Review & book'}
            </button>

            <p className="text-center text-xs text-slate-400">
              No payment now · You&rsquo;ll confirm on the next step · Or text us at{' '}
              <a href={`sms:${contact.phoneDigits}`} className="underline" style={{ color: primary }}>{contact.phone}</a>
            </p>
          </form>
        </div>
      </div>

      {showRecap && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto">
            <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: primary }}>Confirm your request</h2>
            <p className="text-xs text-slate-500 mb-4">Review the details — clicking Confirm sends it to {identity.name}.</p>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4 text-sm space-y-1.5 text-slate-900">
              <div><span className="text-slate-500">Service:</span> {form.service_type}</div>
              <div><span className="text-slate-500">When:</span> {form.date} @ {form.time}</div>
              <div><span className="text-slate-500">Address:</span> {form.address}{form.unit ? `, ${form.unit}` : ''}</div>
              <div className="pt-1 border-t border-slate-200"><span className="text-slate-500">Discount:</span> <span className="font-semibold text-green-700">$10 self-booking discount noted</span></div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowRecap(false)} disabled={submitting} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-slate-200 transition disabled:opacity-50">Back</button>
              <button type="button" onClick={handleConfirmSubmit} disabled={submitting} className="flex-1 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: primary }}>{submitting ? 'Confirming…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function StandardBookForm({ config }: { config: SiteConfig }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading…</div>}>
      <StandardBookContent config={config} />
    </Suspense>
  )
}
