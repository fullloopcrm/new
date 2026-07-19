'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AddressAutocomplete from '@/app/site/the-florida-maid/_components/AddressAutocomplete'
import { validateEmail } from '@/app/site/the-florida-maid/_lib/validate-email'
import { formatPhone } from '@/lib/format'

function trackBookingEvent(action: string, sessionId: string, extra: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({
      domain: typeof window !== 'undefined' ? window.location.hostname : 'thefloridamaid.com',
      page: '/book-now',
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

const SERVICE_TYPES = [
  { value: 'Standard Cleaning', label: 'Standard', hours: 2 },
  { value: 'Deep Cleaning', label: 'Deep Clean', hours: 4 },
  { value: 'Move In/Out', label: 'Move In/Out', hours: 5 },
  { value: 'Post Construction', label: 'Post-Reno', hours: 5 },
  { value: 'Same-Day Emergency', label: 'Same-Day', hours: 2 },
] as const

const TIME_SLOTS = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'] as const

function BookFormContent() {
  useEffect(() => { document.title = 'Book a Cleaning | The Florida Maid' }, [])
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const srcDomain = searchParams.get('src') || ''

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', unit: '',
    service_type: 'Standard Cleaning' as string,
    date: '', time: '12:00 PM',
    supplies: 'we_bring' as 'we_bring' | 'client',
    estimated_hours: 2,
    max_hours: null as number | null,
    notes: '', referrer_name: '', referrer_phone: '',
    cleaner_id: '' as string,
    extra_cleaner_ids: [] as string[],
    team_size: 1,
  })
  const [availableCleaners, setAvailableCleaners] = useState<{ id: string; name: string; is_preferred?: boolean; zone_match?: boolean; reason: string }[]>([])
  const [loadingCleaners, setLoadingCleaners] = useState(false)
  const [emailErr, setEmailErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pin, setPin] = useState('')
  const [showRecap, setShowRecap] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)

  const sessionIdRef = useRef<string>('')
  const startedRef = useRef(false)
  const step2FiredRef = useRef(false)
  const step3FiredRef = useRef(false)
  const submittedRef = useRef(false)
  const abandonFiredRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    sessionIdRef.current = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    startedRef.current = true
    trackBookingEvent('form_start', sessionIdRef.current, { ref_code: refCode || null })
    const onUnload = () => {
      if (submittedRef.current || abandonFiredRef.current) return
      abandonFiredRef.current = true
      trackBookingEvent('form_abandon', sessionIdRef.current)
    }
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('pagehide', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('pagehide', onUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step2FiredRef.current) return
    if (form.name.trim() && form.phone.replace(/\D/g, '').length >= 10) {
      step2FiredRef.current = true
      trackBookingEvent('form_step', sessionIdRef.current, { placement: 'step_2' })
    }
  }, [form.name, form.phone])

  useEffect(() => {
    if (step3FiredRef.current) return
    if (form.date && form.time) {
      step3FiredRef.current = true
      trackBookingEvent('form_step', sessionIdRef.current, { placement: 'step_3' })
    }
  }, [form.date, form.time])

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
  const isSameDay = form.service_type === 'Same-Day Emergency'
  const hourlyRate = isSameDay ? 89 : form.supplies === 'we_bring' ? 59 : 49
  const estimatedHours = form.estimated_hours
  const estimatedTotal = hourlyRate * estimatedHours * Math.max(1, form.team_size)

  function to24h(t: string): string {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return '12:00'
    let h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    if (m[3].toUpperCase() === 'PM' && h < 12) h += 12
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  useEffect(() => {
    const ctrl = new AbortController()
    setLoadingCleaners(true)
    const slotComplete = !!(form.date && form.time && form.address && form.address.length >= 5)
    const params = new URLSearchParams()
    if (slotComplete) {
      params.set('date', form.date)
      params.set('start_time', to24h(form.time))
      params.set('duration', String(form.estimated_hours))
      params.set('address', form.address)
      params.set('hourly_rate', String(hourlyRate))
    }
    fetch(`/api/client/smart-schedule?${params.toString()}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { cleaners?: typeof availableCleaners } | null) => { if (data?.cleaners) setAvailableCleaners(data.cleaners) })
      .catch(() => {})
      .finally(() => setLoadingCleaners(false))
    return () => ctrl.abort()
  }, [form.date, form.time, form.address, form.estimated_hours, hourlyRate])

  function pickServiceType(value: string) {
    const defaultHours = SERVICE_TYPES.find(s => s.value === value)?.hours ?? 2
    setForm(prev => ({ ...prev, service_type: value, estimated_hours: defaultHours }))
  }
  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
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
          name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
          address: form.address.trim(), unit: form.unit.trim(),
          service_type: form.service_type, date: form.date, time: form.time,
          hourly_rate: hourlyRate, estimated_hours: estimatedHours, max_hours: form.max_hours,
          notes: form.notes.trim(), ref_code: refCode || null, src: srcDomain || null,
          referrer_name: form.referrer_name.trim() || null, referrer_phone: form.referrer_phone.trim() || null,
          cleaner_id: form.cleaner_id || null, extra_cleaner_ids: form.extra_cleaner_ids, team_size: form.team_size,
          client_confirmed: true, confirmed_at: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again or text us.')
        setSubmitting(false); setShowRecap(false); return
      }
      if (data.clients?.pin) setPin(data.clients.pin)
      submittedRef.current = true
      trackBookingEvent('form_success', sessionIdRef.current, { ref_code: refCode || null })
      setShowRecap(false); setDone(true)
    } catch {
      setError('Network error. Please try again or text (954) 710-3636.')
      setSubmitting(false); setShowRecap(false)
    }
  }

  if (done) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-[#1E2A4A] to-[#243352] flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">✓</div>
            <div className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3">Pending Owner Review</div>
            <h1 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">Request Submitted — Awaiting Confirmation.</h1>
            <p className="text-gray-600 text-sm mb-6">This is <strong>not finalized yet</strong>. We review + confirm within the hour. You&rsquo;ll get a second text/email locking in your date, time, and cleaner. Your <strong>$20 self-booking discount</strong> is locked in &mdash; it&rsquo;ll show on your final bill once confirmed{pin ? '. A confirmation email with your client portal PIN is on its way' : ''}.</p>
            {pin && (
              <div className="bg-[#A8F0DC]/30 border border-[#A8F0DC] rounded-lg p-4 mb-6">
                <p className="text-xs text-[#1E2A4A]/60 tracking-widest uppercase mb-1">Your PIN</p>
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-widest">{pin}</p>
                <p className="text-xs text-[#1E2A4A]/60 mt-2">Save this — log in at <Link href="/portal/login" className="underline">thefloridamaid.com/portal</Link></p>
              </div>
            )}
            <Link href="/" className="inline-block bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90">Back home</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-10 md:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block bg-[#A8F0DC] text-[#1E2A4A] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">The Florida Maid Self-Booking System</div>
            <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide mb-3">You&rsquo;re one of the smart ones.</h1>
            <p className="text-blue-200/60 text-sm">Self-bookers save <span className="text-[#A8F0DC] font-semibold">$20</span> off the final bill. Skip the call, fill it out below, you&rsquo;re booked.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SERVICE_TYPES.filter(s => s.value !== 'Same-Day Emergency').map(s => (
                  <button key={s.value} type="button" onClick={() => pickServiceType(s.value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${form.service_type === s.value ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => pickServiceType(isSameDay ? 'Standard Cleaning' : 'Same-Day Emergency')}
                className="mt-2 text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2">
                {isSameDay ? '← Back to standard service' : 'Need it today? Same-day +$89/hr →'}
              </button>
            </div>

            {isSameDay && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-amber-800 text-sm">Same-day service is <strong>$89/hr</strong> — we bring everything. Subject to availability.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Date</label>
                <input type="date" required min={isSameDay ? new Date().toLocaleDateString('en-CA') : minDate}
                  value={form.date} onChange={(e) => update('date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Time</label>
                <select value={form.time} onChange={(e) => update('time', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Name</label>
                <input type="text" required placeholder="First and last" value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Phone</label>
                <input type="tel" required placeholder="(954) 555-1234" value={form.phone}
                  onChange={(e) => update('phone', formatPhone(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Email</label>
              <input type="email" required placeholder="you@example.com" value={form.email}
                onChange={(e) => { update('email', e.target.value); setEmailErr('') }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
              {emailErr && <p className="text-red-600 text-xs mt-1">{emailErr}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Address</label>
              <AddressAutocomplete value={form.address} onChange={(v) => update('address', v)}
                placeholder="Start typing your street..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
              <input type="text" placeholder="Apt / Unit (optional)" value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
                className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
            </div>

            <details className="group rounded-lg border border-gray-200 bg-gray-50/40">
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium text-[#1E2A4A]">
                <span>More options <span className="text-gray-400 font-normal">(supplies, hours, cleaner pick, notes, referrer)</span></span>
                <span className="text-gray-400 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-200">
                {!isSameDay && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Supplies</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => update('supplies', 'we_bring')} className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${form.supplies === 'we_bring' ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                        <div>We bring</div><div className="text-xs opacity-70">$59/hr</div>
                      </button>
                      <button type="button" onClick={() => update('supplies', 'client')} className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${form.supplies === 'client' ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                        <div>I provide</div><div className="text-xs opacity-70">$49/hr</div>
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Hours <span className="normal-case font-normal text-gray-400">(estimate — billed for actual time)</span></label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8].map(h => (
                      <button key={h} type="button" onClick={() => update('estimated_hours', h)} className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${form.estimated_hours === h ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{h}hr</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Cleaners <span className="normal-case font-normal text-gray-400">(default 1 — billed × team size)</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} type="button" onClick={() => { update('team_size', n); update('extra_cleaner_ids', form.extra_cleaner_ids.slice(0, Math.max(0, n - 1))) }} className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${form.team_size === n ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="border border-gray-200 bg-white rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Pick a specific cleaner (optional)</label>
                  {loadingCleaners && <p className="text-xs text-gray-400">Loading team…</p>}
                  {!loadingCleaners && availableCleaners.length === 0 && (
                    <p className="text-xs text-gray-500">No cleaners free for this slot. Leave blank and we&apos;ll match you.</p>
                  )}
                  {!loadingCleaners && availableCleaners.length > 0 && (
                    <div className="space-y-1">
                      <button type="button" onClick={() => { update('cleaner_id', ''); update('extra_cleaner_ids', []) }} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${!form.cleaner_id ? 'border-indigo-500 bg-indigo-50 font-medium text-[#1E2A4A]' : 'border-gray-200 hover:border-gray-300 text-[#1E2A4A]'}`}>
                        Any available cleaner
                      </button>
                      {availableCleaners.map(c => {
                        const isLead = form.cleaner_id === c.id
                        const isExtra = form.extra_cleaner_ids.includes(c.id)
                        const onClick = () => {
                          if (form.team_size <= 1) { update('cleaner_id', c.id); update('extra_cleaner_ids', []); return }
                          if (isLead) {
                            const [newLead, ...rest] = form.extra_cleaner_ids
                            update('cleaner_id', newLead || ''); update('extra_cleaner_ids', rest)
                          } else if (isExtra) {
                            update('extra_cleaner_ids', form.extra_cleaner_ids.filter(x => x !== c.id))
                          } else if (!form.cleaner_id) {
                            update('cleaner_id', c.id)
                          } else if (form.extra_cleaner_ids.length < form.team_size - 1) {
                            update('extra_cleaner_ids', [...form.extra_cleaner_ids, c.id])
                          }
                        }
                        return (
                          <button key={c.id} type="button" onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${isLead ? 'border-indigo-500 bg-indigo-50' : isExtra ? 'border-indigo-300 bg-indigo-50/60' : c.is_preferred ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200 hover:border-gray-300'} text-[#1E2A4A]`}>
                            <div className="flex items-center justify-between">
                              <span>{c.name}
                                {isLead && form.team_size > 1 && <span className="ml-1.5 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                                {isExtra && <span className="ml-1.5 text-[9px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                                {c.is_preferred && <span className="ml-1.5 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-semibold">★ YOUR PICK</span>}
                              </span>
                              <span className="text-[10px] text-gray-500">{c.reason}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Notes</label>
                  <textarea placeholder="Gate code, pet, focus areas, allergies..." rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Were you referred? <span className="normal-case font-normal text-gray-400">(they earn 10%)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="text" placeholder="Their name" value={form.referrer_name} onChange={(e) => update('referrer_name', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
                    <input type="tel" placeholder="Their phone" value={form.referrer_phone} onChange={(e) => update('referrer_phone', formatPhone(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]" />
                  </div>
                </div>
              </div>
            </details>

            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 tracking-widest uppercase">Estimate</p>
                  <p className="text-xs text-gray-500 mt-0.5">{estimatedHours}hrs &times; ${hourlyRate}/hr{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''} &middot; pay after, never before</p>
                  <p className="text-xs text-green-700 font-semibold mt-1">−$20 self-booking discount applied at billing</p>
                </div>
                <div className="text-right">
                  <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">~${Math.max(0, estimatedTotal - 20)}</p>
                  <p className="text-xs text-gray-400 line-through">${estimatedTotal}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Heads up — this is an hourly service</p>
                <p className="text-xs text-gray-600 leading-relaxed">The number above is an <strong>estimate</strong>, not a flat quote. You&rsquo;re billed for actual time worked, in 30-minute increments, at <strong>${hourlyRate}/hr</strong>{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}. To change cleaners, hours, or supplies, open <strong>More options</strong> above.</p>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-sm text-red-900 leading-relaxed">
              <p className="font-bold uppercase tracking-wide mb-2">No cancellations — read before booking</p>
              <ul className="list-disc list-inside space-y-1 mb-3">
                <li><strong>First-time bookings CANNOT be cancelled or rescheduled.</strong> We hold the slot and turn other clients away.</li>
                <li><strong>Recurring service</strong> (weekly / biweekly / monthly) requires <strong>7 days notice</strong> to reschedule or cancel.</li>
                <li>Hourly billing in 30-min increments. <strong>2-hour arrival window</strong> — we can&apos;t give an exact arrival time, even day-of; cleaners usually arrive within the first 30 minutes, but please plan for the full window.</li>
                <li>Payment due 30 min before completion via Zelle, Venmo, CashApp, or card (+4%).</li>
              </ul>
              <label className="flex items-start gap-2 mt-3 pt-3 border-t border-red-200 cursor-pointer">
                <input type="checkbox" checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} className="mt-0.5 min-w-[18px] min-h-[18px] accent-red-700" />
                <span className="text-sm font-semibold text-red-900">I understand and accept the no-cancellation / reschedule policy above.</span>
              </label>
            </div>

            <button type="submit" disabled={submitting || !policyAccepted}
              className="w-full bg-[#A8F0DC] text-[#1E2A4A] py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Submitting…' : policyAccepted ? 'Book my cleaning' : 'Accept the policy above to book'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              No payment now &middot; You&apos;ll review &amp; confirm the recap on the next step &middot; Or text us at <a href="sms:9547103636" className="text-[#1E2A4A] underline">(954) 710-3636</a>
            </p>
          </form>
        </div>
      </div>

      {showRecap && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-1">Confirm your booking</h2>
            <p className="text-xs text-gray-500 mb-4">Review the details and the policy below — clicking Confirm locks it in.</p>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4 text-sm space-y-1.5 text-[#1E2A4A]">
              <div><span className="text-gray-500">Service:</span> {form.service_type}</div>
              <div><span className="text-gray-500">When:</span> {form.date} @ {form.time}</div>
              <div><span className="text-gray-500">Address:</span> {form.address}{form.unit ? `, ${form.unit}` : ''}</div>
              <div><span className="text-gray-500">Rate:</span> ${hourlyRate}/hr × ~{estimatedHours} hrs{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}</div>
              <div className="pt-1 border-t border-gray-200"><span className="text-gray-500">Estimated total:</span> <span className="font-semibold">~${Math.max(0, estimatedTotal - 20)}</span> <span className="text-xs text-green-700">($20 self-booking discount applied at billing)</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">By clicking Confirm you agree to:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Hourly billing in 30-min increments at the rate above (no flat total)</li>
                <li><strong>2-hour arrival window</strong> — no exact arrival time, even day-of; cleaners usually arrive within the first 30 minutes, but please plan for the full window</li>
                <li><strong>No-cancellation policy on this first booking</strong></li>
                <li><strong>Recurring service</strong> requires <strong>7 days notice</strong></li>
                <li>Payment due 30 min before completion via Zelle, Venmo, CashApp, or card (+4%)</li>
              </ul>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowRecap(false)} disabled={submitting} className="flex-1 bg-gray-100 text-[#1E2A4A] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition disabled:opacity-50">Back</button>
              <button type="button" onClick={handleConfirmSubmit} disabled={submitting} className="flex-1 bg-[#A8F0DC] text-[#1E2A4A] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition disabled:opacity-50">{submitting ? 'Confirming…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function BookNowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1E2A4A] flex items-center justify-center text-white">Loading…</div>}>
      <BookFormContent />
    </Suspense>
  )
}
