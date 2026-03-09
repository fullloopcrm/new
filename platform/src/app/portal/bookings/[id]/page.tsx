'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePortalAuth } from '../../layout'

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  notes: string | null
  team_members: { name: string; phone: string | null } | null
}

export default function PortalBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    if (!auth) { router.push('/portal/login'); return }
    fetch(`/api/portal/bookings/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setBooking(data.booking))
  }, [id, auth, router])

  async function reschedule() {
    if (!auth || !rescheduleDate) return
    setRescheduling(true)
    const res = await fetch(`/api/portal/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ start_time: new Date(rescheduleDate).toISOString() }),
    })
    if (res.ok) {
      const { booking: updated } = await res.json()
      setBooking(updated)
      setRescheduleDate('')
    }
    setRescheduling(false)
  }

  async function cancelBooking() {
    if (!auth) return
    setCancelling(true)
    const res = await fetch(`/api/portal/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) {
      const { booking: updated } = await res.json()
      setBooking(updated)
    }
    setCancelling(false)
    setShowCancelConfirm(false)
  }

  if (!auth || !booking) return <p className="text-gray-400 pt-8 text-center">Loading...</p>

  const canReschedule = ['pending', 'scheduled', 'confirmed'].includes(booking.status)
  const canCancel = ['scheduled', 'confirmed'].includes(booking.status)

  return (
    <div>
      <Link href="/portal" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
        &larr; Back
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-6">{booking.service_type || 'Booking'}</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 mb-6">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Status</span><span className="capitalize font-medium">{booking.status}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Date</span><span>{new Date(booking.start_time).toLocaleString()}</span></div>
        {booking.end_time && <div className="flex justify-between text-sm"><span className="text-gray-400">End</span><span>{new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>}
        {booking.price != null && <div className="flex justify-between text-sm"><span className="text-gray-400">Price</span><span>${(booking.price / 100).toFixed(2)}</span></div>}
        {booking.team_members && <div className="flex justify-between text-sm"><span className="text-gray-400">Team Member</span><span>{booking.team_members.name}</span></div>}
        {booking.notes && <div className="text-sm"><span className="text-gray-400">Notes: </span>{booking.notes}</div>}
      </div>

      {canReschedule && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">Reschedule</h2>
          <input
            type="datetime-local"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
          <button
            onClick={reschedule}
            disabled={!rescheduleDate || rescheduling}
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {rescheduling ? 'Rescheduling...' : 'Reschedule'}
          </button>
        </div>
      )}

      {canCancel && !showCancelConfirm && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full mt-4 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
        >
          Cancel Booking
        </button>
      )}

      {showCancelConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-sm text-red-800 mb-3">Are you sure you want to cancel this booking?</p>
          <div className="flex gap-3">
            <button
              onClick={cancelBooking}
              disabled={cancelling}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
            >
              No, Keep It
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
