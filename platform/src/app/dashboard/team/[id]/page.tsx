'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPhone } from '@/lib/phone'

type TeamMember = {
  id: string
  name: string
  email: string | null
  phone: string | null
  pin: string
  role: string
  status: string
  hourly_rate: number | null
  pay_rate: number | null
  avatar_url: string | null
  notes: string | null
  preferred_language: string
  created_at: string
}

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  check_in_time: string | null
  check_out_time: string | null
}

type WorkingHourEntry = { start: string; end: string } | null
type WorkingHours = Record<number, WorkingHourEntry>
type TimeOffEntry = { start: string; end: string; reason?: string }

type NotesData = {
  working_hours?: WorkingHours
  time_off?: TimeOffEntry[]
  [key: string]: unknown
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_WORKING_HOURS: WorkingHours = {
  0: null,
  1: { start: '08:00', end: '17:00' },
  2: { start: '08:00', end: '17:00' },
  3: { start: '08:00', end: '17:00' },
  4: { start: '08:00', end: '17:00' },
  5: { start: '08:00', end: '17:00' },
  6: null,
}

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      const ampm = h >= 12 ? 'PM' : 'AM'
      const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
      options.push({ value, label })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-teal-600', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function parseNotesData(notes: string | null): NotesData {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {
    // notes is plain text, not JSON
  }
  return {}
}

export default function TeamMemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [member, setMember] = useState<TeamMember | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<TeamMember>>({})
  const [saving, setSaving] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Schedule & Availability state
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState('')

  // Time Off state
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([])
  const [timeOffStart, setTimeOffStart] = useState('')
  const [timeOffEnd, setTimeOffEnd] = useState('')
  const [timeOffReason, setTimeOffReason] = useState('')
  const [savingTimeOff, setSavingTimeOff] = useState(false)
  const [timeOffMessage, setTimeOffMessage] = useState('')

  useEffect(() => {
    fetch(`/api/team/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMember(data.member)
        setForm(data.member)
        // Parse working hours and time off from notes
        const notesData = parseNotesData(data.member?.notes)
        if (notesData.working_hours) {
          setWorkingHours(notesData.working_hours)
        }
        if (notesData.time_off) {
          setTimeOff(notesData.time_off)
        }
      })
    fetch(`/api/bookings?team_member_id=${id}`)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
  }, [id])

  // Helper to build the notes JSON string
  function buildNotesJson(wh: WorkingHours, to: TimeOffEntry[]): string {
    const existing = parseNotesData(member?.notes ?? null)
    return JSON.stringify({ ...existing, working_hours: wh, time_off: to })
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/team/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { member: updated } = await res.json()
      setMember(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  async function deleteMember() {
    if (!confirm('Remove this team member?')) return
    await fetch(`/api/team/${id}`, { method: 'DELETE' })
    router.push('/dashboard/team')
  }

  // Save working hours
  async function saveSchedule() {
    setSavingSchedule(true)
    setScheduleMessage('')
    const notes = buildNotesJson(workingHours, timeOff)
    const res = await fetch(`/api/team/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      const { member: updated } = await res.json()
      setMember(updated)
      setScheduleMessage('Schedule saved')
      setTimeout(() => setScheduleMessage(''), 2000)
    }
    setSavingSchedule(false)
  }

  // Toggle a day on/off
  function toggleDay(day: number) {
    setWorkingHours((prev) => {
      const copy = { ...prev }
      if (copy[day]) {
        copy[day] = null
      } else {
        copy[day] = { start: '08:00', end: '17:00' }
      }
      return copy
    })
  }

  // Update start or end time for a day
  function updateDayTime(day: number, field: 'start' | 'end', value: string) {
    setWorkingHours((prev) => {
      const copy = { ...prev }
      const entry = copy[day]
      if (entry) {
        copy[day] = { ...entry, [field]: value }
      }
      return copy
    })
  }

  // Add time off entry
  async function addTimeOff() {
    if (!timeOffStart || !timeOffEnd) return
    setSavingTimeOff(true)
    setTimeOffMessage('')
    const newEntry: TimeOffEntry = {
      start: timeOffStart,
      end: timeOffEnd,
      ...(timeOffReason ? { reason: timeOffReason } : {}),
    }
    const updated = [...timeOff, newEntry]
    const notes = buildNotesJson(workingHours, updated)
    const res = await fetch(`/api/team/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      const { member: updatedMember } = await res.json()
      setMember(updatedMember)
      setTimeOff(updated)
      setTimeOffStart('')
      setTimeOffEnd('')
      setTimeOffReason('')
      setTimeOffMessage('Time off added')
      setTimeout(() => setTimeOffMessage(''), 2000)
    }
    setSavingTimeOff(false)
  }

  // Delete a time off entry
  async function deleteTimeOff(index: number) {
    setSavingTimeOff(true)
    const updated = timeOff.filter((_, i) => i !== index)
    const notes = buildNotesJson(workingHours, updated)
    const res = await fetch(`/api/team/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      const { member: updatedMember } = await res.json()
      setMember(updatedMember)
      setTimeOff(updated)
    }
    setSavingTimeOff(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPEG, PNG, or WebP photos allowed')
      return
    }
    setUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const maxSize = 200
        let w = img.width, h = img.height
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setForm(f => ({ ...f, avatar_url: dataUrl }))
        // Save immediately
        try {
          const saveRes = await fetch(`/api/team/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: dataUrl }),
          })
          if (saveRes.ok) {
            const { member: updated } = await saveRes.json()
            setMember(updated)
          }
        } catch {
          // ignore save error — user can still save manually
        }
        setUploadingPhoto(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
      setUploadingPhoto(false)
    }
    reader.readAsDataURL(file)
  }

  // Display notes for the profile section — show original text if not JSON, or omit internal keys
  const displayNotes = useMemo(() => {
    if (!member?.notes) return null
    try {
      const parsed = JSON.parse(member.notes)
      if (typeof parsed === 'object' && parsed !== null) {
        // It's our JSON structure, don't show raw JSON in profile
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { working_hours: _wh, time_off: _to, ...rest } = parsed
        const remaining = Object.keys(rest)
        if (remaining.length === 0) return null
        return JSON.stringify(rest, null, 2)
      }
    } catch {
      // Plain text notes
      return member.notes
    }
    return null
  }, [member?.notes])

  if (!member) return <p className="text-slate-400">Loading...</p>

  // Calculate earnings from completed bookings
  const completedBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'paid')
  const totalEarnings = completedBookings.reduce((sum, b) => {
    if (b.check_in_time && b.check_out_time && member.pay_rate) {
      const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      return sum + hours * member.pay_rate
    }
    return sum
  }, 0)

  return (
    <div>
      <Link href="/dashboard/team" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
        &larr; All Team
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{member.name}</h2>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={deleteMember} className="px-4 py-2 text-sm text-red-400 border border-red-200 rounded-lg hover:bg-red-50">
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Profile</h3>
            {editing ? (
              <div className="space-y-3">
                <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div className="flex items-center gap-4 mb-2">
                  {(form.avatar_url || member.avatar_url) ? (
                    <img src={(form.avatar_url || member.avatar_url)!} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-slate-900 text-lg font-bold`}>
                      {initials(member.name)}
                    </div>
                  )}
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                    className="text-sm text-slate-400 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg disabled:opacity-50">
                    {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                  </button>
                </div>
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="Phone" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <select value={form.role || 'worker'} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="worker">Worker</option>
                  <option value="lead">Lead</option>
                  <option value="manager">Manager</option>
                </select>
                <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <input value={form.pay_rate || ''} onChange={(e) => setForm({ ...form, pay_rate: Number(e.target.value) })} placeholder="Pay Rate ($/hr)" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-slate-900 text-lg font-bold`}>
                      {initials(member.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-slate-900 font-semibold text-lg">{member.name}</p>
                    <p className="text-slate-400 text-sm capitalize">{member.role}</p>
                  </div>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd>{member.email || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd>{member.phone || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Role</dt><dd className="capitalize">{member.role}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize">{member.status}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">PIN</dt><dd className="font-mono">{member.pin}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Pay Rate</dt><dd>{member.pay_rate ? `$${member.pay_rate}/hr` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Language</dt><dd className="uppercase">{member.preferred_language || 'en'}</dd></div>
                  {displayNotes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{displayNotes}</dd></div>}
                </dl>
              </>
            )}
          </div>

          {/* Schedule & Availability Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Schedule &amp; Availability</h3>
              {scheduleMessage && (
                <span className="text-xs text-green-400">{scheduleMessage}</span>
              )}
            </div>
            <div className="space-y-2">
              {DAY_NAMES.map((dayName, i) => {
                const entry = workingHours[i]
                const isOn = entry !== null && entry !== undefined
                return (
                  <div key={i} className="flex items-center gap-3 py-2">
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                        isOn ? 'bg-green-500' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        isOn ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                    {/* Day label */}
                    <span className={`w-24 text-sm font-medium ${isOn ? 'text-slate-900' : 'text-slate-400'}`}>
                      {dayName}
                    </span>
                    {/* Time selects */}
                    {isOn ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={entry?.start || '08:00'}
                          onChange={(e) => updateDayTime(i, 'start', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <span className="text-slate-400 text-xs">to</span>
                        <select
                          value={entry?.end || '17:00'}
                          onChange={(e) => updateDayTime(i, 'end', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Day off</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={saveSchedule}
                disabled={savingSchedule}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50"
              >
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>

          {/* Time Off Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Time Off</h3>
              {timeOffMessage && (
                <span className="text-xs text-green-400">{timeOffMessage}</span>
              )}
            </div>

            {/* Existing time off entries */}
            {timeOff.length > 0 ? (
              <div className="space-y-2 mb-4">
                {timeOff.map((entry, i) => {
                  const startDate = new Date(entry.start + 'T00:00:00')
                  const endDate = new Date(entry.end + 'T00:00:00')
                  const isPast = endDate < new Date(new Date().toDateString())
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isPast ? 'border-slate-200 opacity-50' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <p className="text-sm text-slate-900">
                          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {entry.start !== entry.end && (
                            <> &mdash; {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                          )}
                          {isPast && <span className="text-xs text-slate-400 ml-2">(past)</span>}
                        </p>
                        {entry.reason && (
                          <p className="text-xs text-slate-400 mt-0.5">{entry.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTimeOff(i)}
                        disabled={savingTimeOff}
                        className="text-sm text-red-400 hover:text-red-300 px-2 py-1 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">No time off scheduled</p>
            )}

            {/* Add time off form */}
            <div className="border-t border-slate-200 pt-4">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">Add Time Off</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={timeOffStart}
                    onChange={(e) => setTimeOffStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={timeOffEnd}
                    onChange={(e) => setTimeOffEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">Reason (optional)</label>
                  <input
                    type="text"
                    value={timeOffReason}
                    onChange={(e) => setTimeOffReason(e.target.value)}
                    placeholder="Vacation, sick day, etc."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
              <button
                onClick={addTimeOff}
                disabled={savingTimeOff || !timeOffStart || !timeOffEnd}
                className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50"
              >
                {savingTimeOff ? 'Saving...' : 'Add Time Off'}
              </button>
            </div>
          </div>

          {/* Job History Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Job History</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs yet</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-sm font-medium">{b.service_type || 'Service'}</p>
                      <p className="text-xs text-slate-400">{new Date(b.start_time).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      b.status === 'completed' ? 'bg-green-50 text-green-700' :
                      b.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{b.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Earnings</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400">Total Earned</p>
                <p className="text-2xl font-bold text-slate-900">${totalEarnings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Jobs Completed</p>
                <p className="text-lg font-semibold text-slate-900">{completedBookings.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
