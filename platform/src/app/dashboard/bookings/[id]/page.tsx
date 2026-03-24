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
  actual_hours: number | null
  team_pay: number | null
  team_paid: boolean | null
  team_paid_at: string | null
  discount_enabled: boolean | null
  notes: string | null
  special_instructions: string | null
  check_in_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_time: string | null
  check_out_lat: number | null
  check_out_lng: number | null
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
  const [copied, setCopied] = useState('')
  const [sendingHeadsUp, setSendingHeadsUp] = useState(false)

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => setBooking(data.booking))
  }, [id])

  function reload() {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => setBooking(data.booking))
  }

  async function updateStatus(status: string) {
    if (status === 'paid') {
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

  async function updateBooking(fields: Record<string, unknown>) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const { booking: updated } = await res.json()
      setBooking(prev => prev ? { ...prev, ...updated } : prev)
    }
  }

  async function updatePayment(fields: Record<string, unknown>) {
    const res = await fetch(`/api/bookings/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const { booking: updated } = await res.json()
      setBooking(prev => prev ? { ...prev, ...updated } : prev)
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

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!booking) return <p className="text-slate-400">Loading...</p>

  const actions = STATUS_ACTIONS[booking.status] || []

  // Compute actual labor
  const estimatedHours = booking.start_time && booking.end_time
    ? (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 3600000
    : null
  const clockedHours = booking.check_in_time && booking.check_out_time
    ? (new Date(booking.check_out_time).getTime() - new Date(booking.check_in_time).getTime()) / 3600000
    : null
  const actualHours = booking.actual_hours || clockedHours
  const estimatedPrice = booking.price != null ? booking.price / 100 : null
  const actualPrice = actualHours && booking.hourly_rate ? actualHours * booking.hourly_rate : null
  const actualPriceWithDiscount = actualPrice && booking.discount_enabled ? actualPrice * 0.9 : actualPrice
  const autoTeamPay = actualHours && booking.pay_rate ? actualHours * booking.pay_rate : null
  const teamPortalLink = typeof window !== 'undefined' ? `${window.location.origin}/team/${id}` : `/team/${id}`

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
          <button
            onClick={() => copyText(teamPortalLink, 'team-link')}
            className="px-4 py-2 text-sm text-slate-400 border border-slate-200 rounded-lg hover:text-slate-900 hover:bg-slate-50"
          >
            {copied === 'team-link' ? 'Copied!' : 'Copy Team Link'}
          </button>
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
              <option value="apple_pay">Apple Pay</option>
              <option value="check">Check</option>
              <option value="stripe">Stripe</option>
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
          {/* DETAILS */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize font-medium">{booking.status.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Service</dt><dd>{booking.service_type || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Hourly Rate</dt><dd>{booking.hourly_rate ? `$${booking.hourly_rate}/hr` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Pay Rate</dt><dd>{booking.pay_rate ? `$${booking.pay_rate}/hr` : '—'}</dd></div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">10% Discount</dt>
                <dd>
                  <button
                    onClick={() => updateBooking({ discount_enabled: !booking.discount_enabled })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${booking.discount_enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${booking.discount_enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </dd>
              </div>
              {booking.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{booking.notes}</dd></div>}
              {booking.special_instructions && <div><dt className="text-slate-400 mb-1">Special Instructions</dt><dd className="bg-yellow-500/10 rounded p-2">{booking.special_instructions}</dd></div>}
            </dl>
          </div>

          {/* ESTIMATE vs ACTUAL */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Estimate vs Actual</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Estimated</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {estimatedHours ? `${estimatedHours.toFixed(1)}hr` : '—'}
                </p>
                {estimatedPrice != null && (
                  <p className="text-sm text-slate-400">${estimatedPrice.toFixed(0)}</p>
                )}
              </div>
              <div className={`rounded-lg p-4 ${actualHours ? 'bg-teal-50' : 'bg-slate-50'}`}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Actual</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {actualHours ? `${actualHours.toFixed(1)}hr` : '—'}
                </p>
                {actualPriceWithDiscount != null && (
                  <p className="text-sm text-teal-700">
                    ${actualPriceWithDiscount.toFixed(0)}
                    {booking.discount_enabled && <span className="text-xs text-slate-400 ml-1">(10% off)</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Variance */}
            {estimatedHours && actualHours && (
              <div className={`rounded-lg p-3 text-sm flex items-center justify-between ${
                actualHours > estimatedHours ? 'bg-red-50 text-red-700' : actualHours < estimatedHours ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-600'
              }`}>
                <span>Variance</span>
                <span className="font-medium">
                  {actualHours > estimatedHours ? '+' : ''}{(actualHours - estimatedHours).toFixed(1)}hr
                  {estimatedPrice != null && actualPriceWithDiscount != null && (
                    <> ({actualPriceWithDiscount > estimatedPrice ? '+' : ''}${(actualPriceWithDiscount - estimatedPrice).toFixed(0)})</>
                  )}
                </span>
              </div>
            )}

            {/* Manual actual hours override */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Override Actual Hours</label>
              <div className="flex gap-2">
                <select
                  value={booking.actual_hours?.toString() || ''}
                  onChange={(e) => {
                    const hrs = e.target.value ? parseFloat(e.target.value) : null
                    const teamPayCalc = hrs && booking.pay_rate ? hrs * booking.pay_rate * 100 : null
                    updatePayment({
                      actual_hours: hrs,
                      team_pay: teamPayCalc,
                    })
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Auto (from clock)</option>
                  {['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '7', '8'].map((h) => (
                    <option key={h} value={h}>{h}hr</option>
                  ))}
                </select>
                {booking.actual_hours && (
                  <span className="text-xs text-slate-400 self-center">
                    Team pay: ${autoTeamPay ? autoTeamPay.toFixed(0) : '—'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CHECK-IN/OUT */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Check-in/out</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Check-in</dt>
                <dd>{booking.check_in_time ? new Date(booking.check_in_time).toLocaleString() : 'Not checked in'}</dd>
              </div>
              {booking.check_in_lat && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">GPS (in)</dt>
                  <dd className="font-mono text-xs">{booking.check_in_lat.toFixed(6)}, {booking.check_in_lng?.toFixed(6)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">Check-out</dt>
                <dd>{booking.check_out_time ? new Date(booking.check_out_time).toLocaleString() : 'Not checked out'}</dd>
              </div>
              {booking.check_out_lat && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">GPS (out)</dt>
                  <dd className="font-mono text-xs">{booking.check_out_lat.toFixed(6)}, {booking.check_out_lng?.toFixed(6)}</dd>
                </div>
              )}
              {clockedHours && (
                <div className="flex justify-between font-medium">
                  <dt className="text-slate-400">Clocked Duration</dt>
                  <dd>{clockedHours.toFixed(1)} hours</dd>
                </div>
              )}
            </dl>
            {/* 15-Min Heads Up button — visible when checked in but not checked out */}
            {booking.check_in_time && !booking.check_out_time && (
              <button
                disabled={sendingHeadsUp}
                onClick={async () => {
                  const checkIn = new Date(booking.check_in_time!)
                  const now = new Date()
                  const hoursWorked = (now.getTime() - checkIn.getTime()) / 3600000
                  const rate = booking.hourly_rate || 0
                  const estimated = Math.round(hoursWorked * rate)
                  const clientName = booking.clients?.name || 'Client'

                  if (!confirm(`Send 15-minute heads up to ${clientName}?\n\nTime worked: ${hoursWorked.toFixed(1)} hrs\nEstimated amount: $${estimated}`)) return

                  setSendingHeadsUp(true)
                  try {
                    const res = await fetch('/api/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: '15min_warning',
                        booking_id: booking.id,
                        message: `15-min heads up for ${clientName} — ${hoursWorked.toFixed(1)} hrs, ~$${estimated}`,
                      }),
                    })
                    if (res.ok) alert('Heads up sent!')
                    else alert('Failed to send')
                  } catch {
                    alert('Failed to send')
                  }
                  setSendingHeadsUp(false)
                }}
                className="mt-4 w-full bg-yellow-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50"
              >
                {sendingHeadsUp ? 'Sending...' : '15-Min Heads Up'}
              </button>
            )}
          </div>

          {/* PAYMENT + TEAM PAY */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Payment</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Client Payment</dt><dd className="capitalize font-medium">{booking.payment_status || 'unpaid'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Method</dt><dd className="capitalize">{booking.payment_method?.replace('_', ' ') || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Paid On</dt><dd>{booking.payment_date ? new Date(booking.payment_date).toLocaleDateString() : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Tip</dt><dd>{booking.tip_amount != null ? `$${(booking.tip_amount / 100).toFixed(2)}` : '—'}</dd></div>
              <div className="border-t border-slate-200 my-2" />
              <div className="flex justify-between">
                <dt className="text-slate-400">Team Pay</dt>
                <dd className="font-medium">{booking.team_pay != null ? `$${(booking.team_pay / 100).toFixed(0)}` : autoTeamPay ? `~$${autoTeamPay.toFixed(0)}` : '—'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Team Paid</dt>
                <dd>
                  {booking.team_paid ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">
                      Paid {booking.team_paid_at && `on ${new Date(booking.team_paid_at).toLocaleDateString()}`}
                    </span>
                  ) : (
                    <button
                      onClick={() => updatePayment({ team_paid: true })}
                      className="text-xs px-3 py-1 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
                    >
                      Mark Team Paid
                    </button>
                  )}
                </dd>
              </div>
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

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          {/* CLIENT */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
            {booking.clients ? (
              <div className="space-y-3">
                <p className="font-medium text-sm">{booking.clients.name}</p>
                {booking.clients.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">{booking.clients.phone}</span>
                    <a href={`tel:${booking.clients.phone}`} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Call</a>
                    <a href={`sms:${booking.clients.phone}`} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Text</a>
                  </div>
                )}
                {booking.clients.email && <p className="text-sm text-slate-400">{booking.clients.email}</p>}
                {booking.clients.address && (
                  <div>
                    <p className="text-sm text-slate-400">{booking.clients.address}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(booking.clients.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Open in Maps
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No client assigned</p>
            )}
          </div>

          {/* TEAM MEMBER */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Team Member</h3>
            {booking.team_members ? (
              <div className="space-y-3">
                <p className="font-medium text-sm">{booking.team_members.name}</p>
                {booking.team_members.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">{booking.team_members.phone}</span>
                    <a href={`tel:${booking.team_members.phone}`} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Call</a>
                    <a href={`sms:${booking.team_members.phone}`} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Text</a>
                  </div>
                )}
                {booking.team_members.email && <p className="text-sm text-slate-400">{booking.team_members.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No team member assigned</p>
            )}
          </div>

          {/* TEAM LINK */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Team Portal Link</h3>
            <code className="text-xs text-blue-400 font-mono bg-slate-50 px-2 py-1 rounded block mb-3 break-all">{teamPortalLink}</code>
            <button
              onClick={() => copyText(teamPortalLink, 'team-link-sidebar')}
              className="w-full text-sm bg-teal-50 text-teal-700 py-2 rounded-lg font-medium hover:bg-teal-100"
            >
              {copied === 'team-link-sidebar' ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* QUICK CLOSE-OUT */}
          {(booking.status === 'completed' || booking.status === 'in_progress' || booking.status === 'paid') && (
            <div className="border border-orange-200 bg-orange-50/50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Close-Out</h3>
              <div className="space-y-3">
                {booking.status !== 'completed' && booking.status !== 'paid' && (
                  <button
                    onClick={() => updateStatus('completed')}
                    className="w-full text-sm bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
                  >
                    Mark Job Done
                  </button>
                )}
                {booking.payment_status !== 'paid' && (
                  <div className="grid grid-cols-2 gap-2">
                    {['zelle', 'apple_pay', 'cash', 'stripe'].map((m) => (
                      <button
                        key={m}
                        onClick={() => updatePayment({ payment_status: 'paid', payment_method: m })}
                        className="text-xs py-2 rounded-lg font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 capitalize"
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}
                {booking.payment_status === 'paid' && !booking.team_paid && (
                  <button
                    onClick={() => updatePayment({ team_paid: true })}
                    className="w-full text-sm bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700"
                  >
                    Mark Team Paid
                  </button>
                )}
                {booking.payment_status === 'paid' && booking.team_paid && (
                  <p className="text-sm text-green-700 font-medium text-center">Fully closed out</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
