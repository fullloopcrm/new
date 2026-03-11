'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  hourly_rate: number | null
  pay_rate: number | null
  notes: string | null
  special_instructions: string | null
  check_in_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_time: string | null
  payment_status: string | null
  payment_method: string | null
  payment_date: string | null
  tip_amount: number | null
  clients: { name: string; phone: string | null; address: string | null; email: string | null } | null
  team_members: { name: string; phone: string | null; email: string | null } | null
}

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  scheduled: [
    { label: 'Confirm', next: 'confirmed', color: 'bg-indigo-600 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-red-50 text-red-700' },
  ],
  confirmed: [
    { label: 'Start', next: 'in_progress', color: 'bg-yellow-600 text-white' },
    { label: 'No Show', next: 'no_show', color: 'bg-teal-600 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-red-50 text-red-700' },
  ],
  in_progress: [
    { label: 'Complete', next: 'completed', color: 'bg-green-600 text-white' },
  ],
  completed: [
    { label: 'Mark Paid', next: 'paid', color: 'bg-emerald-600 text-white' },
  ],
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ start_time: '', end_time: '', notes: '', special_instructions: '', hourly_rate: '', pay_rate: '' })

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => setBooking(data.booking))
  }, [id])

  async function updateStatus(status: string) {
    if (status === 'paid') {
      // Mark paid via payment endpoint
      const res = await fetch(`/api/bookings/${id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', payment_method: paymentMethod || 'cash' }),
      })
      if (res.ok) {
        const { booking: updated } = await res.json()
        setBooking((prev) => prev ? { ...prev, ...updated } : prev)
      }
    } else {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const { booking: updated } = await res.json()
        setBooking((prev) => prev ? { ...prev, ...updated } : prev)
      }
    }
  }

  async function saveEdit() {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: editForm.start_time ? new Date(editForm.start_time).toISOString() : undefined,
        end_time: editForm.end_time ? new Date(editForm.end_time).toISOString() : undefined,
        notes: editForm.notes || null,
        special_instructions: editForm.special_instructions || null,
        hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null,
        pay_rate: editForm.pay_rate ? Number(editForm.pay_rate) : null,
      }),
    })
    if (res.ok) {
      const { booking: updated } = await res.json()
      setBooking(prev => prev ? { ...prev, ...updated } : prev)
      setEditing(false)
    }
  }

  async function deleteBooking() {
    if (!confirm('Delete this booking?')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    router.push('/dashboard/bookings')
  }

  if (!booking) return <p className="text-slate-400">Loading...</p>

  const actions = STATUS_ACTIONS[booking.status] || []

  return (
    <div>
      <Link href="/dashboard/bookings" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
        &larr; All Bookings
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {booking.service_type || 'Booking'}
          </h2>
          <p className="text-sm text-slate-400">
            {new Date(booking.start_time).toLocaleString()}
            {booking.end_time && ` — ${new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            setEditing(!editing)
            if (!editing && booking) {
              const toLocal = (iso: string) => { const d = new Date(iso); return d.toISOString().slice(0, 16) }
              setEditForm({
                start_time: booking.start_time ? toLocal(booking.start_time) : '',
                end_time: booking.end_time ? toLocal(booking.end_time) : '',
                notes: booking.notes || '',
                special_instructions: booking.special_instructions || '',
                hourly_rate: booking.hourly_rate?.toString() || '',
                pay_rate: booking.pay_rate?.toString() || '',
              })
            }
          }} className="px-4 py-2 text-sm text-slate-400 border border-slate-200 rounded-lg hover:text-slate-900 hover:bg-slate-50">
            {editing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button onClick={deleteBooking} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">
            Delete
          </button>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-sm text-slate-400 mr-2">Actions:</span>
          {actions.map((a) => (
            <button
              key={a.next}
              onClick={() => updateStatus(a.next)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${a.color}`}
            >
              {a.label}
            </button>
          ))}
          {booking.status === 'completed' && (
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Payment method</option>
              <option value="cash">Cash</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="apple_cash">Apple Cash</option>
              <option value="check">Check</option>
              <option value="card">Card</option>
            </select>
          )}
        </div>
      )}

      {editing && (
        <div className="border border-slate-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Edit Booking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Start Time</label>
              <input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">End Time</label>
              <input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Hourly Rate</label>
              <input type="number" value={editForm.hourly_rate} onChange={e => setEditForm({...editForm, hourly_rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Pay Rate</label>
              <input type="number" value={editForm.pay_rate} onChange={e => setEditForm({...editForm, pay_rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Special Instructions</label>
              <textarea value={editForm.special_instructions} onChange={e => setEditForm({...editForm, special_instructions: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold">Save Changes</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-900">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize font-medium">{booking.status.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Service</dt><dd>{booking.service_type || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Price</dt><dd>{booking.price != null ? `$${(booking.price / 100).toFixed(2)}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Hourly Rate</dt><dd>{booking.hourly_rate ? `$${booking.hourly_rate}/hr` : '—'}</dd></div>
              {booking.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{booking.notes}</dd></div>}
              {booking.special_instructions && <div><dt className="text-slate-400 mb-1">Special Instructions</dt><dd className="bg-yellow-500/10 rounded p-2">{booking.special_instructions}</dd></div>}
            </dl>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Check-in/out</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Check-in</dt>
                <dd>{booking.check_in_time ? new Date(booking.check_in_time).toLocaleString() : 'Not checked in'}</dd>
              </div>
              {booking.check_in_lat && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">GPS</dt>
                  <dd className="font-mono text-xs">{booking.check_in_lat.toFixed(6)}, {booking.check_in_lng?.toFixed(6)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">Check-out</dt>
                <dd>{booking.check_out_time ? new Date(booking.check_out_time).toLocaleString() : 'Not checked out'}</dd>
              </div>
              {booking.check_in_time && booking.check_out_time && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Duration</dt>
                  <dd>{((new Date(booking.check_out_time).getTime() - new Date(booking.check_in_time).getTime()) / 3600000).toFixed(1)} hours</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Payment</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize">{booking.payment_status || 'unpaid'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Method</dt><dd className="capitalize">{booking.payment_method?.replace('_', ' ') || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Paid On</dt><dd>{booking.payment_date ? new Date(booking.payment_date).toLocaleDateString() : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Tip</dt><dd>{booking.tip_amount != null ? `$${(booking.tip_amount / 100).toFixed(2)}` : '—'}</dd></div>
            </dl>
            {booking.payment_status !== 'paid' && booking.price && booking.price > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={async () => {
                    const res = await fetch('/api/payments/link', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ booking_id: booking.id }),
                    })
                    if (res.ok) {
                      const { url } = await res.json()
                      navigator.clipboard.writeText(url)
                      alert('Payment link copied!')
                    }
                  }}
                  className="flex-1 text-sm bg-purple-50 text-purple-700 py-2 rounded-lg font-medium hover:bg-purple-500/30"
                >
                  Send Payment Link
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/payments/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ booking_id: booking.id }),
                    })
                    if (res.ok) {
                      const { url } = await res.json()
                      if (url) window.open(url, '_blank')
                    }
                  }}
                  className="flex-1 text-sm bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-500/30"
                >
                  Collect via Stripe
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
            {booking.clients ? (
              <dl className="space-y-2 text-sm">
                <dd className="font-medium">{booking.clients.name}</dd>
                {booking.clients.phone && <dd className="text-slate-400">{booking.clients.phone}</dd>}
                {booking.clients.email && <dd className="text-slate-400">{booking.clients.email}</dd>}
                {booking.clients.address && <dd className="text-slate-400">{booking.clients.address}</dd>}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">No client assigned</p>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Team Member</h3>
            {booking.team_members ? (
              <dl className="space-y-2 text-sm">
                <dd className="font-medium">{booking.team_members.name}</dd>
                {booking.team_members.phone && <dd className="text-slate-400">{booking.team_members.phone}</dd>}
                {booking.team_members.email && <dd className="text-slate-400">{booking.team_members.email}</dd>}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">No team member assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
