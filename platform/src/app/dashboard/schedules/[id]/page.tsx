'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Schedule = {
  id: string
  recurring_type: string
  day_of_week: number | null
  preferred_time: string | null
  duration_hours: number | null
  hourly_rate: number | null
  pay_rate: number | null
  status: string
  paused_until: string | null
  notes: string | null
  special_instructions: string | null
  clients: { name: string; phone: string | null; address: string | null } | null
  team_members: { name: string; phone: string | null } | null
  created_at: string
}

type Booking = {
  id: string
  start_time: string
  status: string
  service_type: string | null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pauseDate, setPauseDate] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    recurring_type: '',
    day_of_week: '',
    preferred_time: '',
    duration_hours: '',
    notes: '',
    special_instructions: '',
  })

  useEffect(() => {
    fetch(`/api/schedules/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSchedule(data.schedule)
        setBookings(data.bookings || [])
      })
  }, [id])

  async function pause() {
    if (!pauseDate) return
    await fetch(`/api/schedules/${id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused_until: pauseDate }),
    })
    setSchedule((prev) => prev ? { ...prev, status: 'paused', paused_until: pauseDate } : prev)
  }

  async function resume() {
    await fetch(`/api/schedules/${id}/pause`, { method: 'DELETE' })
    setSchedule((prev) => prev ? { ...prev, status: 'active', paused_until: null } : prev)
  }

  async function cancelSchedule() {
    if (!confirm('Cancel this schedule? Future bookings will also be cancelled.')) return
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    router.push('/dashboard/schedules')
  }

  function startEditing() {
    if (!schedule) return
    setEditForm({
      recurring_type: schedule.recurring_type || '',
      day_of_week: schedule.day_of_week != null ? String(schedule.day_of_week) : '',
      preferred_time: schedule.preferred_time || '',
      duration_hours: schedule.duration_hours != null ? String(schedule.duration_hours) : '',
      notes: schedule.notes || '',
      special_instructions: schedule.special_instructions || '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    const res = await fetch(`/api/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recurring_type: editForm.recurring_type,
        day_of_week: editForm.day_of_week !== '' ? Number(editForm.day_of_week) : null,
        preferred_time: editForm.preferred_time || null,
        duration_hours: editForm.duration_hours ? Number(editForm.duration_hours) : null,
        notes: editForm.notes || null,
        special_instructions: editForm.special_instructions || null,
      }),
    })
    if (res.ok) {
      const { schedule: updated } = await res.json()
      setSchedule((prev) => prev ? { ...prev, ...updated } : prev)
      setEditing(false)
    }
  }

  if (!schedule) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <Link href="/dashboard/schedules" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
        &larr; All Schedules
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {schedule.clients?.name || 'Schedule'} — {schedule.recurring_type.replace('_', ' ')}
        </h2>
        <div className="flex gap-2">
          <button onClick={startEditing} className="px-4 py-2 text-sm text-slate-400 border border-slate-200 rounded-lg hover:text-slate-900 hover:border-slate-500">
            Edit
          </button>
          <button onClick={cancelSchedule} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">
            Cancel Schedule
          </button>
        </div>
      </div>

      {editing && (
        <div className="border border-slate-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Edit Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Recurring Type</label>
              <select value={editForm.recurring_type} onChange={e => setEditForm({...editForm, recurring_type: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Preferred Time</label>
              <input type="time" value={editForm.preferred_time} onChange={e => setEditForm({...editForm, preferred_time: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Day of Week</label>
              <select value={editForm.day_of_week} onChange={e => setEditForm({...editForm, day_of_week: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Duration (hours)</label>
              <input type="number" value={editForm.duration_hours} onChange={e => setEditForm({...editForm, duration_hours: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Special Instructions</label>
              <textarea value={editForm.special_instructions} onChange={e => setEditForm({...editForm, special_instructions: e.target.value})} rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold">Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-900">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Schedule Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Frequency</dt><dd className="capitalize">{schedule.recurring_type.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Day</dt><dd>{schedule.day_of_week != null ? DAYS[schedule.day_of_week] : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Time</dt><dd>{schedule.preferred_time || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Duration</dt><dd>{schedule.duration_hours ? `${schedule.duration_hours} hours` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize font-medium">{schedule.status}</dd></div>
              {schedule.paused_until && <div className="flex justify-between"><dt className="text-slate-400">Paused Until</dt><dd>{new Date(schedule.paused_until).toLocaleDateString()}</dd></div>}
              {schedule.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{schedule.notes}</dd></div>}
            </dl>
          </div>

          {schedule.status === 'active' && (
            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Pause Schedule</h3>
              <div className="flex gap-2">
                <input type="date" value={pauseDate} onChange={(e) => setPauseDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={pause} className="bg-yellow-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium">Pause Until</button>
              </div>
            </div>
          )}

          {schedule.status === 'paused' && (
            <div className="border border-slate-200 rounded-lg p-6">
              <button onClick={resume} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Resume Now</button>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Generated Bookings ({bookings.length})</h3>
            <div className="space-y-2">
              {bookings.map((b) => (
                <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-medium">{new Date(b.start_time).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    b.status === 'completed' ? 'bg-green-50 text-green-700' :
                    b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>{b.status}</span>
                </Link>
              ))}
              {bookings.length === 0 && <p className="text-sm text-slate-400">No bookings generated yet</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
            {schedule.clients ? (
              <dl className="space-y-2 text-sm">
                <dd className="font-medium">{schedule.clients.name}</dd>
                {schedule.clients.phone && <dd className="text-slate-400">{schedule.clients.phone}</dd>}
                {schedule.clients.address && <dd className="text-slate-400">{schedule.clients.address}</dd>}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">No client</p>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Team Member</h3>
            {schedule.team_members ? (
              <dd className="text-sm font-medium">{schedule.team_members.name}</dd>
            ) : (
              <p className="text-sm text-slate-400">Unassigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
