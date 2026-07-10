'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface TimeSlot {
  time: string
  cleaners: { id: string; name: string }[]
}

export default function ReschedulePage() {
  useEffect(() => { document.title = 'Reschedule | The Florida Maid' }, []);
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBooking()
  }, [bookingId])

  const loadBooking = async () => {
    const res = await fetch(`/api/client/booking/${bookingId}`)
    if (res.ok) {
      setBooking(await res.json())
    }
    setLoading(false)
  }

  const loadAvailability = async (date: string) => {
    setLoading(true)
    setSelectedDate(date)
    setSelectedSlot(null)
    
    const duration = booking.service_type === 'Deep Cleaning' ? 4 : 
                     booking.service_type === 'Move In/Out' ? 5 : 2
    
    const res = await fetch(`/api/client/availability?date=${date}&duration=${duration}`)
    if (res.ok) {
      const data = await res.json()
      setAvailableSlots(data.slots)
    }
    setLoading(false)
  }

  const handleReschedule = async () => {
    if (!selectedSlot) return
    setSaving(true)

    const duration = booking.service_type === 'Deep Cleaning' ? 4 : 
                     booking.service_type === 'Move In/Out' ? 5 : 2

    const startTime = new Date(`${selectedDate}T${selectedSlot.time}`)
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000)

    const res = await fetch(`/api/client/reschedule/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        cleaner_id: selectedSlot.cleaners[0]?.id
      })
    })

    if (res.ok) {
      router.push('/portal?rescheduled=1')
    } else {
      alert('Failed to reschedule. Please try again.')
    }
    setSaving(false)
  }

  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const canReschedule = () => {
    if (!booking) return false
    // One-time services: no rescheduling
    if (!booking.recurring_type) return false
    // Recurring: must be 7+ days out
    const now = new Date()
    const bookingDate = new Date(booking.start_time)
    const daysUntil = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 7
  }

  if (loading && !booking) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>
  }

  if (booking && !canReschedule()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1E2A4A] text-white p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-white">&larr;</button>
            <div>
              <p className="text-sm opacity-80">The Florida Maid</p>
              <h1 className="text-xl font-semibold">Reschedule</h1>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-lg font-semibold text-[#1E2A4A] mb-2">Unable to Reschedule</p>
            <p className="text-gray-600 text-sm mb-4">
              {!booking.recurring_type
                ? 'First-time and one-time services cannot be rescheduled or cancelled. We hold your spot without payment upfront, turning away other clients.'
                : 'Recurring services require at least 7 days notice to reschedule. Cancellations only if discontinuing service entirely with 7 days notice.'}
            </p>
            <p className="text-gray-500 text-sm mb-4">Need help? Contact us directly:</p>
            <div className="flex gap-3">
              <a href="tel:9547103636" className="flex-1 py-3 bg-[#1E2A4A] text-white rounded-lg text-center font-medium">Call (954) 710-3636</a>
              <a href="sms:9547103636" className="flex-1 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-center font-medium">Text Us</a>
            </div>
            <button onClick={() => router.push('/portal')} className="mt-4 text-gray-500 text-sm">Back to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E2A4A] text-white p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white">&larr;</button>
          <div>
            <p className="text-sm opacity-80">The Florida Maid</p>
            <h1 className="text-xl font-semibold">Reschedule</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!selectedDate ? (
          <div>
            <h2 className="text-lg font-semibold text-[#1E2A4A] mb-4">Select New Date</h2>
            <div className="grid grid-cols-3 gap-2">
              {dates.map((date) => (
                <button
                  key={date}
                  onClick={() => loadAvailability(date)}
                  className="p-3 rounded-lg border border-gray-200 bg-white text-center hover:border-[#1E2A4A]"
                >
                  <p className="text-sm text-[#1E2A4A]">{formatDateLabel(date)}</p>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedSlot ? (
          <div>
            <h2 className="text-lg font-semibold text-[#1E2A4A] mb-2">Select Time</h2>
            <p className="text-gray-500 mb-4">{formatDateLabel(selectedDate)}</p>
            
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No available slots</p>
                <button onClick={() => setSelectedDate('')} className="text-[#1E2A4A] underline">Choose another date</button>
              </div>
            ) : (
              <div className="space-y-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-white text-left hover:border-[#1E2A4A]"
                  >
                    <p className="font-semibold text-[#1E2A4A]">{slot.time}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedDate('')} className="mt-4 text-gray-500">← Back</button>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">New Appointment</h3>
              <p className="text-gray-600">{formatDateLabel(selectedDate)}</p>
              <p className="text-gray-600">{selectedSlot.time}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-sm">
              <p className="text-gray-700"><span className="font-medium text-[#1E2A4A]">Cancellation Policy:</span> First-time and one-time services cannot be cancelled or rescheduled. Recurring services require 7 days notice to reschedule — cancellations only if discontinuing service entirely with 7 days notice. We hold your spot without payment upfront, turning away other clients.</p>
            </div>

            <button
              onClick={handleReschedule}
              disabled={saving}
              className="w-full py-4 bg-[#1E2A4A] text-white text-lg font-semibold rounded-xl disabled:opacity-50"
            >
              {saving ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
            <button onClick={() => setSelectedSlot(null)} className="mt-4 text-gray-500 w-full text-center">← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
