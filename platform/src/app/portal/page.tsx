'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePortalAuth } from './layout'

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  status: string
  team_members: { name: string } | null
}

export default function PortalHomePage() {
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!auth) { router.push('/portal/login'); return }
    fetch('/api/portal/bookings', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
  }, [auth, router])

  if (!auth) return null

  const upcoming = bookings.filter((b) => ['pending', 'scheduled', 'confirmed'].includes(b.status))
  const past = bookings.filter((b) => ['completed', 'paid'].includes(b.status))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Welcome, {auth.client.name}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{auth.tenant.name}</p>

      <Link href="/portal/book" className="block w-full bg-gray-900 text-white text-center py-3 rounded-xl font-medium mb-6">
        Book an Appointment
      </Link>

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <Link key={b.id} href={`/portal/bookings/${b.id}`} className="block bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{b.service_type || 'Appointment'}</p>
                    <p className="text-xs text-gray-500">{new Date(b.start_time).toLocaleString()}</p>
                    {b.team_members && <p className="text-xs text-gray-400">{b.team_members.name}</p>}
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{b.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Past Bookings</h2>
          <div className="space-y-2">
            {past.slice(0, 5).map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{b.service_type || 'Appointment'}</p>
                    <p className="text-xs text-gray-500">{new Date(b.start_time).toLocaleDateString()}</p>
                  </div>
                  <Link href="/portal/book" className="text-xs text-blue-600 font-medium">Book Again</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/portal/feedback" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-8">
        Leave Feedback
      </Link>
    </div>
  )
}
