'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PushPrompt from '@/components/PushPrompt'
import { useServiceTypes } from '@/lib/useServiceTypes'
import BookingNotes from '@/components/BookingNotes'

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
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
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState('')
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [clientNotes, setClientNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
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
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [lastServiceType, setLastServiceType] = useState('Standard Cleaning')
  const [lastHourlyRate, setLastHourlyRate] = useState(75)
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [doNotService, setDoNotService] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('client_id')
    const name = localStorage.getItem('client_name')

    if (!id) {
      router.push('/book')
      return
    }

    setClientId(id)
    setClientName(name || 'there')
    if (localStorage.getItem('client_dns') === 'true') setDoNotService(true)
    loadBookings(id)
    loadNotes(id)
  }, [router])

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
    localStorage.removeItem('client_name')
    localStorage.removeItem('client_email')
    router.push('/book')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
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
    const res = await fetch('/api/client/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        date: bookingDate,
        time: bookingTime,
        service_type: bookingServiceType,
        hourly_rate: lastHourlyRate,
        estimated_hours: bookingHours,
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
            <h1 className="text-xl font-semibold">Welcome back, {clientName.split(' ')[0]}!</h1>
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
              <a href="/reviews/submit" className="bg-[#1E2A4A] text-white px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap">Leave a Review</a>
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
              <a href="sms:6464900130" className="flex-1 py-3 bg-[#1E2A4A] text-white rounded-lg text-center font-medium">Text (646) 490-0130</a>
            </div>
          </div>
        )}

        {/* Next Cleaning Card */}
        {!doNotService && nextBooking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <p className="text-sm text-gray-500 mb-1">Next Cleaning</p>
            <p className="text-2xl font-bold text-[#1E2A4A]">{getDaysUntil(nextBooking.start_time)}</p>
            <p className="text-gray-600 mt-1">{formatDate(nextBooking.start_time)}</p>
            <p className="text-gray-600">{formatTime(nextBooking.start_time)} • {nextBooking.cleaners?.name || 'Cleaner TBD'}</p>

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
                    <a href="sms:6464900130" className="flex-1 py-2 bg-[#1E2A4A] text-white rounded-lg text-center font-medium text-sm hover:bg-[#1E2A4A]/90">Text (646) 490-0130</a>
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
                      <a href="sms:6464900130" className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-center font-medium text-sm">Text (646) 490-0130</a>
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
                            {slot.time}
                          </button>
                        ))}
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

                {/* Step 4: Confirm */}
                {bookingDate && !isSameDay(bookingDate) && bookingTime && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Date:</span> {formatPickedDate(bookingDate)}</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Time:</span> {bookingTime}</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Service:</span> {bookingServiceType} — ~{bookingHours} hrs</p>
                      <p className="text-gray-600"><span className="font-medium text-[#1E2A4A]">Estimated:</span> ${lastHourlyRate * bookingHours}</p>
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
                      <p className="text-gray-600 text-sm">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
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
                      <BookingNotes bookingId={booking.id} mode="client" authorName={clientName} clientId={clientId} />
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
                        href="sms:6464900130"
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
