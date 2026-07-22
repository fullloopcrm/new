'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PushPrompt from '@/components/PushPrompt'
import { useServiceTypes } from '@/lib/useServiceTypes'
import BookingNotes from '@/components/BookingNotes'
import ClientAddresses from '@/app/site/nycmaid/_components/ClientAddresses'

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  payment_status?: string | null
  payment_method?: string | null
  recurring_type: string | null
  cleaners: { name: string } | null
  hourly_rate?: number
}

interface Slot {
  time: string
  available: boolean
}

export default function ClientDashboardPage() {
  useEffect(() => { document.title = 'My Bookings | The NYC Maid' }, []);
  const [clientId, setClientId] = useState('')
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [clientNotes, setClientNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [preferredCleanerId, setPreferredCleanerId] = useState<string | null>(null)
  const [familiarCleaners, setFamiliarCleaners] = useState<{ id: string; name: string }[]>([])
  const [savingPreferred, setSavingPreferred] = useState(false)
  const [preferredSaved, setPreferredSaved] = useState(false)
  const router = useRouter()

  const SERVICE_HOURS: Record<string, number> = {
    'Standard Cleaning': 2, 'Deep Cleaning': 4, 'Move In/Out': 5, 'Post Construction': 4
  }
  const serviceTypesData = useServiceTypes()
  const serviceTypes = serviceTypesData.length > 0 ? serviceTypesData.map(s => s.name) : ['Standard Cleaning', 'Deep Cleaning', 'Move In/Out', 'Post Construction']

  // Inline booking state
  const [showBooking, setShowBooking] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingServiceType, setBookingServiceType] = useState('Standard Cleaning')
  const [bookingHours, setBookingHours] = useState(2)
  const [bookingSupplies, setBookingSupplies] = useState<'we_bring' | 'client'>('we_bring')
  const [bookingMaxHours, setBookingMaxHours] = useState<number | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [renurtureCode, setRenurtureCode] = useState('')
  const [recurringCleanerId, setRecurringCleanerId] = useState<string>('')
  const [bookingCleanerId, setBookingCleanerId] = useState<string>('')
  const [bookingExtraCleaners, setBookingExtraCleaners] = useState<string[]>([])
  const [bookingTeamSize, setBookingTeamSize] = useState(1)
  const [oneTimeAvailable, setOneTimeAvailable] = useState<{ id: string; name: string; is_preferred?: boolean; reason: string }[]>([])
  const [loadingOneTime, setLoadingOneTime] = useState(false)
  const [lastServiceType, setLastServiceType] = useState('Standard Cleaning')
  const [lastHourlyRate, setLastHourlyRate] = useState(75)
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [doNotService, setDoNotService] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('client_id')

    if (!id) {
      router.push('/book')
      return
    }

    setClientId(id)
    loadBookings(id)
    loadNotes(id)
    loadPreferredCleaner(id)

    // Renurture win-back links deep-link here with ?renurture_code=XXXX.
    // Plain browser API (not useSearchParams) — this page isn't Suspense-wrapped.
    const code = new URLSearchParams(window.location.search).get('renurture_code')
    if (code) {
      setRenurtureCode(code)
      setRecurringFrequency('monthly') // the code's discount only applies to monthly
    }
  }, [router])

  // Always show cleaners. With slot info, fetch the scored/available list;
  // without it, the endpoint returns the unscored full list (preferred floats
  // to top). Picker is never gated.
  useEffect(() => {
    if (!clientId) {
      setOneTimeAvailable([])
      return
    }
    const ctrl = new AbortController()
    setLoadingOneTime(true)
    const params = new URLSearchParams({ client_id: clientId })
    if (bookingDate && bookingTime) {
      const m = bookingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      let hh = 9, mm = 0
      if (m) {
        hh = parseInt(m[1], 10)
        mm = parseInt(m[2], 10)
        const ap = m[3].toUpperCase()
        if (ap === 'PM' && hh < 12) hh += 12
        if (ap === 'AM' && hh === 12) hh = 0
      }
      params.set('date', bookingDate)
      params.set('start_time', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
      params.set('duration', String(bookingHours))
      params.set('hourly_rate', String(bookingSupplies === 'we_bring' ? 69 : 59))
    }
    fetch(`/api/client/smart-schedule?${params.toString()}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { cleaners?: typeof oneTimeAvailable } | null) => {
        if (data?.cleaners) setOneTimeAvailable(data.cleaners)
      })
      .catch(() => {})
      .finally(() => setLoadingOneTime(false))
    return () => ctrl.abort()
  }, [clientId, bookingDate, bookingTime, bookingHours, bookingSupplies])

  const loadPreferredCleaner = async (id: string) => {
    const res = await fetch(`/api/client/preferred-cleaner?client_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setPreferredCleanerId(data.preferred_cleaner_id || null)
      setFamiliarCleaners(data.familiar_cleaners || [])
      // Default the recurring cleaner picker to the preferred one if set.
      if (data.preferred_cleaner_id) setRecurringCleanerId(data.preferred_cleaner_id)
    }
  }

  const savePreferredCleaner = async (newId: string | null) => {
    setSavingPreferred(true)
    setPreferredSaved(false)
    const res = await fetch('/api/client/preferred-cleaner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, preferred_cleaner_id: newId })
    })
    if (res.ok) {
      setPreferredCleanerId(newId)
      setPreferredSaved(true)
      setTimeout(() => setPreferredSaved(false), 2000)
    }
    setSavingPreferred(false)
  }

  const loadNotes = async (id: string) => {
    const res = await fetch(`/api/client/notes?client_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setClientNotes(data.notes || '')
    }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    setNotesSaved(false)
    const res = await fetch('/api/client/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, notes: clientNotes })
    })
    if (res.ok) {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }
    setSavingNotes(false)
  }

  const loadBookings = async (id: string) => {
    const res = await fetch(`/api/client/bookings?client_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setUpcomingBookings(data.upcoming)
      setPastBookings(data.past)
      if (data.do_not_service) setDoNotService(true)

      // Pull service type and hourly rate from most recent booking
      const allBookings = [...(data.upcoming || []), ...(data.past || [])]
      if (allBookings.length > 0) {
        const mostRecent = allBookings[0]
        if (mostRecent.service_type) setLastServiceType(mostRecent.service_type)
        if (mostRecent.hourly_rate) setLastHourlyRate(mostRecent.hourly_rate)
      }
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('client_id')
    router.push('/book')
  }

  // start_time/end_time are stored as naive ET wall-clock (no offset, e.g. "2026-06-18T09:00:00").
  // Render the literal wall-clock — never parse through the viewer's local timezone, or the
  // displayed hour shifts when their device isn't on America/New_York.
  const formatDate = (dateStr: string) => {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return ''
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
    return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    const m = dateStr.match(/T(\d{2}):(\d{2})/)
    if (!m) return ''
    const d = new Date(Date.UTC(2000, 0, 1, Number(m[1]), Number(m[2]), 0))
    return d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })
  }

  // Clients see a 2-hour arrival window, not the exact start time. Parses the
  // literal naive wall-clock (same as formatTime) and adds 2 hours.
  const formatWindow = (dateStr: string) => {
    const m = dateStr.match(/T(\d{2}):(\d{2})/)
    if (!m) return ''
    const h = Number(m[1])
    const min = Number(m[2])
    const fmt = (hh: number) =>
      new Date(Date.UTC(2000, 0, 1, (hh + 24) % 24, min, 0)).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })
    return `${fmt(h)}–${fmt(h + 2)}`
  }

  // Same window, but for a "10:00 AM" slot label (12h) instead of an ISO string.
  const slotTimeWindow = (t: string) => {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return t
    let h = Number(m[1])
    const min = Number(m[2])
    const ap = m[3].toUpperCase()
    if (ap === 'PM' && h < 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    const fmt = (hh: number) =>
      new Date(Date.UTC(2000, 0, 1, (hh + 24) % 24, min, 0)).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })
    return `${fmt(h)}–${fmt(h + 2)}`
  }

  const getDaysUntil = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
  }

  const canReschedule = (booking: Booking) => {
    // One-time services: no rescheduling at all
    if (!booking.recurring_type) return false
    // Recurring clients: 7+ days notice required
    const now = new Date()
    const bookingDate = new Date(booking.start_time)
    const daysUntil = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 7
  }

  // Date bounds for booking picker
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]
  const maxDateObj = new Date()
  maxDateObj.setDate(maxDateObj.getDate() + 60)
  const maxDate = maxDateObj.toISOString().split('T')[0]

  const isSameDay = (date: string) => {
    return date === new Date().toISOString().split('T')[0]
  }

  const fetchSlots = async (date: string, hours?: number) => {
    if (isSameDay(date)) {
      setSlots([])
      setLoadingSlots(false)
      return
    }
    setLoadingSlots(true)
    setSlots([])
    setBookingTime('')
    const duration = hours || bookingHours
    const res = await fetch(`/api/client/availability?date=${date}&duration=${duration}`)
    if (res.ok) {
      const data = await res.json()
      setSlots(data.slots || [])
    }
    setLoadingSlots(false)
  }

  const handleDateChange = (date: string) => {
    setBookingDate(date)
    setBookingTime('')
    setBookingSuccess(false)
    if (date) fetchSlots(date)
  }

  const openBookingPanel = (preselectedDate?: string) => {
    setShowBooking(true)
    setBookingDate(preselectedDate || '')
    setBookingTime('')
    setSlots([])
    setBookingSuccess(false)
    setBookingServiceType(lastServiceType)
    const hours = SERVICE_HOURS[lastServiceType] || 2
    setBookingHours(hours)
    if (preselectedDate) fetchSlots(preselectedDate, hours)
  }

  const submitBooking = async () => {
    if (!bookingDate || !bookingTime || !clientId) return
    setSubmittingBooking(true)

    if (recurringEnabled) {
      // Convert "10:00 AM" → "10:00" 24h
      const [hStr, ampmRaw] = bookingTime.split(' ')
      const [h, m] = hStr.split(':').map(Number)
      const ampm = (ampmRaw || '').toUpperCase()
      const hr24 = ampm === 'PM' && h < 12 ? h + 12 : ampm === 'AM' && h === 12 ? 0 : h
      const time24 = `${String(hr24).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`

      const res = await fetch('/api/client/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          frequency: recurringFrequency,
          start_date: bookingDate,
          time: time24,
          hours: bookingHours,
          service_type: bookingServiceType,
          supplies: bookingSupplies,
          cleaner_id: recurringCleanerId || null,
          max_hours: bookingMaxHours,
          renurture_code: renurtureCode || undefined,
        })
      })
      if (res.ok) {
        setBookingSuccess(true)
        loadBookings(clientId)
      } else {
        const err = await res.json().catch(() => ({ error: 'Could not start your recurring schedule.' }))
        alert(err.error || 'Could not start your recurring schedule.')
      }
      setSubmittingBooking(false)
      return
    }

    const computedRate = bookingSupplies === 'we_bring' ? 69 : 59
    const res = await fetch('/api/client/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        date: bookingDate,
        time: bookingTime,
        service_type: bookingServiceType,
        hourly_rate: computedRate,
        estimated_hours: bookingHours,
        max_hours: bookingMaxHours,
        cleaner_id: bookingCleanerId || null,
        extra_cleaner_ids: bookingExtraCleaners,
        team_size: bookingTeamSize,
      })
    })
    if (res.ok) {
      setBookingSuccess(true)
      loadBookings(clientId)
    }
    setSubmittingBooking(false)
  }

  const formatPickedDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })
  }

  const nextBooking = upcomingBookings[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E2A4A] text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">The NYC Maid</p>
            <h1 className="text-xl font-semibold">Welcome back!</h1>
          </div>
          <button onClick={handleLogout} className="text-sm opacity-80 hover:opacity-100">
            Log out
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Push Notifications */}
        {clientId && !doNotService && (
          <div className="mb-4">
            <PushPrompt role="client" userId={clientId} />
          </div>
        )}

        {/* Review Prompt — show when client has completed bookings */}
        {pastBookings.length > 0 && !doNotService && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-lg mt-0.5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <div className="flex-1">
                <p className="text-[#1E2A4A] font-semibold text-sm">How was your cleaning?</p>
                <p className="text-gray-600 text-xs mt-0.5">Your review helps other New Yorkers find trusted cleaning services.</p>
              </div>
              <a href="https://g.page/r/CSX9IqciUG9SEAE/review" className="bg-[#1E2A4A] text-white px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap">Leave a Review</a>
            </div>
          </div>
        )}

        {/* DNS Block Notice */}
        {doNotService && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-center">
            <p className="text-lg font-semibold text-[#1E2A4A] mb-2">Account Restricted</p>
            <p className="text-gray-600 text-sm mb-4">
              Due to a cancellation against our no-cancellation policy, we are unable to continue servicing your account. We sincerely apologize for any inconvenience and wish you the best in finding another service provider.
            </p>
            <p className="text-gray-500 text-sm">
              If you believe this is an error, please contact us:
            </p>
            <div className="flex gap-3 mt-3">
              <a href="sms:2122028400" className="flex-1 py-3 bg-[#1E2A4A] text-white rounded-lg text-center font-medium">Text (212) 202-8400</a>
            </div>
          </div>
        )}

        {/* Saved addresses — add / edit / switch primary */}
        {!doNotService && clientId && <ClientAddresses clientId={clientId} />}

        {/* Next Cleaning Card */}
        {!doNotService && nextBooking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <p className="text-sm text-gray-500 mb-1">Next Cleaning</p>
            <p className="text-2xl font-bold text-[#1E2A4A]">{getDaysUntil(nextBooking.start_time)}</p>
            <p className="text-gray-600 mt-1">{formatDate(nextBooking.start_time)}</p>
            <p className="text-gray-600">{formatWindow(nextBooking.start_time)} • {nextBooking.cleaners?.name || 'Cleaner TBD'}</p>

            <div className="flex gap-3 mt-4">
              {canReschedule(nextBooking) && (
                <button
                  onClick={() => router.push(`/book/reschedule/${nextBooking.id}`)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] font-medium hover:bg-gray-50"
                >
                  Reschedule
                </button>
              )}
              <button
                onClick={() => openBookingPanel()}
                className="flex-1 py-2 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
              >
                Ready for another service?
              </button>
            </div>
          </div>
        ) : !doNotService && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-center">
            <p className="text-gray-500 mb-1">No upcoming cleanings</p>
            <button
              onClick={() => openBookingPanel()}
              className="mt-3 px-6 py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
            >
              Ready for another service?
            </button>
            <p className="text-xs text-gray-400 mt-1">(Book here directly)</p>
          </div>
        )}

        {/* Inline Booking Panel */}
        {showBooking && !doNotService && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#1E2A4A]">Book a Cleaning</h2>
              <button
                onClick={() => setShowBooking(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">&#10003;</div>
                <p className="text-lg font-semibold text-[#1E2A4A]">Booking request submitted!</p>
                <p className="text-gray-600 text-sm mt-2">Our team will review your booking request and confirm with you soon.</p>
                <p className="text-gray-500 text-sm mt-1">Thank you and welcome back!</p>
                <button
                  onClick={() => setShowBooking(false)}
                  className="mt-4 px-6 py-2 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Same-day / Emergency notice */}
                <div className="bg-[#A8F0DC]/20 border border-[#A8F0DC]/30 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-[#1E2A4A]"><span className="font-medium">Same-day or emergency?</span> Please text us directly:</p>
                  <div className="flex gap-3 mt-2">
                    <a href="sms:2122028400" className="flex-1 py-2 bg-[#1E2A4A] text-white rounded-lg text-center font-medium text-sm hover:bg-[#1E2A4A]/90">Text (212) 202-8400</a>
                  </div>
                </div>

                {/* Step 1: Date Picker */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pick a date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={minDate}
                    max={maxDate}
                    className="w-full border border-gray-300 rounded-lg p-3 text-[#1E2A4A] focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]"
                  />
                </div>

                {/* Same-day block */}
                {bookingDate && isSameDay(bookingDate) && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 font-medium">Same-day bookings are not available online</p>
                    <p className="text-yellow-700 text-sm mt-1">For same-day or emergency cleaning, please contact us directly:</p>
                    <div className="flex gap-3 mt-3">
                      <a href="sms:2122028400" className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-center font-medium text-sm">Text (212) 202-8400</a>
                    </div>
                  </div>
                )}

                {/* Service Type + Hours */}
                {bookingDate && !isSameDay(bookingDate) && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {serviceTypes.map(s => (
                          <button key={s} type="button" onClick={() => {
                            const hours = SERVICE_HOURS[s] || 2
                            setBookingServiceType(s)
                            setBookingHours(hours)
                            setBookingTime('')
                            if (bookingDate) fetchSlots(bookingDate, hours)
                          }} className={'p-2.5 rounded-lg border text-xs font-medium ' + (bookingServiceType === s ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Estimated Hours</label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => {
                          if (bookingHours > 1) {
                            const h = bookingHours - 1
                            setBookingHours(h)
                            setBookingTime('')
                            if (bookingDate) fetchSlots(bookingDate, h)
                          }
                        }} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-[#1E2A4A]" disabled={bookingHours <= 1}>-</button>
                        <span className="text-lg font-bold text-[#1E2A4A] min-w-[2rem] text-center">{bookingHours}</span>
                        <button type="button" onClick={() => {
                          if (bookingHours < 8) {
                            const h = bookingHours + 1
                            setBookingHours(h)
                            setBookingTime('')
                            if (bookingDate) fetchSlots(bookingDate, h)
                          }
                        }} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-[#1E2A4A]" disabled={bookingHours >= 8}>+</button>
                      </div>
                    </div>
                    {/* Cap hours — billing stops at this number even if the cleaner stays longer */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Cap at <span className="text-gray-400 font-normal">(optional)</span></label>
                      <select
                        value={bookingMaxHours ?? ''}
                        onChange={(e) => setBookingMaxHours(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#1E2A4A] bg-white"
                      >
                        <option value="">No cap</option>
                        {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>Stop billing at {h}hr</option>)}
                      </select>
                    </div>
                    {/* Supplies */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supplies</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setBookingSupplies('we_bring')} className={'p-2.5 rounded-lg border text-xs font-medium ' + (bookingSupplies === 'we_bring' ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                          <div>We bring everything</div>
                          <div className="text-[10px] opacity-70 mt-0.5">$69/hr</div>
                        </button>
                        <button type="button" onClick={() => setBookingSupplies('client')} className={'p-2.5 rounded-lg border text-xs font-medium ' + (bookingSupplies === 'client' ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                          <div>I provide supplies</div>
                          <div className="text-[10px] opacity-70 mt-0.5">$59/hr</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Time Slots */}
                {bookingDate && !isSameDay(bookingDate) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pick a time</label>
                    {loadingSlots ? (
                      <p className="text-gray-400 text-sm">Loading available times...</p>
                    ) : slots.length === 0 ? (
                      <p className="text-gray-500 text-sm">No slots available for this date. Try another day.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setBookingTime(slot.time)}
                            className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                              !slot.available
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : bookingTime === slot.time
                                  ? 'bg-[#1E2A4A] text-white'
                                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {slotTimeWindow(slot.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cleaner picker — always shown for one-time bookings. Without a slot,
                    the list is unscored; once date+time are picked, availability sorts. */}
                {!recurringEnabled && (
                  <div className="mb-4 border border-gray-200 bg-gray-50/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Choose your preferred cleaner</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Team size</span>
                        <select
                          value={bookingTeamSize}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10) || 1
                            const maxExtras = Math.max(0, n - 1)
                            setBookingTeamSize(n)
                            setBookingExtraCleaners(prev => prev.slice(0, maxExtras))
                          }}
                          className="px-2 py-0.5 border border-gray-300 rounded text-xs text-[#1E2A4A] bg-white"
                        >
                          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    {loadingOneTime && <p className="text-xs text-gray-400">Checking availability…</p>}
                    {!loadingOneTime && oneTimeAvailable.length === 0 && (
                      <p className="text-xs text-gray-500">No cleaners free — try a different time, or leave it for us to assign.</p>
                    )}
                    {!loadingOneTime && oneTimeAvailable.length > 0 && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => { setBookingCleanerId(''); setBookingExtraCleaners([]) }}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${!bookingCleanerId ? 'border-indigo-500 bg-indigo-50 font-medium text-[#1E2A4A]' : 'border-gray-200 hover:border-gray-300 text-[#1E2A4A]'}`}
                        >
                          Any available cleaner
                        </button>
                        {oneTimeAvailable.map(c => {
                          const isLead = bookingCleanerId === c.id
                          const isExtra = bookingExtraCleaners.includes(c.id)
                          const onClick = () => {
                            if (bookingTeamSize <= 1) {
                              setBookingCleanerId(c.id)
                              setBookingExtraCleaners([])
                              return
                            }
                            if (isLead) {
                              const [newLead, ...rest] = bookingExtraCleaners
                              setBookingCleanerId(newLead || '')
                              setBookingExtraCleaners(rest)
                            } else if (isExtra) {
                              setBookingExtraCleaners(prev => prev.filter(x => x !== c.id))
                            } else if (!bookingCleanerId) {
                              setBookingCleanerId(c.id)
                            } else if (bookingExtraCleaners.length < bookingTeamSize - 1) {
                              setBookingExtraCleaners(prev => [...prev, c.id])
                            }
                          }
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={onClick}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                                isLead
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : isExtra
                                    ? 'border-indigo-300 bg-indigo-50/60'
                                    : c.is_preferred
                                      ? 'border-amber-300 bg-amber-50/40'
                                      : 'border-gray-200 hover:border-gray-300'
                              } text-[#1E2A4A]`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {c.name}
                                  {isLead && bookingTeamSize > 1 && <span className="ml-1.5 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                                  {isExtra && <span className="ml-1.5 text-[9px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                                  {c.is_preferred && <span className="ml-1.5 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-semibold">★ PREFERRED</span>}
                                </span>
                                <span className="text-[10px] text-gray-500">{c.reason}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Notes */}
                {bookingDate && !isSameDay(bookingDate) && bookingTime && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes for your cleaner</label>
                    <textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
                      placeholder="Door codes, pet info, special instructions..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-[#1E2A4A] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]"
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">{clientNotes.length}/500</span>
                      <div className="flex items-center gap-2">
                        {notesSaved && <span className="text-xs text-green-600">Saved!</span>}
                        <button
                          onClick={saveNotes}
                          disabled={savingNotes}
                          className="px-4 py-1.5 bg-[#1E2A4A] text-white text-sm rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
                        >
                          {savingNotes ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3.5: Recurring (only for repeat clients) */}
                {bookingDate && !isSameDay(bookingDate) && bookingTime && pastBookings.length > 0 && (
                  <div className="mb-4 border border-amber-200 bg-amber-50/50 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recurringEnabled}
                        onChange={(e) => setRecurringEnabled(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#1E2A4A]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1E2A4A]">Make this recurring — save 10–20%</p>
                        <p className="text-xs text-gray-600">Lock in your time slot and your cleaner. Weekly saves 20%, biweekly/monthly saves 10%.</p>
                      </div>
                    </label>
                    {recurringEnabled && (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        {renurtureCode && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                            Promo code <span className="font-mono font-semibold">{renurtureCode}</span> applied — pick Monthly to get your full discount. We&apos;ll confirm the exact rate when you book.
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-[#1E2A4A] mb-1">Frequency</label>
                          <select
                            value={recurringFrequency}
                            onChange={(e) => setRecurringFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] bg-white text-sm"
                          >
                            <option value="weekly">Weekly — save 20%</option>
                            <option value="biweekly">Every 2 weeks — save 10%</option>
                            <option value="monthly">Monthly — save 10%</option>
                          </select>
                        </div>
                        {familiarCleaners.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-[#1E2A4A] mb-1">Cleaner</label>
                            <select
                              value={recurringCleanerId}
                              onChange={(e) => setRecurringCleanerId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] bg-white text-sm"
                            >
                              <option value="">Match me automatically</option>
                              {familiarCleaners.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}{c.id === preferredCleanerId ? ' (preferred)' : ''}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">We&apos;ll lock in this cleaner for every visit. We swap in a backup only if they&apos;re out.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Confirm */}
                {bookingDate && !isSameDay(bookingDate) && bookingTime && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Date:</span> {formatPickedDate(bookingDate)}{recurringEnabled && <span className="ml-2 text-amber-700 font-medium">+ recurring {recurringFrequency}</span>}</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Time:</span> {bookingTime}</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Service:</span> {bookingServiceType} — ~{bookingHours} hrs</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Estimated:</span> ${recurringEnabled ? Math.round(lastHourlyRate * bookingHours * (recurringFrequency === 'weekly' ? 0.8 : 0.9)) : lastHourlyRate * bookingHours}{recurringEnabled && <span className="ml-2 text-xs text-amber-700 font-medium">per visit ({recurringFrequency === 'weekly' ? '20%' : '10%'} off)</span>}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                      <p className="text-gray-700"><span className="font-medium text-[#1E2A4A]">Cancellation Policy:</span> First-time and one-time services cannot be cancelled or rescheduled. Recurring services require 7 days notice to reschedule — cancellations only if discontinuing service entirely with 7 days notice. We hold your spot without payment upfront, turning away other clients.</p>
                    </div>
                    <button
                      onClick={submitBooking}
                      disabled={submittingBooking}
                      className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
                    >
                      {submittingBooking ? 'Submitting...' : 'Confirm Booking'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Preferred Cleaner */}
        {familiarCleaners.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[#1E2A4A]">Preferred Cleaner</p>
                <p className="text-xs text-gray-500">When you book, we&apos;ll match you with this cleaner first whenever they&apos;re available.</p>
              </div>
              {preferredSaved && <span className="text-xs text-green-600 font-medium">Saved</span>}
            </div>
            <select
              value={preferredCleanerId || ''}
              onChange={(e) => savePreferredCleaner(e.target.value || null)}
              disabled={savingPreferred}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] bg-white text-sm disabled:opacity-50"
            >
              <option value="">No preference — match me with anyone</option>
              {familiarCleaners.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes for Cleaner */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm text-gray-500 mb-1">Notes for your cleaner</p>
          <textarea
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
            placeholder="Door codes, pet info, special instructions..."
            className="w-full border border-gray-300 rounded-lg p-3 text-[#1E2A4A] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]"
            rows={3}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">{clientNotes.length}/500</span>
            <div className="flex items-center gap-2">
              {notesSaved && <span className="text-xs text-green-600">Saved!</span>}
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-4 py-1.5 bg-[#1E2A4A] text-white text-sm rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2 font-medium ${activeTab === 'upcoming' ? 'text-[#1E2A4A] border-b-2 border-[#1E2A4A]' : 'text-gray-500'}`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-2 font-medium ${activeTab === 'past' ? 'text-[#1E2A4A] border-b-2 border-[#1E2A4A]' : 'text-gray-500'}`}
          >
            Past ({pastBookings.length})
          </button>
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).map((booking) => {
            const isExpanded = expandedBooking === booking.id
            const statusLabel = booking.status === 'pending' ? 'Awaiting confirmation'
              : booking.status === 'scheduled' ? 'Confirmed'
              : booking.status === 'completed' ? 'Completed'
              : booking.status === 'cancelled' ? 'Cancelled'
              : booking.status
            const statusColor = booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
              : booking.status === 'scheduled' ? 'bg-green-100 text-green-700'
              : booking.status === 'completed' ? 'bg-blue-100 text-blue-700'
              : booking.status === 'cancelled' ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-[#1E2A4A] shadow-md' : 'border-gray-200'}`}
              >
                {/* Tappable header */}
                <button
                  onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1E2A4A]">{formatDate(booking.start_time)}</p>
                      <p className="text-gray-600 text-sm">{formatWindow(booking.start_time)}</p>
                      <p className="text-gray-500 text-sm">{booking.cleaners?.name || 'Cleaner TBD'}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 ml-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Service</p>
                        <p className="text-[#1E2A4A] font-medium">{booking.service_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Price</p>
                        <p className="text-[#1E2A4A] font-medium">${(booking.price / 100).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Cleaner</p>
                        <p className="text-[#1E2A4A] font-medium">{booking.cleaners?.name || 'To be assigned'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Status</p>
                        <p className="text-[#1E2A4A] font-medium">{statusLabel}</p>
                      </div>
                      {booking.payment_status === 'paid' && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Payment</p>
                          <p className="text-green-700 font-medium">
                            Paid{(() => {
                              const PAYMENT_LABELS: Record<string, string> = {
                                credit_card: 'Credit Card',
                                cashapp: 'CashApp',
                                apple_pay: 'Apple Pay',
                                cash: 'Cash',
                              }
                              const label = booking.payment_method ? PAYMENT_LABELS[booking.payment_method] : ''
                              return label ? ` · ${label}` : ''
                            })()}
                          </p>
                        </div>
                      )}
                      {booking.recurring_type && (
                        <div className="col-span-2">
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Schedule</p>
                          <p className="text-[#1E2A4A] font-medium capitalize">{booking.recurring_type}</p>
                        </div>
                      )}
                    </div>

                    {/* Booking Notes */}
                    <div className="border-t border-gray-100 pt-3 mb-3">
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Notes</p>
                      <BookingNotes bookingId={booking.id} mode="client" authorName="Client" clientId={clientId} />
                    </div>

                    {/* Pending booking message */}
                    {booking.status === 'pending' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-sm">
                        <p className="text-yellow-800">Our team is reviewing this booking and will confirm with you shortly.</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {activeTab === 'upcoming' && canReschedule(booking) && !doNotService && (
                        <button
                          onClick={() => router.push(`/book/reschedule/${booking.id}`)}
                          className="w-full py-2.5 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
                        >
                          Reschedule
                        </button>
                      )}
                      {activeTab === 'upcoming' && !canReschedule(booking) && booking.status !== 'pending' && (
                        <p className="text-gray-400 text-xs text-center">
                          {!booking.recurring_type
                            ? 'First-time and one-time services cannot be rescheduled or cancelled. We hold your spot without payment upfront, turning away other clients.'
                            : 'Less than 7 days notice — text us to make changes.'}
                        </p>
                      )}
                      {activeTab === 'past' && booking.status === 'completed' && !doNotService && (
                        <button
                          onClick={() => {
                            const bDate = new Date(booking.start_time).toISOString().split('T')[0]
                            openBookingPanel(bDate >= minDate ? bDate : undefined)
                          }}
                          className="w-full py-2.5 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
                        >
                          Book Again
                        </button>
                      )}
                      <a
                        href="sms:2122028400"
                        className="w-full py-2.5 border border-gray-300 rounded-lg text-[#1E2A4A] font-medium text-center hover:bg-gray-50"
                      >
                        Text Us About This Booking
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).length === 0 && (
            <p className="text-center text-gray-500 py-8">No {activeTab} bookings</p>
          )}
        </div>
      </div>
    </div>
  )
}
