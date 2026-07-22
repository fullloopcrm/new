'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPhone } from '@/lib/phone'
import { normalizeWorkingHours } from '@/lib/day-availability'
import { SERVICE_ZONES } from '@/lib/service-zones'

// Last-10-digits match so a formatted profile phone lines up with the
// normalized application phone stored as digits.
function samePhone(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const da = a.replace(/\D/g, '').slice(-10)
  const db = b.replace(/\D/g, '').slice(-10)
  return da.length === 10 && da === db
}

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
  // Fields the smart scheduler (src/lib/smart-schedule.ts) reads directly.
  // These are already wired into scoring -- this page just has to surface
  // and let admins edit the real columns instead of leaving them blank.
  address: string | null
  working_days: string[] | null
  schedule: Record<string, unknown> | null
  home_by_time: string | null
  has_car: boolean | null
  labor_only: boolean | null
  service_zones: string[] | null
  max_travel_minutes: number | null
  created_at: string
  stripe_account_id: string | null
  stripe_ready_at: string | null
}

// The team member's original application, matched by phone, so the profile
// can reflect what they submitted (experience, availability, references).
type TeamApplication = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  experience: string | null
  availability: string | null
  referral_source: string | null
  references: string | null
  notes: string | null
  status: string
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
  time_off?: TimeOffEntry[]
  notification_prefs?: Record<string, boolean>
  [key: string]: unknown
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Honest empty state: every day off. A member with no saved availability
// shows ALL days off -- never a fake Mon-Fri default that was never saved.
const ALL_OFF_HOURS: WorkingHours = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [application, setApplication] = useState<TeamApplication | null>(null)
  const [transportMsg, setTransportMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<TeamMember>>({})
  const [saving, setSaving] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Payouts (Stripe Connect) state
  const [stripeBusy, setStripeBusy] = useState(false)
  const [stripeMessage, setStripeMessage] = useState('')

  // Schedule & Availability state -- loaded from the real scheduler columns
  // (working_days/schedule), NOT from notes. Same canonical model the smart
  // scheduler and the ind-build editor both use (day-availability.ts).
  const [workingHours, setWorkingHours] = useState<WorkingHours>(ALL_OFF_HOURS)
  const [homeByTime, setHomeByTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState('')
  const [sendingOnboard, setSendingOnboard] = useState(false)
  const [onboardMsg, setOnboardMsg] = useState('')

  // Time Off state
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([])
  const [timeOffStart, setTimeOffStart] = useState('')
  const [timeOffEnd, setTimeOffEnd] = useState('')
  const [timeOffReason, setTimeOffReason] = useState('')
  const [savingTimeOff, setSavingTimeOff] = useState(false)
  const [timeOffMessage, setTimeOffMessage] = useState('')

  // Delete confirmation (type-the-name-to-confirm, replaces the plain
  // window.confirm() that was easy to click through without reading).
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    setLoadError(null)
    fetch(`/api/team/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
        if (!data.member) throw new Error('No member data returned')
        return data
      })
      .then((data) => {
        setMember(data.member)
        setForm(data.member)
        setWorkingHours(normalizeWorkingHours(data.member?.working_days, data.member?.schedule))
        setHomeByTime(data.member?.home_by_time || '')
        const notesData = parseNotesData(data.member?.notes)
        if (notesData.time_off) setTimeOff(notesData.time_off)
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load')
      })

    fetch(`/api/bookings?team_member_id=${id}`)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
  }, [id])

  // Once we know the member's phone, find their original application so the
  // profile can fully reflect what they submitted.
  useEffect(() => {
    if (!member?.phone) return
    fetch('/api/team-applications')
      .then((r) => (r.ok ? r.json() : []))
      .then((apps: TeamApplication[]) => {
        const list = Array.isArray(apps) ? apps : ((apps as unknown as { applications?: TeamApplication[] })?.applications || [])
        const match = list.find((a) => samePhone(a.phone, member.phone))
        if (match) setApplication(match)
      })
      .catch(() => {})
  }, [member?.phone])

  // Save a single transportation/service field immediately (toggle pattern).
  async function saveTransport(partial: Partial<TeamMember>) {
    setTransportMsg('')
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setTransportMsg(`Save failed: ${data.error || res.status}`); return }
      if (data.member) { setMember(data.member); setForm(data.member) }
      setTransportMsg('Saved')
      setTimeout(() => setTransportMsg(''), 2000)
    } catch (e) {
      setTransportMsg(`Save failed: ${e instanceof Error ? e.message : 'network'}`)
    }
  }

  function buildNotesJson(to: TimeOffEntry[]): string {
    const existing = parseNotesData(member?.notes ?? null)
    return JSON.stringify({ ...existing, time_off: to })
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

  async function confirmDelete() {
    if (!member || deleteConfirmText.trim() !== member.name.trim()) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || `Delete failed (${res.status})`)
        setDeleting(false)
        return
      }
      router.push('/dashboard/team')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Network error')
      setDeleting(false)
    }
  }

  async function startStripe() {
    setStripeBusy(true)
    setStripeMessage('')
    try {
      const res = await fetch(`/api/team-members/${id}/stripe-onboard`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start payout setup')
      window.location.href = json.url
    } catch (e) {
      setStripeMessage(e instanceof Error ? e.message : 'Payout setup failed')
      setStripeBusy(false)
    }
  }

  // Save working hours. The smart scheduler reads team_members.working_days +
  // team_members.schedule directly, so those are the source of truth and
  // MUST persist -- one awaited request, failure surfaced (no fire-and-forget
  // "Schedule saved" that lies).
  async function saveSchedule() {
    setSavingSchedule(true)
    setScheduleMessage('')
    const working_days = Object.entries(workingHours)
      .filter(([, v]) => v !== null)
      .map(([k]) => k)
      .sort()
    const schedule = workingHours
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days, schedule, home_by_time: homeByTime || null }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setScheduleMessage(`Save failed: ${payload.error || res.status}`)
        setSavingSchedule(false)
        return
      }
      if (payload.member) setMember(payload.member)
      setScheduleMessage('Schedule saved')
      setTimeout(() => setScheduleMessage(''), 2000)
    } catch (e) {
      setScheduleMessage(`Save failed: ${e instanceof Error ? e.message : 'network'}`)
    }
    setSavingSchedule(false)
  }

  async function sendOnboard() {
    setSendingOnboard(true)
    setOnboardMsg('')
    try {
      const res = await fetch(`/api/team-members/${id}/stripe-onboard`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setOnboardMsg(data.error || `Failed (${res.status})`); return }
      if (data.url) {
        navigator.clipboard.writeText(data.url).catch(() => {})
        setOnboardMsg('Onboarding link copied — send it to them')
      } else {
        setOnboardMsg('Account ready')
      }
      setTimeout(() => setOnboardMsg(''), 5000)
    } catch (e) {
      setOnboardMsg(e instanceof Error ? e.message : 'network error')
    } finally {
      setSendingOnboard(false)
    }
  }

  function toggleDay(day: number) {
    setWorkingHours((prev) => {
      const copy = { ...prev }
      copy[day] = copy[day] ? null : { start: '08:00', end: '17:00' }
      return copy
    })
  }

  function updateDayTime(day: number, field: 'start' | 'end', value: string) {
    setWorkingHours((prev) => {
      const copy = { ...prev }
      const entry = copy[day]
      if (entry) copy[day] = { ...entry, [field]: value }
      return copy
    })
  }

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
    const notes = buildNotesJson(updated)
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

  async function deleteTimeOff(index: number) {
    setSavingTimeOff(true)
    const updated = timeOff.filter((_, i) => i !== index)
    const notes = buildNotesJson(updated)
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
          // ignore save error -- user can still save manually
        }
        setUploadingPhoto(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => setUploadingPhoto(false)
    reader.readAsDataURL(file)
  }

  const displayNotes = useMemo(() => {
    if (!member?.notes) return null
    try {
      const parsed = JSON.parse(member.notes)
      if (typeof parsed === 'object' && parsed !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { time_off: _to, notification_prefs: _np, ...rest } = parsed
        if (Object.keys(rest).length === 0) return null
        return JSON.stringify(rest, null, 2)
      }
    } catch {
      return member.notes
    }
    return null
  }, [member?.notes])

  if (loadError) {
    return (
      <div className="p-6">
        <Link href="/dashboard/team" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
          &larr; All Team
        </Link>
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-700">
          <p className="font-semibold mb-1">Couldn&apos;t load team member</p>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }
  if (!member) return <p className="text-slate-400">Loading...</p>

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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">{member.name}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {member.status === 'active' ? 'Active' : member.status === 'inactive' ? 'Inactive' : member.status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const nowActive = member.status === 'active'
              const verb = nowActive ? 'Deactivate' : 'Activate'
              if (!confirm(`${verb} ${member.name}?${nowActive ? ' Future suggestions and recurring assignments will be cleared.' : ''}`)) return
              const res = await fetch(`/api/team/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nowActive ? 'inactive' : 'active' }),
              })
              if (res.ok) {
                const { member: updated } = await res.json()
                setMember(updated)
                setForm(updated)
              } else {
                const d = await res.json().catch(() => ({}))
                alert(d.error || 'Failed')
              }
            }}
            className={`px-4 py-2 text-sm rounded-lg ${member.status === 'active' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {member.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => setEditing(!editing)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError('') }}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Delete {member.name}?</h3>
            <p className="text-sm text-slate-500 mb-4">
              This permanently removes their profile, schedule, and pay rate. Job history stays attached to past bookings. This cannot be undone.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              Type <span className="font-mono font-semibold">{member.name}</span> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={member.name}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
              autoFocus
            />
            {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 text-sm border border-slate-200 rounded-lg py-2 font-medium text-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteConfirmText.trim() !== member.name.trim()}
                className="flex-1 text-sm bg-red-600 text-white rounded-lg py-2 font-medium disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <div className={`w-16 h-16 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-white text-lg font-bold`}>
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
                <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Home address" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
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
                <select value={form.preferred_language || 'en'} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
                <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-white text-lg font-bold`}>
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
                  <div className="flex justify-between items-center">
                    <dt className="text-slate-400">Phone</dt>
                    <dd className="flex items-center gap-2">
                      <span>{member.phone || '—'}</span>
                      {member.phone && (
                        <>
                          <a href={`tel:${member.phone}`} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Call</a>
                          <a href={`sms:${member.phone}`} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Text</a>
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between"><dt className="text-slate-400">Address</dt><dd>{member.address || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Role</dt><dd className="capitalize">{member.role}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize">{member.status}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">PIN</dt><dd className="font-mono">{member.pin}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Pay Rate</dt><dd>{member.pay_rate ? `$${member.pay_rate}/hr` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Language</dt><dd className="uppercase">{member.preferred_language || 'en'}</dd></div>
                  {displayNotes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2 whitespace-pre-wrap">{displayNotes}</dd></div>}
                </dl>
              </>
            )}
          </div>

          {/* Transportation & Service Areas Section -- these fields feed the
              smart scheduler directly (src/lib/smart-schedule.ts), so this is
              the actual data-entry point that makes suggested assignments work. */}
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Transportation &amp; Service Areas</h3>
              {transportMsg && <span className="text-xs text-green-600">{transportMsg}</span>}
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-slate-900">Has a car</span>
                <p className="text-xs text-slate-500">Required for zones marked &quot;Car&quot; below.</p>
              </div>
              <button
                type="button"
                onClick={() => saveTransport({ has_car: !member.has_car })}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${member.has_car ? 'bg-green-500' : 'bg-slate-300'}`}
                aria-pressed={!!member.has_car}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${member.has_car ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <span className="text-sm font-medium text-slate-900">Labor only (no supplies)</span>
                <p className="text-xs text-slate-500">On = can&apos;t be matched to jobs that need supplies brought.</p>
              </div>
              <button
                type="button"
                onClick={() => saveTransport({ labor_only: !member.labor_only })}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${member.labor_only ? 'bg-amber-500' : 'bg-slate-300'}`}
                aria-pressed={!!member.labor_only}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${member.labor_only ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-900 mb-2">Service areas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_ZONES.map((zone) => {
                  const selected = (member.service_zones || []).includes(zone.id)
                  return (
                    <label key={zone.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = member.service_zones || []
                          const next = e.target.checked
                            ? [...current, zone.id]
                            : current.filter((z) => z !== zone.id)
                          saveTransport({ service_zones: next })
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span>{zone.label}</span>
                      {zone.car_required && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Car</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">Max travel</span>
              <select
                value={member.max_travel_minutes ?? ''}
                onChange={(e) => saveTransport({ max_travel_minutes: e.target.value ? Number(e.target.value) : null })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
              >
                <option value="">No limit</option>
                <option value="30">Up to 30 min</option>
                <option value="45">Up to 45 min</option>
                <option value="60">Up to 1 hour</option>
                <option value="90">Up to 1.5 hours</option>
                <option value="120">Up to 2 hours</option>
              </select>
            </div>
          </div>

          {/* Original Application Section (read-only) */}
          {application && (
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Original Application</h3>
                <span className="text-xs text-slate-400">
                  {new Date(application.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-400">Experience</dt><dd>{application.experience || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Availability</dt><dd>{application.availability || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">How they found us</dt><dd>{application.referral_source || '—'}</dd></div>
                {application.references && <div><dt className="text-slate-400 mb-1">References</dt><dd className="bg-slate-50 rounded p-2 whitespace-pre-wrap">{application.references}</dd></div>}
                {application.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2 whitespace-pre-wrap">{application.notes}</dd></div>}
              </dl>
            </div>
          )}

          {/* Schedule & Availability Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Schedule &amp; Availability</h3>
              {scheduleMessage && <span className="text-xs text-green-600">{scheduleMessage}</span>}
            </div>
            <div className="space-y-2">
              {DAY_NAMES.map((dayName, i) => {
                const entry = workingHours[i]
                const isOn = entry !== null && entry !== undefined
                return (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isOn ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className={`w-24 text-sm font-medium ${isOn ? 'text-slate-900' : 'text-slate-400'}`}>{dayName}</span>
                    {isOn ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={entry?.start || '08:00'}
                          onChange={(e) => updateDayTime(i, 'start', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <span className="text-slate-400 text-xs">to</span>
                        <select
                          value={entry?.end || '17:00'}
                          onChange={(e) => updateDayTime(i, 'end', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
              <label className="block text-sm font-medium text-slate-900 mb-1">Home by</label>
              <p className="text-xs text-slate-500 mb-2">Latest they can finish. Scheduler won&apos;t book them past this. Leave as <strong>Not applicable</strong> unless it&apos;s a real constraint.</p>
              <select
                value={homeByTime}
                onChange={(e) => setHomeByTime(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
              >
                <option value="">Not applicable (no limit)</option>
                {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button onClick={saveSchedule} disabled={savingSchedule} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-900 mb-1">Instant pay (Stripe)</label>
              <p className="text-xs text-slate-500 mb-2">Generates a Stripe Connect onboarding link so they can add a bank account for automatic payouts.</p>
              <button onClick={sendOnboard} disabled={sendingOnboard} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {sendingOnboard ? 'Generating…' : 'Get onboarding link'}
              </button>
              {onboardMsg && <span className="ml-3 text-xs text-slate-600">{onboardMsg}</span>}
            </div>
          </div>

          {/* Time Off Section */}
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Time Off</h3>
              {timeOffMessage && <span className="text-xs text-green-600">{timeOffMessage}</span>}
            </div>

            {timeOff.length > 0 ? (
              <div className="space-y-2 mb-4">
                {timeOff.map((entry, i) => {
                  const startDate = new Date(entry.start + 'T00:00:00')
                  const endDate = new Date(entry.end + 'T00:00:00')
                  const isPast = endDate < new Date(new Date().toDateString())
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${isPast ? 'border-slate-200 opacity-50' : 'border-slate-200'}`}>
                      <div>
                        <p className="text-sm text-slate-900">
                          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {entry.start !== entry.end && <> &mdash; {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                          {isPast && <span className="text-xs text-slate-400 ml-2">(past)</span>}
                        </p>
                        {entry.reason && <p className="text-xs text-slate-400 mt-0.5">{entry.reason}</p>}
                      </div>
                      <button onClick={() => deleteTimeOff(i)} disabled={savingTimeOff} className="text-sm text-red-500 hover:text-red-600 px-2 py-1 disabled:opacity-50">
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">No time off scheduled</p>
            )}

            <div className="border-t border-slate-200 pt-4">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">Add Time Off</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">Start Date</label>
                  <input type="date" value={timeOffStart} onChange={(e) => setTimeOffStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">End Date</label>
                  <input type="date" value={timeOffEnd} onChange={(e) => setTimeOffEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase mb-1 block">Reason (optional)</label>
                  <input type="text" value={timeOffReason} onChange={(e) => setTimeOffReason(e.target.value)} placeholder="Vacation, sick day, etc." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                </div>
              </div>
              <button onClick={addTimeOff} disabled={savingTimeOff || !timeOffStart || !timeOffEnd} className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
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

        <div className="space-y-6">
          {/* Payouts (Stripe Connect) */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Payouts</h3>
            {member.stripe_account_id && member.stripe_ready_at ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Connected — auto-paid after each completed job.
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  {member.stripe_account_id
                    ? 'Onboarding started but not finished yet.'
                    : `Not set up. Once connected, ${member.name.split(' ')[0]} is auto-paid after each job.`}
                </p>
                <button
                  onClick={startStripe}
                  disabled={stripeBusy}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50"
                >
                  {stripeBusy ? 'Opening…' : 'Set up payouts'}
                </button>
                {stripeMessage && <p className="text-xs text-red-400 mt-2">{stripeMessage}</p>}
              </div>
            )}
          </div>

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
              {member.pay_rate && (
                <div>
                  <p className="text-sm text-slate-400">Avg Per Job</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {completedBookings.length > 0 ? `$${(totalEarnings / completedBookings.length).toFixed(0)}` : '—'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {member.phone && (
                <>
                  <a href={`tel:${member.phone}`} className="w-full block text-center text-sm bg-blue-50 text-blue-700 py-2 rounded-lg font-medium hover:bg-blue-100">Call</a>
                  <a href={`sms:${member.phone}`} className="w-full block text-center text-sm bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-100">Text</a>
                </>
              )}
              <button
                onClick={() => {
                  const link = `${window.location.origin}/team-portal`
                  navigator.clipboard.writeText(link)
                  setScheduleMessage('Team portal link copied!')
                  setTimeout(() => setScheduleMessage(''), 2000)
                }}
                className="w-full text-sm bg-slate-50 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-100"
              >
                Copy Team Portal Link
              </button>
            </div>
          </div>

          {/* Notification Preferences (Settings) */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Settings — Notifications</h3>
            <div className="space-y-3">
              {[
                { key: 'notify_new_job', label: 'New job assigned' },
                { key: 'notify_schedule_change', label: 'Schedule changes' },
                { key: 'notify_day_summary', label: 'Daily summary' },
                { key: 'notify_payment', label: 'Payment confirmed' },
              ].map(({ key, label }) => {
                const notesData = parseNotesData(member.notes)
                const prefs = notesData.notification_prefs || {}
                const isOn = prefs[key] !== false // default on
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{label}</span>
                    <button
                      onClick={async () => {
                        const existing = parseNotesData(member.notes)
                        const currentPrefs = existing.notification_prefs || {}
                        currentPrefs[key] = !isOn
                        const notes = JSON.stringify({ ...existing, notification_prefs: currentPrefs })
                        const res = await fetch(`/api/team/${id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes }),
                        })
                        if (res.ok) {
                          const { member: updated } = await res.json()
                          setMember(updated)
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isOn ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isOn ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                )
              })}
              <p className="text-[10px] text-slate-400 mt-2">
                Notifications sent via {member.phone ? 'SMS' : member.email ? 'email' : 'team portal'}
              </p>
            </div>
          </div>

          {/* Language settings surfaced here too since it's the other real
              per-member "setting" beyond notification prefs. */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Settings — Language</h3>
            <select
              value={member.preferred_language || 'en'}
              onChange={async (e) => {
                const res = await fetch(`/api/team/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ preferred_language: e.target.value }),
                })
                if (res.ok) {
                  const { member: updated } = await res.json()
                  setMember(updated)
                  setForm(updated)
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">Used for their portal, SMS, and job notifications.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
