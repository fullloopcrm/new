'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { validateEmail } from '@/lib/validate-email'
import { formatPhone } from '@/lib/format'
import type { ServiceOption } from '../../_config/types'

function trackBookingEvent(action: string, sessionId: string, extra: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({
      domain: typeof window !== 'undefined' ? window.location.hostname : 'example.com',
      page: '/book/new',
      action,
      session_id: sessionId,
      ...extra,
    })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/track', blob)
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {}
}

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'] as const

function BookFormContent({ services, businessName }: { services: ServiceOption[]; businessName: string }) {
  // Vertical-specific options come from tenant config, not hardcoded here.
  const standardValue = services.find(s => !s.emergency)?.value ?? services[0]?.value ?? 'Standard Service'
  const emergencyValue = services.find(s => s.emergency)?.value ?? 'Same-Day Emergency'

  useEffect(() => { document.title = 'Book a Service | Your Business' }, [])
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
    time: '12:00 PM',
    supplies: 'we_bring' as 'we_bring' | 'client',
    estimated_hours: 2,
    max_hours: null as number | null,
    notes: '',
    referrer_name: '',
    referrer_phone: '',
    cleaner_id: '' as string,
    extra_cleaner_ids: [] as string[],
    team_size: 1,
  })
  const [availableCleaners, setAvailableCleaners] = useState<{ id: string; name: string; is_preferred?: boolean; zone_match?: boolean; reason: string }[]>([])
  // Alternate on-the-hour times offered when the picked slot has no free cleaner.
  const [timeSuggestions, setTimeSuggestions] = useState<{ time24: string; label: string; cleaner: string; reason: string }[]>([])
  // Waitlist fallback: shown when the slot is full AND no alternate time works.
  const [waitlistState, setWaitlistState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  // Day-level availability (which hourly slots have ANY cleaner free) so the time
  // picker greys out full slots + closed/holiday days, instead of letting the
  // client pick a slot that isn't really open. Source: /api/client/availability.
  const [daySlots, setDaySlots] = useState<{ time: string; available: boolean }[]>([])
  const [dayMessage, setDayMessage] = useState<string>('')
  const [loadingCleaners, setLoadingCleaners] = useState(false)
  const [emailErr, setEmailErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pin, setPin] = useState('')
  const [showRecap, setShowRecap] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [policyFlash, setPolicyFlash] = useState(false)
  const policyRef = useRef<HTMLDivElement>(null)

  // ── Booking funnel tracking — fires events the analytics page reads to
  // populate the Booking conversion card (form_start / form_step / form_success
  // / form_abandon). Without these, /admin/analytics shows 0 / 0 / 0.
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

    // beforeunload + pagehide both fire on tab close in modern browsers; gate on
    // a single ref so we emit at most one form_abandon per session.
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

  // step_2 — Info captured (name + phone)
  useEffect(() => {
    if (step2FiredRef.current) return
    if (form.name.trim() && form.phone.replace(/\D/g, '').length >= 10) {
      step2FiredRef.current = true
      trackBookingEvent('form_step', sessionIdRef.current, { placement: 'step_2' })
    }
  }, [form.name, form.phone])

  // step_3 — Date/Time captured
  useEffect(() => {
    if (step3FiredRef.current) return
    if (form.date && form.time) {
      step3FiredRef.current = true
      trackBookingEvent('form_step', sessionIdRef.current, { placement: 'step_3' })
    }
  }, [form.date, form.time])

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const isSameDay = form.service_type === emergencyValue
  const isMultiCleaner = form.team_size >= 2
  // The 48-hour rule applies ONLY to multi-cleaner bookings: a 2+ cleaner
  // booking with under 48hr notice is billed at emergency pricing ($89/hr).
  // Single-cleaner bookings under 48hr are NOT emergency (same-day is its own
  // explicitly-chosen service type).
  const bookingStart = form.date ? new Date(`${form.date}T${to24h(form.time)}:00`) : null
  const hoursUntilBooking = bookingStart && !isNaN(bookingStart.getTime()) ? (bookingStart.getTime() - Date.now()) / 3_600_000 : Infinity
  const isUnder48 = hoursUntilBooking < 48
  const isEmergency = isSameDay || (isUnder48 && isMultiCleaner)
  const hourlyRate = isEmergency ? 89 : form.supplies === 'we_bring' ? 69 : 59
  // Minimums: 2hr standard, 4hr for multi-cleaner. Floor the billable estimate.
  const minHours = isMultiCleaner ? 4 : 2
  const estimatedHours = Math.max(form.estimated_hours, minHours)
  // $10 self-booking discount does NOT apply to emergency or multi-cleaner bookings.
  const discountEligible = !isEmergency && !isMultiCleaner
  const selfBookingDiscount = discountEligible ? 10 : 0
  const estimatedTotal = hourlyRate * estimatedHours * Math.max(1, form.team_size)

  // Convert "12:00 PM" → "12:00" (24h)
  function to24h(t: string): string {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return '12:00'
    let h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    const ap = m[3].toUpperCase()
    if (ap === 'PM' && h < 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  // Clients pick (and we store) an exact start time, but it's shown as a 2-hour
  // arrival window. "1:00 PM" → "1:00 PM–3:00 PM".
  function slotWindow(t: string): string {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return t
    let h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    const ap = m[3].toUpperCase()
    if (ap === 'PM' && h < 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    const fmt = (hh: number) =>
      new Date(Date.UTC(2000, 0, 1, (hh + 24) % 24, min, 0)).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })
    return `${fmt(h)}–${fmt(h + 2)}`
  }

  // Always show cleaners. When slot info is complete (date+time+address), fetch the
  // scored/available list. When it's incomplete, the endpoint returns an unscored
  // list of all active cleaners so the picker is never empty/gated.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoadingCleaners(true)
    setWaitlistState('idle') // new slot params → clear any prior waitlist result
    const slotComplete = !!(form.date && form.time && form.address && form.address.length >= 5)
    const params = new URLSearchParams()
    if (slotComplete) {
      params.set('date', form.date)
      params.set('start_time', to24h(form.time))
      params.set('duration', String(form.estimated_hours))
      params.set('address', form.address)
      params.set('hourly_rate', String(hourlyRate))
      params.set('suggest', '1') // get alternate times if this slot is full
    }
    fetch(`/api/client/smart-schedule?${params.toString()}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { cleaners?: typeof availableCleaners; suggestions?: typeof timeSuggestions | null } | null) => {
        if (data?.cleaners) setAvailableCleaners(data.cleaners)
        setTimeSuggestions(data?.suggestions || [])
      })
      .catch(() => {})
      .finally(() => setLoadingCleaners(false))
    return () => ctrl.abort()
  }, [form.date, form.time, form.address, form.estimated_hours, hourlyRate])

  // Day-level availability → grey out full times + flag closed/holiday/no-cleaner
  // days. Skipped for same-day emergency (owner-confirmed, its own path).
  useEffect(() => {
    if (isSameDay || !form.date) { setDaySlots([]); setDayMessage(''); return }
    const ctrl = new AbortController()
    fetch(`/api/client/availability?date=${form.date}&duration=${estimatedHours}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { slots?: { time: string; available: boolean }[]; message?: string; sameDay?: boolean } | null) => {
        if (!data) return
        setDaySlots(data.slots || [])
        setDayMessage(data.message || (data.sameDay ? 'Same-day bookings need a quick call to confirm — (555) 555-5555.' : ''))
        // If the currently-picked time isn't actually open, shift to the first
        // open one so the client never sits on a full slot.
        const open = (data.slots || []).filter(s => s.available).map(s => s.time)
        if (open.length && !open.includes(form.time)) update('time', open[0])
      })
      .catch(() => {})
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, estimatedHours, isSameDay])

  function pickServiceType(value: string) {
    const defaultHours = services.find(s => s.value === value)?.hours ?? 2
    setForm(prev => ({ ...prev, service_type: value, estimated_hours: defaultHours }))
  }

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function joinWaitlist() {
    if (!form.name.trim() || !form.phone.trim()) { setWaitlistState('error'); return }
    setWaitlistState('sending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          service_type: form.service_type,
          preferred_date: form.date || null,
          preferred_time: form.time || null,
          estimated_hours: form.estimated_hours,
          hourly_rate: hourlyRate,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => null)
      setWaitlistState(data?.ok ? 'done' : 'error')
    } catch {
      setWaitlistState('error')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Funnel instrumentation: log every submit click, then exactly which gate
    // blocked it (or that the recap opened). Lets /admin/analytics show where the
    // ~40 date-reached drop-offs actually die instead of guessing.
    trackBookingEvent('form_submit_click', sessionIdRef.current)

    // Most-common "button does nothing" cause: the policy box is unchecked.
    // Pull their eye to it and flash it instead of failing silently.
    if (!policyAccepted) {
      trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'policy' })
      policyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setPolicyFlash(true)
      setTimeout(() => setPolicyFlash(false), 1600)
      return
    }

    if (!form.name.trim()) { trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'name' }); setError('Please enter your name.'); return }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) { trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'phone' }); setError('Please enter a valid phone number.'); return }
    const emailCheck = validateEmail(form.email)
    if (!emailCheck.valid) { trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'email' }); setEmailErr(emailCheck.error || 'Invalid email'); setError('Please enter a valid email.'); return }
    setEmailErr('')
    if (!form.address.trim()) { trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'address' }); setError('Please enter your address.'); return }
    if (!form.date) { trackBookingEvent('form_blocked', sessionIdRef.current, { placement: 'date' }); setError('Please choose a date.'); return }

    trackBookingEvent('form_recap', sessionIdRef.current)
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
          hourly_rate: hourlyRate,
          estimated_hours: estimatedHours,
          max_hours: form.max_hours,
          // Confirming the booking agrees to the recap, which includes SMS
          // consent — record it (TCPA) alongside any customer note.
          notes: [form.notes.trim(), `✅ SMS consent granted (TCPA) at ${new Date().toISOString()}`].filter(Boolean).join('\n'),
          ref_code: refCode || null,
          src: srcDomain || null,
          referrer_name: form.referrer_name.trim() || null,
          referrer_phone: form.referrer_phone.trim() || null,
          cleaner_id: form.cleaner_id || null,
          extra_cleaner_ids: form.extra_cleaner_ids,
          team_size: form.team_size,
          client_confirmed: true,
          confirmed_at: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again or text us.')
        setSubmitting(false)
        setShowRecap(false)
        return
      }
      if (data.clients?.pin) setPin(data.clients.pin)
      submittedRef.current = true
      trackBookingEvent('form_success', sessionIdRef.current, { ref_code: refCode || null })
      setShowRecap(false)
      setDone(true)
    } catch (err) {
      setError('Network error. Please try again or text (555) 555-5555.')
      setSubmitting(false)
      setShowRecap(false)
    }
  }

  if (done) {
    return (
      <>
      <div className="min-h-screen bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">✓</div>
          <div className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3">Pending Owner Review</div>
          <h1 className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-2">Request Submitted — Awaiting Confirmation.</h1>
          <p className="text-gray-600 text-sm mb-6">This is <strong>not finalized yet</strong>. The owner reviews + confirms within the hour. You&rsquo;ll get a second text/email locking in your date, time, and cleaner — until then please don&rsquo;t plan around this slot. {selfBookingDiscount > 0 ? <>Your <strong>$10 self-booking discount</strong> is locked in &mdash; it&rsquo;ll show on your final bill once confirmed</> : <>This is a {isMultiCleaner ? 'multi-cleaner' : 'same-day / emergency'} booking, so no discounts apply{isMultiCleaner ? ' and a 4-hour minimum is in effect' : ''}</>}{pin ? '. A confirmation email with your client portal PIN is on its way' : ''}.</p>
          {pin && (
            <div className="bg-[rgb(var(--accent-rgb)/0.3)] border border-[var(--accent)] rounded-lg p-4 mb-6">
              <p className="text-xs text-[rgb(var(--brand-rgb)/0.6)] tracking-widest uppercase mb-1">Your PIN</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-widest">{pin}</p>
              <p className="text-xs text-[rgb(var(--brand-rgb)/0.6)] mt-2">Save this — log in at <Link href="/book" className="underline">example.com/book</Link></p>
            </div>
          )}
          <Link href="/" className="inline-block bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)]">Back home</Link>
        </div>
      </div>
      </>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-10 md:py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-[var(--accent)] text-[var(--brand)] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">Your Business Self-Booking System</div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide mb-3">You&rsquo;re one of the smart ones.</h1>
          <p className="text-blue-200/60 text-sm">Self-bookers save <span className="text-[var(--accent)] font-semibold">$10</span> off the final bill. Skip the call, fill it out below, you&rsquo;re booked.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-5">
          {/* Service type — main row excludes Same-Day. Team size, hours, and
              supplies are now defaults (1 cleaner, hours derived from service,
              we-bring); they can be tweaked from "More options" below. */}
          <div>
            <label htmlFor="service-type-select" className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Service</label>
            <select
              id="service-type-select"
              value={form.service_type}
              onChange={(e) => pickServiceType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 transition"
            >
              {services
                .filter(s => !s.emergency)
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => pickServiceType(isSameDay ? standardValue : emergencyValue)}
              className="mt-2 text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              {isSameDay ? '← Back to standard service' : 'Need it today? Same-day +$89/hr →'}
            </button>
          </div>

          {isSameDay && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-amber-800 text-sm">Same-day service is <strong>$89/hr</strong> — we bring everything. Subject to availability.</p>
            </div>
          )}

          {isUnder48 && isMultiCleaner && !isSameDay && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-amber-800 text-sm">Heads up — multi-cleaner bookings need 48 hours notice. This date is under 48 hours away, so your 2+ cleaner booking is billed at <strong>emergency pricing ($89/hr)</strong> with no discounts. Pick a date 48+ hours out, or book a single cleaner, for standard rates.</p>
            </div>
          )}

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Date</label>
              <input
                type="date"
                required
                min={isSameDay ? new Date().toISOString().split('T')[0] : minDate}
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Arrival window</label>
              <select
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
              >
                {TIME_SLOTS.map(t => {
                  // No day data yet (or same-day) → leave every slot pickable.
                  const slot = daySlots.find(s => s.time === t)
                  const gated = daySlots.length > 0
                  const open = !gated || (slot ? slot.available : false)
                  const suffix = !gated ? '' : slot ? (slot.available ? '' : ' — full') : ' — too late'
                  return (
                    <option key={t} value={t} disabled={!open}>
                      {slotWindow(t)}{suffix}
                    </option>
                  )
                })}
              </select>
              {dayMessage && <p className="text-[11px] text-amber-600 mt-1">{dayMessage}</p>}
              {!dayMessage && daySlots.length > 0 && daySlots.every(s => !s.available) && (
                <p className="text-[11px] text-amber-600 mt-1">That day is fully booked — pick another date or join the waitlist below.</p>
              )}
            </div>
          </div>

          {/* Name + phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Name</label>
              <input
                type="text"
                required
                placeholder="First and last"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Phone</label>
              <input
                type="tel"
                required
                placeholder="(212) 555-1234"
                value={form.phone}
                onChange={(e) => update('phone', formatPhone(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => { update('email', e.target.value); setEmailErr('') }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
            />
            {emailErr && <p className="text-red-600 text-xs mt-1">{emailErr}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => update('address', v)}
              placeholder="Start typing your street..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
            />
            <input
              type="text"
              placeholder="Apt / Unit (optional)"
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]"
            />
          </div>

          {/* More options — supplies, hours, team, cleaner pick, notes, referrer.
              Hidden by default to keep the form short. State stays populated with
              defaults (we_bring / 1 cleaner / service-derived hours / no notes). */}
          <details className="group rounded-lg border border-gray-200 bg-gray-50/40">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium text-[var(--brand)]">
              <span>More options <span className="text-gray-400 font-normal">(supplies, hours, cleaner pick, notes, referrer)</span></span>
              <span className="text-gray-400 group-open:rotate-180 transition">▾</span>
            </summary>
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-200">

              {!isSameDay && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Supplies</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => update('supplies', 'we_bring')} className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${form.supplies === 'we_bring' ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                      <div>We bring</div>
                      <div className="text-xs opacity-70">$69/hr</div>
                    </button>
                    <button type="button" onClick={() => update('supplies', 'client')} className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${form.supplies === 'client' ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                      <div>I provide</div>
                      <div className="text-xs opacity-70">$59/hr</div>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Hours <span className="normal-case font-normal text-gray-400">(estimate — billed for actual time)</span></label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(h => (
                    <button key={h} type="button" onClick={() => update('estimated_hours', h)} className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${form.estimated_hours === h ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{h}hr</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Cleaners <span className="normal-case font-normal text-gray-400">(default 1 — billed × team size)</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} type="button" onClick={() => { update('team_size', n); update('extra_cleaner_ids', form.extra_cleaner_ids.slice(0, Math.max(0, n - 1))) }} className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${form.team_size === n ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{n}</button>
                  ))}
                </div>
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Team-size policy:</strong> We only assign 2+ cleaners when the job is estimated at <strong>4 hours or longer for a single cleaner</strong>. The goal is to finish your cleaning in one day rather than stretch it across multiple visits. Smaller jobs go out as a 1-cleaner booking — if you select 2+ on a short job, we may rebalance to 1 cleaner during owner confirmation. <strong>Bookings with 2 or more cleaners have a 4-hour minimum, and discounts do not apply to multi-cleaner bookings.</strong>
                </div>
              </div>

              <div className="border border-gray-200 bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase">Pick a specific cleaner (optional)</label>
                  <span className="text-[10px] text-gray-500">{form.team_size > 1 ? `Team of ${form.team_size}` : ''}</span>
                </div>
                {loadingCleaners && <p className="text-xs text-gray-400">Loading team…</p>}
                {!loadingCleaners && availableCleaners.length === 0 && (
                  <>
                    {timeSuggestions.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-1.5">That time&apos;s full — these times are open:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {timeSuggestions.map(s => {
                            const slot = TIME_SLOTS.find(t => to24h(t) === s.time24)
                            if (!slot) return null
                            return (
                              <button
                                key={s.time24}
                                type="button"
                                onClick={() => update('time', slot)}
                                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-sm font-medium text-[var(--brand)]"
                              >
                                {slotWindow(slot)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : waitlistState === 'done' ? (
                      <p className="text-xs text-green-700 font-medium">You&apos;re on the waitlist — we&apos;ll text you the moment a spot opens. 😊</p>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5">Nothing&apos;s open that day. Want us to text you when a spot frees up?</p>
                        <button
                          type="button"
                          onClick={joinWaitlist}
                          disabled={waitlistState === 'sending'}
                          className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[#28365c] disabled:opacity-60"
                        >
                          {waitlistState === 'sending' ? 'Adding…' : 'Join the waitlist'}
                        </button>
                        {waitlistState === 'error' && (
                          <p className="text-[11px] text-red-500 mt-1">
                            {(!form.name.trim() || !form.phone.trim())
                              ? 'Add your name and phone above first.'
                              : 'Could not add you — please call (555) 555-5555.'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                {!loadingCleaners && availableCleaners.length > 0 && (
                  <div className="space-y-1">
                    <button type="button" onClick={() => { update('cleaner_id', ''); update('extra_cleaner_ids', []) }} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${!form.cleaner_id ? 'border-indigo-500 bg-indigo-50 font-medium text-[var(--brand)]' : 'border-gray-200 hover:border-gray-300 text-[var(--brand)]'}`}>
                      Any available cleaner
                    </button>
                    {availableCleaners.map(c => {
                      const isLead = form.cleaner_id === c.id
                      const isExtra = form.extra_cleaner_ids.includes(c.id)
                      const onClick = () => {
                        if (form.team_size <= 1) {
                          update('cleaner_id', c.id)
                          update('extra_cleaner_ids', [])
                          return
                        }
                        if (isLead) {
                          const [newLead, ...rest] = form.extra_cleaner_ids
                          update('cleaner_id', newLead || '')
                          update('extra_cleaner_ids', rest)
                        } else if (isExtra) {
                          update('extra_cleaner_ids', form.extra_cleaner_ids.filter(x => x !== c.id))
                        } else if (!form.cleaner_id) {
                          update('cleaner_id', c.id)
                        } else if (form.extra_cleaner_ids.length < form.team_size - 1) {
                          update('extra_cleaner_ids', [...form.extra_cleaner_ids, c.id])
                        }
                      }
                      return (
                        <button key={c.id} type="button" onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${isLead ? 'border-indigo-500 bg-indigo-50' : isExtra ? 'border-indigo-300 bg-indigo-50/60' : c.is_preferred ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200 hover:border-gray-300'} text-[var(--brand)]`}>
                          <div className="flex items-center justify-between">
                            <span>
                              {c.name}
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
                <textarea placeholder="Doorman, pet, focus areas, allergies..." rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)] resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">Were you referred? <span className="normal-case font-normal text-gray-400">(they earn 10%)</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="text" placeholder="Their name" value={form.referrer_name} onChange={(e) => update('referrer_name', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]" />
                  <input type="tel" placeholder="Their phone" value={form.referrer_phone} onChange={(e) => update('referrer_phone', formatPhone(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[var(--brand)]" />
                </div>
              </div>
            </div>
          </details>

          {/* Estimate — stress that this is hourly, based on 1 cleaner × N hours */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 tracking-widest uppercase">Estimate</p>
                <p className="text-xs text-gray-500 mt-0.5">{estimatedHours}hrs &times; ${hourlyRate}/hr{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''} &middot; pay after, never before</p>
                {selfBookingDiscount > 0
                  ? <p className="text-xs text-green-700 font-semibold mt-1">−$10 self-booking discount applied at billing</p>
                  : <p className="text-xs text-amber-700 font-semibold mt-1">{isMultiCleaner ? `Multi-cleaner booking — no discounts apply · 4-hour minimum${isEmergency ? ' · under-48hr emergency rate' : ''}` : 'Same-day / emergency booking — no discounts apply'}</p>}
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">~${Math.max(0, estimatedTotal - selfBookingDiscount)}</p>
                {selfBookingDiscount > 0 && <p className="text-xs text-gray-400 line-through">${estimatedTotal}</p>}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Heads up — this is an hourly service</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                The number above is an <strong>estimate</strong>, not a flat quote. You&rsquo;re billed for actual time worked, in 30-minute increments, at <strong>${hourlyRate}/hr</strong>{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}. This estimate is based on <strong>{form.team_size} cleaner{form.team_size > 1 ? 's' : ''} for {estimatedHours} hours</strong>. To change cleaners, hours, or supplies, open <strong>More options</strong> above.
              </p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div ref={policyRef} className={`bg-red-50 border-2 rounded-lg p-4 text-sm text-red-900 leading-relaxed transition-all duration-300 ${policyFlash ? 'border-red-500 ring-4 ring-red-400/60 animate-pulse' : 'border-red-300'}`}>
            <p className="font-bold uppercase tracking-wide mb-2">Read before booking</p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li><strong>2-hour minimum on all bookings</strong>, first-time cleanings included.</li>
              <li><strong>2 or more cleaners = 4-hour minimum</strong>, no discounts, and <strong>48 hours notice required</strong>. A multi-cleaner booking with under 48 hours notice is billed at emergency pricing (<strong>$89/hr</strong>).</li>
              <li><strong>First-time bookings CANNOT be cancelled or rescheduled.</strong> We hold the slot and turn other clients away.</li>
              <li><strong>Recurring service</strong> (weekly / biweekly / monthly) requires <strong>7 days notice</strong> to reschedule or cancel.</li>
              <li>Hourly billing in 30-min increments. 30-min weekday / 60-min weekend arrival window.</li>
              <li>Payment due 30 min before completion via our secure payment link (Apple Pay, card, or Cash App).</li>
            </ul>
            <label className="flex items-start gap-2 mt-3 pt-3 border-t border-red-200 cursor-pointer">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="mt-0.5 min-w-[18px] min-h-[18px] accent-red-700"
              />
              <span className="text-sm font-semibold text-red-900">I understand and accept the no-cancellation / reschedule policy above.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase transition disabled:opacity-50 disabled:cursor-not-allowed ${
              policyAccepted
                ? 'bg-[var(--accent)] text-[var(--brand)] hover:bg-[var(--accent-hover)]'
                : 'bg-[rgb(var(--accent-rgb)/0.5)] text-[rgb(var(--brand-rgb)/0.7)] hover:bg-[rgb(var(--accent-rgb)/0.7)]'
            }`}
          >
            {submitting ? 'Submitting…' : policyAccepted ? 'Book my cleaning' : 'Check the box above, then book'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            No payment now &middot; You&apos;ll review &amp; confirm the recap on the next step &middot; Or text us at <a href="sms:5555555555" className="text-[var(--brand)] underline">(555) 555-5555</a>
          </p>
        </form>
      </div>
    </div>

    {showRecap && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-1">Confirm your booking</h2>
          <p className="text-xs text-gray-500 mb-4">Review the details and the policy below — clicking Confirm locks it in.</p>

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4 text-sm space-y-1.5 text-[var(--brand)]">
            <div><span className="text-gray-500">Service:</span> {form.service_type}</div>
            <div><span className="text-gray-500">When:</span> {form.date} @ {form.time}</div>
            <div><span className="text-gray-500">Address:</span> {form.address}{form.unit ? `, ${form.unit}` : ''}</div>
            <div><span className="text-gray-500">Rate:</span> ${hourlyRate}/hr × ~{estimatedHours} hrs{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}{form.team_size > 1 ? ' (4-hr minimum)' : ''}</div>
            <div className="pt-1 border-t border-gray-200"><span className="text-gray-500">Estimated total:</span> <span className="font-semibold">~${Math.max(0, estimatedTotal - selfBookingDiscount)}</span> {selfBookingDiscount > 0
              ? <span className="text-xs text-green-700">($10 self-booking discount applied at billing)</span>
              : <span className="text-xs text-amber-700">({isMultiCleaner ? 'multi-cleaner' : 'same-day / emergency'} — no discounts apply)</span>}</div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">By clicking Confirm you agree to:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Hourly billing in 30-min increments at the rate above (no flat total)</li>
              <li><strong>2-hour minimum</strong> (first-time cleanings included); <strong>2+ cleaners = 4-hour minimum</strong>, no discounts, and 48 hours notice required (under 48 hours = $89/hr emergency rate)</li>
              <li>30-min weekday / 60-min weekend arrival window</li>
              <li><strong>No-cancellation policy on this first booking</strong> — first-time bookings can&apos;t be cancelled or rescheduled</li>
              <li><strong>Recurring service</strong> (weekly / biweekly / monthly) requires <strong>7 days notice</strong> to reschedule or cancel</li>
              <li>Payment due 30 min before completion via our secure payment link (Apple Pay, card, or Cash App)</li>
              <li>Receiving text messages from {businessName} at the number you provided about this booking — confirmations, arrival updates, reminders, and support, including messages sent by automated means. Consent is not a condition of purchase. Msg &amp; data rates may apply; msg frequency may vary. Reply STOP to opt out, HELP for help.</li>
            </ul>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowRecap(false)}
              disabled={submitting}
              className="flex-1 bg-gray-100 text-[var(--brand)] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="flex-1 bg-[var(--accent)] text-[var(--brand)] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
            >
              {submitting ? 'Confirming…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  )
}

export default function BookFormClient({ services, businessName }: { services: ServiceOption[]; businessName: string }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand)] flex items-center justify-center text-white">Loading…</div>}>
      <BookFormContent services={services} businessName={businessName} />
    </Suspense>
  )
}
