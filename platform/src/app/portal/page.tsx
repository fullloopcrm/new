'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePortalAuth } from './layout'
import PushPrompt from '@/components/PushPrompt'

interface Booking {
  id: string
  start_time: string
  end_time: string | null
  service_type: string | null
  price: number | null
  status: string
  notes: string | null
  recurring_type: string | null
  team_members: { name: string } | null
}

interface ServiceType {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
}

interface Slot {
  time: string
  available: boolean
}

export default function PortalHomePage() {
  const { auth } = usePortalAuth()
  const router = useRouter()

  // Core data
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)

  // Notes
  const [clientNotes, setClientNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Inline booking
  const [showBooking, setShowBooking] = useState(false)
  const [services, setServices] = useState<ServiceType[]>([])
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingHours, setBookingHours] = useState(2)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  // DNS (do-not-service) blocking
  const [doNotService, setDoNotService] = useState(false)

  const tenantPhone = auth?.tenant && 'phone' in auth.tenant ? (auth.tenant as { phone?: string }).phone : ''

  useEffect(() => {
    if (!auth) { router.push('/portal/login'); return }
    loadBookings()
    loadNotes()
    loadServices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  async function loadBookings() {
    if (!auth) return
    const res = await fetch('/api/portal/bookings', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) {
      const data = await res.json()
      const all: Booking[] = data.bookings || []
      if (data.do_not_service) setDoNotService(true)
      const now = new Date()
      setUpcomingBookings(
        all.filter((b) => ['pending', 'scheduled', 'confirmed', 'in_progress'].includes(b.status) && new Date(b.start_time) >= now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      )
      setPastBookings(
        all.filter((b) => ['completed', 'paid', 'cancelled'].includes(b.status) || new Date(b.start_time) < now)
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      )
    }
    setLoading(false)
  }

  async function loadNotes() {
    if (!auth) return
    const res = await fetch('/api/portal/notes', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setClientNotes(data.notes || '')
    }
  }

  async function loadServices() {
    if (!auth) return
    const res = await fetch('/api/portal/services', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setServices(data.services || [])
    }
  }

  async function saveNotes() {
    if (!auth) return
    setSavingNotes(true)
    setNotesSaved(false)
    const res = await fetch('/api/portal/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ notes: clientNotes }),
    })
    if (res.ok) {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }
    setSavingNotes(false)
  }

  // Date bounds
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]
  const maxDateObj = new Date()
  maxDateObj.setDate(maxDateObj.getDate() + 60)
  const maxDate = maxDateObj.toISOString().split('T')[0]

  const isSameDay = (date: string) => date === new Date().toISOString().split('T')[0]

  async function fetchSlots(date: string, hours?: number) {
    if (!auth || isSameDay(date)) { setSlots([]); return }
    setLoadingSlots(true)
    setSlots([])
    setBookingTime('')
    const duration = hours || bookingHours
    const res = await fetch(`/api/portal/availability?date=${date}&duration=${duration}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setSlots(data.slots || [])
    }
    setLoadingSlots(false)
  }

  function handleDateChange(date: string) {
    setBookingDate(date)
    setBookingTime('')
    setBookingSuccess(false)
    if (date) fetchSlots(date)
  }

  function openBookingPanel(preselectedDate?: string) {
    setShowBooking(true)
    setBookingDate(preselectedDate || '')
    setBookingTime('')
    setSlots([])
    setBookingSuccess(false)
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0])
      setBookingHours(services[0].default_duration_hours)
    }
    if (preselectedDate) fetchSlots(preselectedDate)
  }

  function selectService(svc: ServiceType) {
    setSelectedService(svc)
    setBookingHours(svc.default_duration_hours)
    setBookingTime('')
    if (bookingDate) fetchSlots(bookingDate, svc.default_duration_hours)
  }

  async function submitBooking() {
    if (!auth || !bookingDate || !bookingTime || !selectedService) return
    setSubmittingBooking(true)

    // Parse the selected time into a datetime
    const [timePart, ampm] = bookingTime.split(' ')
    const [hourStr, minStr] = timePart.split(':')
    let hour = parseInt(hourStr)
    if (ampm === 'PM' && hour !== 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    const startTime = new Date(`${bookingDate}T${String(hour).padStart(2, '0')}:${minStr}:00`)
    const endTime = new Date(startTime.getTime() + bookingHours * 3600000)

    const res = await fetch('/api/portal/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        service_type_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: clientNotes || null,
      }),
    })
    if (res.ok) {
      setBookingSuccess(true)
      loadBookings()
    }
    setSubmittingBooking(false)
  }

  // Reschedule logic (like nycmaid: recurring only, 7+ days notice)
  const canReschedule = (booking: Booking) => {
    if (!booking.recurring_type) return false
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / 86400000)
    return daysUntil >= 7
  }

  // Helpers
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const formatPickedDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  }
  const getDaysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (diff <= 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
  }
  const statusBadge = (s: string) => {
    if (s === 'pending') return { cls: 'bg-yellow-100 text-yellow-700', label: 'Awaiting confirmation' }
    if (s === 'scheduled' || s === 'confirmed') return { cls: 'bg-green-100 text-green-700', label: 'Confirmed' }
    if (s === 'completed' || s === 'paid') return { cls: 'bg-blue-100 text-blue-700', label: 'Completed' }
    if (s === 'cancelled') return { cls: 'bg-red-100 text-red-700', label: 'Cancelled' }
    if (s === 'in_progress') return { cls: 'bg-teal-100 text-teal-700', label: 'In Progress' }
    return { cls: 'bg-gray-100 text-gray-600', label: s }
  }

  if (!auth) return null
  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading...</p></div>

  const nextBooking = upcomingBookings[0]

  return (
    <div className="pb-20 space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Welcome back, {auth.client.name?.split(' ')[0]}!
        </h1>
        <p className="text-sm text-slate-400">{auth.tenant.name}</p>
      </div>

      {/* Push Notifications */}
      {!doNotService && (
        <PushPrompt role="client" userId={auth.client.id} />
      )}

      {/* DNS Block Notice */}
      {doNotService && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-lg font-semibold text-slate-800 mb-2">Account Restricted</p>
          <p className="text-slate-500 text-sm mb-4">
            Due to a policy violation, we are unable to continue servicing your account. We sincerely apologize for any inconvenience.
          </p>
          {tenantPhone && (
            <>
              <p className="text-slate-400 text-sm">If you believe this is an error, please contact us:</p>
              <div className="flex gap-3 mt-3">
                <a href={`tel:${tenantPhone}`} className="flex-1 py-3 bg-slate-800 text-white rounded-lg text-center font-medium text-sm">Call</a>
                <a href={`sms:${tenantPhone}`} className="flex-1 py-3 border border-gray-300 rounded-lg text-slate-700 text-center font-medium text-sm">Text</a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Next Appointment Card */}
      {!doNotService && nextBooking ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-slate-400 mb-1">Next Appointment</p>
          <p className="text-2xl font-bold text-slate-800">{getDaysUntil(nextBooking.start_time)}</p>
          <p className="text-slate-600 mt-1">{formatDate(nextBooking.start_time)}</p>
          <p className="text-slate-500 text-sm">
            {formatTime(nextBooking.start_time)} · {nextBooking.team_members?.name || 'Team Member TBD'}
          </p>
          <div className="flex gap-3 mt-4">
            {canReschedule(nextBooking) && (
              <Link
                href={`/portal/bookings/${nextBooking.id}`}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-slate-700 font-medium text-center text-sm"
              >
                Reschedule
              </Link>
            )}
            <button
              onClick={() => openBookingPanel()}
              className="flex-1 py-2.5 bg-slate-800 text-white rounded-lg font-medium text-sm"
            >
              Book Another
            </button>
          </div>
        </div>
      ) : !doNotService && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-slate-400 mb-1">No upcoming appointments</p>
          <button
            onClick={() => openBookingPanel()}
            className="mt-3 px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm"
          >
            Book an Appointment
          </button>
          <p className="text-xs text-slate-400 mt-1">(Book here directly)</p>
        </div>
      )}

      {/* Inline Booking Panel */}
      {showBooking && !doNotService && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Book an Appointment</h2>
            <button onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
              &times;
            </button>
          </div>

          {bookingSuccess ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">&#10003;</div>
              <p className="text-lg font-semibold text-slate-800">Booking request submitted!</p>
              <p className="text-slate-500 text-sm mt-2">We&apos;ll review your booking and confirm shortly.</p>
              <p className="text-slate-400 text-sm mt-1">Thank you and welcome back!</p>
              <button
                onClick={() => setShowBooking(false)}
                className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Same-day / Emergency notice */}
              {tenantPhone && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-slate-700">
                    <span className="font-medium">Same-day or emergency?</span> Please contact us directly:
                  </p>
                  <div className="flex gap-3 mt-2">
                    <a href={`tel:${tenantPhone}`} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-center font-medium text-sm">
                      Call
                    </a>
                    <a href={`sms:${tenantPhone}`} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-center font-medium text-sm">
                      Text
                    </a>
                  </div>
                </div>
              )}

              {/* Step 1: Date Picker */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Pick a date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="w-full border border-gray-300 rounded-lg p-3 text-slate-800 text-sm"
                />
              </div>

              {/* Same-day block */}
              {bookingDate && isSameDay(bookingDate) && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-medium text-sm">Same-day bookings are not available online</p>
                  <p className="text-yellow-700 text-xs mt-1">For same-day or emergency requests, please contact us directly:</p>
                  {tenantPhone && (
                    <div className="flex gap-3 mt-3">
                      <a href={`tel:${tenantPhone}`} className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-center font-medium text-sm">Call</a>
                      <a href={`sms:${tenantPhone}`} className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-center font-medium text-sm">Text</a>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Service Type */}
              {bookingDate && !isSameDay(bookingDate) && services.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectService(s)}
                        className={`p-2.5 rounded-lg border text-xs font-medium ${
                          selectedService?.id === s.id
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-gray-200 text-slate-600 hover:bg-gray-50'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Estimated Hours */}
              {bookingDate && !isSameDay(bookingDate) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Estimated Hours</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (bookingHours > 1) {
                            const h = bookingHours - 1
                            setBookingHours(h)
                            setBookingTime('')
                            if (bookingDate) fetchSlots(bookingDate, h)
                          }
                        }}
                        disabled={bookingHours <= 1}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-slate-800 disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold text-slate-800 min-w-[2rem] text-center">{bookingHours}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (bookingHours < 8) {
                            const h = bookingHours + 1
                            setBookingHours(h)
                            setBookingTime('')
                            if (bookingDate) fetchSlots(bookingDate, h)
                          }
                        }}
                        disabled={bookingHours >= 8}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-slate-800 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Time Slots */}
              {bookingDate && !isSameDay(bookingDate) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pick a time</label>
                  {loadingSlots ? (
                    <p className="text-slate-400 text-sm">Loading available times...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-slate-400 text-sm">No slots available for this date. Try another day.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setBookingTime(slot.time)}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                            !slot.available
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : bookingTime === slot.time
                                ? 'bg-slate-800 text-white'
                                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Notes for team member */}
              {bookingDate && !isSameDay(bookingDate) && bookingTime && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes for your team member</label>
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
                    placeholder="Door codes, parking info, special instructions..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-slate-800 text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-300">{clientNotes.length}/500</span>
                    <div className="flex items-center gap-2">
                      {notesSaved && <span className="text-xs text-green-600">Saved!</span>}
                      <button
                        onClick={saveNotes}
                        disabled={savingNotes}
                        className="px-4 py-1.5 bg-slate-800 text-white text-xs rounded-lg font-medium disabled:opacity-50"
                      >
                        {savingNotes ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Confirm */}
              {bookingDate && !isSameDay(bookingDate) && bookingTime && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-800">Date:</span> {formatPickedDate(bookingDate)}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-800">Time:</span> {bookingTime}
                    </p>
                    {selectedService && (
                      <>
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-800">Service:</span> {selectedService.name} — ~{bookingHours} hrs
                        </p>
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-800">Estimated:</span> ${selectedService.default_hourly_rate * bookingHours}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-slate-700">
                      <span className="font-medium text-slate-800">Cancellation Policy:</span> One-time services are non-cancellable. Recurring clients require 7 days notice for cancellations.
                    </p>
                  </div>
                  <button
                    onClick={submitBooking}
                    disabled={submittingBooking}
                    className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {submittingBooking ? 'Submitting...' : 'Confirm Booking'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Notes for Team Member */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-slate-800 mb-2">Notes for your team member</p>
        <textarea
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
          placeholder="Door code, parking info, special requests..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-300">{clientNotes.length}/500</span>
          <div className="flex items-center gap-2">
            {notesSaved && <span className="text-xs text-green-600">Saved!</span>}
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-4 py-1.5 bg-slate-800 text-white text-xs rounded-lg font-medium disabled:opacity-50"
            >
              {savingNotes ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-2 font-medium text-sm ${
            activeTab === 'upcoming' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400'
          }`}
        >
          Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`pb-2 font-medium text-sm ${
            activeTab === 'past' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400'
          }`}
        >
          Past ({pastBookings.length})
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).map((booking) => {
          const isExpanded = expandedBooking === booking.id
          const badge = statusBadge(booking.status)

          return (
            <div
              key={booking.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? 'border-slate-800 shadow-md' : 'border-gray-200'
              }`}
            >
              {/* Tappable header */}
              <button
                onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{formatDate(booking.start_time)}</p>
                    <p className="text-slate-500 text-xs">
                      {formatTime(booking.start_time)}
                      {booking.end_time && ` — ${formatTime(booking.end_time)}`}
                    </p>
                    <p className="text-slate-400 text-xs">{booking.team_members?.name || 'Team Member TBD'}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 ml-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className={`text-xs text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                    {booking.service_type && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Service</p>
                        <p className="text-slate-800 font-medium">{booking.service_type}</p>
                      </div>
                    )}
                    {booking.price != null && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Price</p>
                        <p className="text-slate-800 font-medium">${(booking.price / 100).toFixed(0)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Team Member</p>
                      <p className="text-slate-800 font-medium">{booking.team_members?.name || 'To be assigned'}</p>
                    </div>
                    {booking.recurring_type && (
                      <div className="col-span-2">
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Schedule</p>
                        <p className="text-slate-800 font-medium capitalize">{booking.recurring_type}</p>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="text-sm mb-3">
                      <span className="text-slate-400">Notes: </span>{booking.notes}
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-sm">
                      <p className="text-yellow-800">Awaiting confirmation from the business.</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {activeTab === 'upcoming' && canReschedule(booking) && !doNotService && (
                      <Link
                        href={`/portal/bookings/${booking.id}`}
                        className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-medium text-sm text-center"
                      >
                        Reschedule
                      </Link>
                    )}
                    {activeTab === 'upcoming' && !canReschedule(booking) && booking.status !== 'pending' && (
                      <p className="text-slate-400 text-xs text-center">
                        {!booking.recurring_type
                          ? 'One-time services cannot be rescheduled or cancelled.'
                          : 'Less than 7 days notice — contact us to make changes.'}
                      </p>
                    )}
                    {activeTab === 'past' && (booking.status === 'completed' || booking.status === 'paid') && !doNotService && (
                      <button
                        onClick={() => {
                          const bDate = new Date(booking.start_time).toISOString().split('T')[0]
                          openBookingPanel(bDate >= minDate ? bDate : undefined)
                        }}
                        className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm"
                      >
                        Book Again
                      </button>
                    )}
                    {tenantPhone && (
                      <a
                        href={`sms:${tenantPhone}`}
                        className="w-full py-2.5 border border-gray-300 rounded-lg text-slate-700 font-medium text-sm text-center"
                      >
                        Text Us About This Booking
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">
            No {activeTab} bookings
          </p>
        )}
      </div>

      {/* Feedback link */}
      <Link href="/portal/feedback" className="block text-center text-sm text-slate-400 hover:text-slate-500 mt-4">
        Leave Feedback
      </Link>
    </div>
  )
}
