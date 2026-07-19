'use client'

import SidePanel from '@/components/SidePanel'
import { useWorkerLabel } from '../worker-label-context'
import { Suspense, useEffect, useState } from 'react'
import { buildMemberColors, colorForMember, type ColorableMember } from '../calendar/_colors'
import { useSearchParams } from 'next/navigation'
import { RecurringOptions, generateRecurringDates, getRecurringDisplayName } from './_RecurringOptions'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useServiceTypes } from '@/lib/useServiceTypes'
import BookingNotes from '@/components/BookingNotes'
import { formatPhone } from '@/lib/format'
import { CloseoutDetail } from '@/components/closeout-detail'
import { worksScheduledDay, getDaySchedule, scheduleHasAnyDay } from '@/lib/day-availability'

export default function BookingsPageWrapper() {
  return (
    <Suspense>
      <BookingsPage />
    </Suspense>
  )
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  payment_status: string
  payment_method: string | null
  notes: string | null
  client_id: string
  cleaner_id: string
  cleaner_token: string | null
  hourly_rate: number | null
  recurring_type: string | null
  schedule_id: string | null
  actual_hours: number | null
  cleaner_pay: number | null
  check_in_time: string | null
  fifteen_min_alert_time: string | null
  check_out_time: string | null
  check_in_location: Record<string, unknown> | null
  check_out_location: Record<string, unknown> | null
  clients: { id: string; name: string; phone: string; address: string } | null
  cleaners: { id: string; name: string } | null
  cleaner_paid: boolean | null
  cleaner_paid_at: string | null
  cleaner_pay_rate: number | null
  walkthrough_video_url: string | null
  final_video_url: string | null
  suggested_cleaner_id: string | null
  suggested_reason: string | null
}

interface Client { id: string; name: string; phone: string; email: string; address: string; created_at: string; do_not_service?: boolean; preferred_cleaner_id?: string | null }
interface Cleaner { id: string; name: string; hourly_rate?: number; working_days?: string[]; unavailable_dates?: string[]; schedule?: Record<string, unknown>; active?: boolean; max_jobs_per_day?: number }
interface Referrer { id: string; name: string; ref_code: string; active: boolean }
interface SmartScore {
  id: string
  score: number
  available: boolean
  zone_match: boolean
  has_car: boolean
  can_make_home?: boolean
  distance_miles?: number
  travel_from_prev_min?: number
  travel_to_next_min?: number
  travel_to_home_min?: number
  prev_job_label?: string
  next_job_label?: string
  is_preferred?: boolean
  reason: string
}

// Alternate-time suggestion (admin view — full reason, since it's owner-facing).
// Mirrors SlotSuggestion from smart-schedule.ts.
interface SlotSuggestion {
  time24: string
  label: string
  cleanerId: string
  cleanerName: string
  score: number
  reason: string
  travelFromPrevMin?: number
  teamShort?: number
}

// Parse timestamp as UTC — Supabase may return without timezone offset
const toEST = (ts: string) => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}

// Convert a stored timestamp to the value an <input type="datetime-local"> wants
// (YYYY-MM-DDTHH:MM, rendered in ET).
const toDateTimeLocalET = (ts: string): string => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value || '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

// Convert a datetime-local input value (treated as ET wall clock) to a UTC ISO string.
const fromDateTimeLocalET = (val: string): string => {
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return new Date().toISOString()
  const [, y, mo, d, hh, mm] = m
  const utcMs = Date.UTC(+y, +mo - 1, +d, +hh, +mm)
  // Probe the ET offset for THIS specific datetime (handles DST correctly)
  const probe = new Date(utcMs)
  const probeETHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(probe))
  const probeUTCHour = probe.getUTCHours()
  let offsetHours = probeETHour - probeUTCHour
  if (offsetHours > 12) offsetHours -= 24
  if (offsetHours < -12) offsetHours += 24
  return new Date(utcMs - offsetHours * 3600000).toISOString()
}

// Alternate-time strip: shown when nobody is available at the chosen time.
// Clicking a pick rewrites the form's start time to that slot. Owner-facing,
// so the full clustering reason ("Victor is nearby…") is fine to show here.
function SuggestionStrip({ suggestions, onPick, variant }: { suggestions: SlotSuggestion[]; onPick: (time24: string) => void; variant: 'full' | 'better' }) {
  if (suggestions.length === 0) return null
  return (
    <div className={`mb-2 p-2 rounded-lg border ${variant === 'full' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50/60 border-indigo-200'}`}>
      <p className={`text-[11px] font-semibold mb-1.5 ${variant === 'full' ? 'text-amber-800' : 'text-indigo-700'}`}>
        {variant === 'full' ? "No one's free at that time. Try one of these:" : 'Better-routed times today:'}
      </p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.time24}
            type="button"
            onClick={() => onPick(s.time24)}
            className="flex items-baseline justify-between gap-2 text-left px-2 py-1.5 bg-white border border-amber-300 rounded hover:bg-amber-100 transition-colors"
          >
            <span className="text-sm font-semibold text-[#1E2A4A]">{s.label}</span>
            <span className="text-[11px] text-gray-600 flex-1">{s.reason}</span>
            {s.teamShort != null && s.teamShort > 0 && (
              <span className="text-[10px] text-red-500 font-medium">{s.teamShort} slot{s.teamShort > 1 ? 's' : ''} short</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function BookingsPage() {
  const searchParams = useSearchParams()
  const worker = useWorkerLabel()
  useEffect(() => { document.title = 'Bookings' }, []);
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3,6) + '-' + cleaned.slice(6,10)
  }

  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  // Team-member colors, built from /api/team in the SAME order the calendar uses
  // so a member reads as the same color in the picker and on the calendar.
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showUpdateChoice, setShowUpdateChoice] = useState(false)
  const [showCancelMenu, setShowCancelMenu] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [form, setForm] = useState({
    status: '', payment_status: '', payment_method: '', notes: '', cleaner_id: '',
    start_date: '', start_time: '', hours: 2, service_type: '', hourly_rate: 69,
    discount_enabled: false, discount_percent: 10,
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: '', custom_interval: 3,
    actual_hours: null as number | null, cleaner_pay: null as number | null,
    cleaner_paid: false,
    team_size: 1,
    extra_cleaner_ids: [] as string[],
    max_hours: null as number | null,
    override_availability: false,
    _originalPrice: 0
  })
  const [createForm, setCreateForm] = useState({
    client_id: '', cleaner_id: '', start_date: '', start_time: '09:00',
    hours: 2, hourly_rate: 69, service_type: 'Standard Cleaning', notes: '',
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: '', custom_interval: 3,
    discount_enabled: false, discount_percent: 10,
    is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled' as string,
    team_size: 1, extra_cleaner_ids: [] as string[], max_hours: null as number | null,
    override_availability: false, property_id: '' as string,
  })
  // Addresses for the selected client (the Create Booking address picker).
  const [clientProperties, setClientProperties] = useState<{ id: string; address: string; is_primary: boolean }[]>([])
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmCheckout, setConfirmCheckout] = useState(false)

  // Load the selected client's addresses; default the picker to their primary.
  useEffect(() => {
    const cid = createForm.client_id
    if (!showCreateModal || !cid) { setClientProperties([]); return }
    let cancelled = false
    fetch(`/api/client/properties?client_id=${cid}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const props = d.properties || []
        setClientProperties(props)
        setCreateForm(prev => {
          if (prev.property_id && props.some((p: { id: string }) => p.id === prev.property_id)) return prev
          const primary = props.find((p: { is_primary: boolean }) => p.is_primary) || props[0]
          return primary ? { ...prev, property_id: primary.id } : prev
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [showCreateModal, createForm.client_id])
  const [copied, setCopied] = useState(false)
  const [resendMenuId, setResendMenuId] = useState<string | null>(null)
  const [editCheckInVal, setEditCheckInVal] = useState<string | null>(null)
  const [editCheckOutVal, setEditCheckOutVal] = useState<string | null>(null)
  const [showCloseOut, setShowCloseOut] = useState(false)
  const [closeOutSaving, setCloseOutSaving] = useState<string | null>(null)
  const [closeOutExpanded, setCloseOutExpanded] = useState<Set<string>>(new Set())
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEntries, setWaitlistEntries] = useState<Array<{ id: string; name: string | null; phone: string; service_type: string | null; preferred_date: string | null; preferred_time: string | null; created_at: string; client_id: string | null }>>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  
  const [smartScores, setSmartScores] = useState<Record<string, SmartScore>>({})
  const [smartScoresKey, setSmartScoresKey] = useState<string>('')
  // Alternate-time picks shown when nobody is available at the requested time.
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])

  const [filters, setFilters] = useState({
    status: 'scheduled',
    service_type: '',
    cleaner_id: '',
    client_id: '',
    date_from: '',
    date_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    fetch('/api/team').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      const members: ColorableMember[] = Array.isArray(d) ? d : (d.team || d.team_members || [])
      setMemberColors(buildMemberColors(members))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadBookings(); loadClients(); loadCleaners(); loadReferrers()
    const interval = setInterval(loadBookings, 300000) // Auto-refresh bookings every 5min
    return () => clearInterval(interval)
  }, [])
  useEffect(() => { applyFilters() }, [bookings, filters, searchQuery])

  useEffect(() => {
    if (clientSearch) {
      const search = clientSearch.toLowerCase()
      const filtered = clients
        .filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search) || c.email?.toLowerCase().includes(search))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
      setFilteredClients(filtered)
    } else {
      setFilteredClients([])
    }
  }, [clientSearch, clients])

  // Auto-open create modal when linked from clients page with ?new=1&client_id=xxx
  useEffect(() => {
    if (searchParams.get('new') === '1' && clients.length > 0) {
      const clientId = searchParams.get('client_id')
      const client = clientId ? clients.find(c => c.id === clientId) : null
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3)
      setCreateForm({
        client_id: client ? client.id : '',
        cleaner_id: '', start_date: tomorrow.toISOString().split('T')[0],
        start_time: '09:00', hours: 2, hourly_rate: 69, service_type: 'Standard Cleaning', notes: '',
        repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
        repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
        discount_enabled: false, discount_percent: 10, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled',
        team_size: 1, extra_cleaner_ids: [], max_hours: null, override_availability: false, property_id: ''      })
      if (client) {
        setClientSearch(client.name + ' - ' + client.phone)
      }
      setShowClientDropdown(false)
      setShowCreateModal(true)
    }
  }, [searchParams, clients])

  // Auto-open edit modal when linked from calendar with ?edit=BOOKING_ID
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === editId)
      if (booking) {
        setFilters({ status: '', service_type: '', cleaner_id: '', client_id: '', date_from: '', date_to: '' })
        openEdit(booking)
        window.history.replaceState({}, '', '/admin/bookings')
      }
    }
  }, [searchParams, bookings])

  // Auto-open create modal when linked from calendar with ?date=...&time=...
  useEffect(() => {
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    if (date && !searchParams.get('new') && !searchParams.get('edit')) {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3)
      setCreateForm({
        client_id: '', cleaner_id: '', start_date: date,
        start_time: time || '09:00', hours: 2, hourly_rate: 69, service_type: 'Standard Cleaning', notes: '',
        repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
        repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
        discount_enabled: false, discount_percent: 10, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled',
        team_size: 1, extra_cleaner_ids: [], max_hours: null, override_availability: false, property_id: ''      })
      setClientSearch('')
      setShowClientDropdown(false)
      setShowCreateModal(true)
      window.history.replaceState({}, '', '/admin/bookings')
    }
  }, [searchParams])

  // Smart-schedule: fetch zone/proximity scores whenever a booking context is live
  useEffect(() => {
    let ctxClientId = ''
    let ctxAddress = ''
    let ctxDate = ''
    let ctxTime = ''
    let ctxHours = 2
    let ctxRate: number | undefined
    let ctxExclude = ''

    if (showCreateModal && createForm.start_date && createForm.start_time) {
      // Existing client → use their saved address. New client → use the address
      // being typed into the new-client form so scoring works before the client row exists.
      const cli = createForm.client_id ? clients.find(c => c.id === createForm.client_id) : null
      const selProp = clientProperties.find(p => p.id === createForm.property_id)
      ctxClientId = createForm.client_id
      // Rank cleaners against the PICKED address, not just the client's primary.
      ctxAddress = selProp?.address || cli?.address || newClientForm.address || ''
      ctxDate = createForm.start_date
      ctxTime = createForm.start_time
      ctxHours = createForm.hours
      ctxRate = createForm.hourly_rate
    } else if (showModal && editingBooking && form.start_date && form.start_time) {
      ctxClientId = editingBooking.client_id
      ctxAddress = editingBooking.clients?.address || ''
      ctxDate = form.start_date
      ctxTime = form.start_time
      ctxHours = form.hours
      ctxRate = form.hourly_rate
      ctxExclude = editingBooking.id
    } else {
      setSmartScores({})
      setSmartScoresKey('')
      setSuggestions([])
      return
    }

    if (!ctxAddress || !ctxDate || !ctxTime) return
    const teamSizeForKey = showCreateModal ? createForm.team_size : showModal ? form.team_size : 1
    const key = [ctxClientId, ctxAddress, ctxDate, ctxTime, ctxHours, ctxRate || '', ctxExclude, teamSizeForKey].join('|')
    if (key === smartScoresKey) return

    const controller = new AbortController()
    const ctxTeamSize = showCreateModal ? createForm.team_size : showModal ? form.team_size : 1
    const params = new URLSearchParams({
      date: ctxDate,
      start_time: ctxTime,
      duration: String(ctxHours),
      address: ctxAddress,
      client_id: ctxClientId,
      team_size: String(ctxTeamSize),
    })
    if (ctxRate != null) params.set('hourly_rate', String(ctxRate))
    if (ctxExclude) params.set('exclude_booking', ctxExclude)
    params.set('suggest', '1') // also fetch alternate times when nobody is free

    fetch(`/api/admin/smart-schedule?${params.toString()}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { cleaners?: SmartScore[]; suggestions?: SlotSuggestion[] | null } | null) => {
        if (!data?.cleaners) return
        const map: Record<string, SmartScore> = {}
        for (const c of data.cleaners) map[c.id] = c
        setSmartScores(map)
        setSmartScoresKey(key)
        setSuggestions(data.suggestions || [])
      })
      .catch(() => {})

    return () => controller.abort()
  }, [showCreateModal, showModal, editingBooking, createForm.client_id, createForm.property_id, clientProperties, createForm.start_date, createForm.start_time, createForm.hours, createForm.hourly_rate, createForm.team_size, newClientForm.address, form.start_date, form.start_time, form.hours, form.hourly_rate, form.team_size, clients, smartScoresKey])

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings?limit=200')
      if (res.ok) {
        const json = await res.json()
        // API returns { bookings, total }; tolerate a bare array too.
        const list: Booking[] = Array.isArray(json) ? json : (json.bookings ?? [])
        list.sort((a: Booking, b: Booking) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        setBookings(list)
      }
    } catch (e) {
      console.error('loadBookings failed', e)
    } finally {
      setLoading(false)
    }
  }
  const loadClients = async () => {
    const res = await fetch('/api/clients?limit=2000')
    if (!res.ok) return
    const json = await res.json()
    // API returns { clients, total }; tolerate a bare array. Never store a non-array
    // or client-search .filter() throws and crashes the page.
    setClients(Array.isArray(json) ? json : (json.clients ?? []))
  }
  const loadCleaners = async () => { const res = await fetch('/api/cleaners'); if (!res.ok) return; const j = await res.json(); setCleaners(Array.isArray(j) ? j : (j.cleaners ?? j.team ?? [])) }
  const loadReferrers = async () => { const res = await fetch('/api/referrers'); if (!res.ok) return; const j = await res.json(); setReferrers(Array.isArray(j) ? j : (j.referrers ?? [])) }

  const loadWaitlist = async () => {
    setWaitlistLoading(true)
    try {
      const res = await fetch('/api/waitlist')
      if (res.ok) setWaitlistEntries(await res.json())
    } catch {}
    setWaitlistLoading(false)
  }

  const getCleanerAvailability = (cleaner: Cleaner, dateStr: string, timeStr?: string, durationHours?: number): { available: boolean; reason?: string; dayBookings?: Array<{ time: string; client: string; hours: number }> } => {
    if (!dateStr) return { available: true }
    const dateObj = new Date(dateStr + 'T12:00:00')
    const dayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

    if (cleaner.unavailable_dates?.includes(dateStr)) {
      return { available: false, reason: 'Requested off' }
    }
    // No days configured (or all off) → NOT available; otherwise honor the set
    // days. worksScheduledDay normalizes both stored formats. See day-availability.ts.
    if (!worksScheduledDay(cleaner.working_days, cleaner.schedule, dateStr)) {
      return { available: false, reason: 'Doesn\'t work ' + dayShort + 's' }
    }
    if (scheduleHasAnyDay(cleaner.schedule)) {
      const daySchedule = getDaySchedule(cleaner.schedule, dateStr)
      if (daySchedule === null || daySchedule === undefined) {
        return { available: false, reason: 'Not scheduled' }
      }
      // Check if requested time falls within cleaner's working hours
      if (timeStr && daySchedule.start && daySchedule.end) {
        const parseTimeToMin = (t: string): number => {
          const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
          if (!match) return 0
          let hrs = parseInt(match[1])
          const mins = parseInt(match[2])
          const ampm = match[3]?.toUpperCase()
          if (ampm === 'PM' && hrs < 12) hrs += 12
          if (ampm === 'AM' && hrs === 12) hrs = 0
          return hrs * 60 + mins
        }
        const schedStart = parseTimeToMin(daySchedule.start)
        const schedEnd = parseTimeToMin(daySchedule.end)
        const [rh, rm] = timeStr.split(':').map(Number)
        const requestStart = rh * 60 + rm
        const requestEnd = requestStart + (durationHours || 2) * 60
        if (requestStart < schedStart) {
          return { available: false, reason: `Starts at ${daySchedule.start}` }
        }
        if (requestEnd > schedEnd) {
          return { available: false, reason: `Off by ${daySchedule.end}` }
        }
      }
    }

    // Check existing bookings on this date
    const dayBookingCount = bookings.filter(b => b.cleaner_id === cleaner.id && b.start_time.startsWith(dateStr) && !['cancelled'].includes(b.status)).length

    // Check max jobs per day
    if (cleaner.max_jobs_per_day && dayBookingCount >= cleaner.max_jobs_per_day) {
      return { available: false, reason: `Max ${cleaner.max_jobs_per_day} jobs/day (has ${dayBookingCount})` }
    }

    const dayBookings = bookings
      .filter(b => b.cleaner_id === cleaner.id && b.start_time.startsWith(dateStr) && !['cancelled'].includes(b.status))
      .map(b => {
        const start = new Date(b.start_time)
        const end = b.end_time ? new Date(b.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
        const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 2) / 2
        return {
          time: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          client: b.clients?.name || 'Client',
          hours,
          startMin: start.getHours() * 60 + start.getMinutes(),
          endMin: start.getHours() * 60 + start.getMinutes() + hours * 60,
        }
      })
      .sort((a, b) => a.startMin - b.startMin)

    // Check time conflict if time provided
    if (timeStr && durationHours) {
      const [h, m] = timeStr.split(':').map(Number)
      const requestStart = h * 60 + m
      const requestEnd = requestStart + durationHours * 60
      const buffer = 60 // 60 min buffer between jobs
      const conflict = dayBookings.find(b =>
        requestStart < b.endMin + buffer && requestEnd + buffer > b.startMin
      )
      if (conflict) {
        return {
          available: false,
          reason: `Conflict: ${conflict.time} ${conflict.client}`,
          dayBookings: dayBookings.map(({ time, client, hours }) => ({ time, client, hours })),
        }
      }
    }

    return {
      available: true,
      dayBookings: dayBookings.map(({ time, client, hours }) => ({ time, client, hours })),
    }
  }

  const applyFilters = () => {
    let result = [...bookings]
    if (filters.status) result = result.filter(b => b.status === filters.status)
    if (filters.service_type) result = result.filter(b => b.service_type === filters.service_type)
    if (filters.cleaner_id) result = result.filter(b => b.cleaner_id === filters.cleaner_id)
    if (filters.client_id) result = result.filter(b => b.client_id === filters.client_id)
    if (filters.date_from) result = result.filter(b => new Date(b.start_time) >= new Date(filters.date_from))
    if (filters.date_to) result = result.filter(b => new Date(b.start_time) <= new Date(filters.date_to + 'T23:59:59'))
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter(b => (b.clients?.name || '').toLowerCase().includes(q) || (b.clients?.phone || '').includes(q) || (b.clients?.address || '').toLowerCase().includes(q) || (b.cleaners?.name || '').toLowerCase().includes(q)) }
    setFilteredBookings(result)
  }

  // Close-out: jobs needing attention (in_progress/completed with payment or cleaner pay pending)
  const closeOutJobs = bookings.filter(b =>
    (b.status === 'in_progress' || b.status === 'completed') &&
    (b.payment_status !== 'paid' || !b.cleaner_paid)
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Also show recently completed & fully closed (last 7 days) for reference
  const recentlyClosedJobs = bookings.filter(b => {
    if (b.status !== 'completed' || b.payment_status !== 'paid' || !b.cleaner_paid) return false
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(b.start_time) >= sevenDaysAgo
  }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const handleCloseOutUpdate = async (bookingId: string, updates: Record<string, unknown>) => {
    setCloseOutSaving(bookingId)
    try {
      const res = await fetch('/api/bookings/' + bookingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        // Update local state
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } as Booking : b))
      }
    } catch (e) { console.error('Close out update failed:', e) }
    setCloseOutSaving(null)
  }

  const clearFilters = () => {
    setFilters({ status: 'scheduled', service_type: '', cleaner_id: '', client_id: '', date_from: '', date_to: '' })
  }

  // Parse naive datetime string (no timezone conversion)
  const parseNaive = (s: string) => {
    const [datePart, timePart] = s.split('T')
    return { date: datePart, time: (timePart || '00:00').slice(0, 5) }
  }

  const openEdit = (booking: Booking) => {
    setEditingBooking(booking)
    const start = parseNaive(booking.start_time)
    const end = parseNaive(booking.end_time)
    // Calculate hours from naive time strings
    const [sh, sm] = start.time.split(':').map(Number)
    const [eh, em] = end.time.split(':').map(Number)
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2

    // Derive rate: use stored hourly_rate, or calculate from price/hours, or default to 69
    const rate = booking.hourly_rate || (booking.price && hours ? Math.round(booking.price / 100 / hours) : 69)
    // For known rates, snap; otherwise keep the actual rate (custom)
    const knownRates = [49, 59, 65, 69, 75, 79, 89, 99, 100]
    const isKnownRate = knownRates.some(r => Math.abs(r - rate) <= 1)
    const snappedRate = isKnownRate
      ? knownRates.reduce((best, r) => Math.abs(r - rate) < Math.abs(best - rate) ? r : best, 69)
      : rate
    const fullPrice = (hours || 2) * snappedRate * 100
    const hasDiscount = booking.price < fullPrice && booking.price > 0
    const inferredDiscountPercent = hasDiscount && fullPrice > 0
      ? Math.max(1, Math.min(50, Math.round((1 - booking.price / fullPrice) * 100)))
      : 10

    const endDate3 = new Date()
    endDate3.setMonth(endDate3.getMonth() + 3)

    setForm({
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method || '',
      notes: booking.notes || '',
      cleaner_id: booking.cleaner_id || '',
      start_date: start.date,
      start_time: start.time,
      hours: hours || 2,
      service_type: booking.service_type,
      hourly_rate: snappedRate,
      discount_enabled: hasDiscount,
      discount_percent: inferredDiscountPercent,
      repeat_enabled: !!booking.recurring_type,
      repeat_type: reverseRecurringType(booking.recurring_type),
      repeat_end: 'never',
      repeat_end_count: 10,
      repeat_end_date: endDate3.toISOString().split('T')[0],
      custom_interval: 3,
      actual_hours: booking.actual_hours,
      cleaner_pay: booking.cleaner_pay,
      cleaner_paid: !!(booking as any).cleaner_paid,
      team_size: (booking as any).team_size || 1,
      extra_cleaner_ids: [],
      max_hours: (booking as any).max_hours ?? null,
      override_availability: false,
      _originalPrice: booking.price
    })
    setShowModal(true)
    setCopied(false)
    // Load existing team extras for this booking, async — they'll appear once fetched.
    if ((booking as any).team_size && (booking as any).team_size > 1) {
      fetch(`/api/bookings/${booking.id}/team`)
        .then(r => r.ok ? r.json() : null)
        .then((data: { extras?: string[] } | null) => {
          if (data?.extras) {
            setForm(prev => ({ ...prev, extra_cleaner_ids: data.extras || [] }))
          }
        })
        .catch(() => {})
    }
  }

  const openCreate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)
    setCreateForm({
      client_id: '', cleaner_id: '', start_date: tomorrow.toISOString().split('T')[0],
      start_time: '09:00', hours: 2, hourly_rate: 69, service_type: 'Standard Cleaning', notes: '',
      repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
      repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
      discount_enabled: false, discount_percent: 10, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled',
      team_size: 1, extra_cleaner_ids: [], max_hours: null, override_availability: false, property_id: ''    })
    setClientSearch('')
    setShowClientDropdown(false)
    setShowCreateModal(true)
  }

  const handleClientSelect = (client: Client) => {
    setCreateForm({ ...createForm, client_id: client.id })
    setClientSearch(client.name + ' - ' + client.phone)
    setShowClientDropdown(false)
  }

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    setCreateForm({ ...createForm, client_id: '' })
    setShowClientDropdown(true)
  }

  const handleNewClientClick = () => {
    setNewClientForm({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
    setShowNewClientModal(true)
    setShowClientDropdown(false)
  }

  const handleNewClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const fullAddress = newClientForm.unit
      ? `${newClientForm.address}, ${newClientForm.unit}`
      : newClientForm.address
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientForm.name, phone: newClientForm.phone, email: newClientForm.email, address: fullAddress, referrer_id: newClientForm.referrer_id || null, notes: newClientForm.notes || null })
    })
    if (res.ok) {
      const newClient = await res.json()
      await loadClients()
      setCreateForm({ ...createForm, client_id: newClient.id })
      setClientSearch(newClient.name + ' - ' + newClient.phone)
      setShowNewClientModal(false)
      setNewClientForm({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
    }
    setSaving(false)
  }

  const isExistingClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return false
    return new Date(client.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  }

  const calculatePrice = () => {
    const teamSize = Math.max(1, createForm.team_size || 1)
    const basePrice = createForm.hours * createForm.hourly_rate * teamSize * 100
    if (createForm.discount_enabled && createForm.discount_percent > 0) {
      const discounted = basePrice * (1 - createForm.discount_percent / 100)
      return Math.floor(discounted / 500) * 500 // round down to nearest $5
    }
    return basePrice
  }

  const calculateEditPrice = () => {
    const teamSize = Math.max(1, form.team_size || 1)
    // If editing a completed booking with actual_hours, use actual_hours for pricing
    if (form.actual_hours && form.actual_hours > 0) {
      return Math.round(form.actual_hours * form.hourly_rate * teamSize * 100)
    }
    const basePrice = form.hours * form.hourly_rate * teamSize * 100
    if (form.discount_enabled && form.discount_percent > 0) {
      const discounted = basePrice * (1 - form.discount_percent / 100)
      return Math.floor(discounted / 500) * 500
    }
    return basePrice
  }

  // Check if pricing fields changed from what was loaded
  const pricingChanged = () => {
    if (!editingBooking) return true
    const s = parseNaive(editingBooking.start_time), e = parseNaive(editingBooking.end_time)
    const [sh, sm] = s.time.split(':').map(Number), [eh, em] = e.time.split(':').map(Number)
    const origHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2
    const origRate = editingBooking.hourly_rate || form.hourly_rate
    // If recomputed price differs materially from stored price, pricing changed
    const recomputed = calculateEditPrice()
    const priceDelta = Math.abs(recomputed - editingBooking.price)
    return form.hours !== origHours || form.hourly_rate !== origRate ||
      priceDelta > 100 ||
      form.actual_hours !== editingBooking.actual_hours
  }

  const getEstimatedHoursRange = (hours: number) => {
    const ranges: Record<number, string> = { 1: '1-2', 2: '2-3', 3: '3-4', 4: '4-6', 5: '5-7', 6: '6-8', 7: '7-9' }
    return ranges[hours] || hours + '-' + (hours + 2)
  }

  const recurringDates = generateRecurringDates(
    createForm.start_date, createForm.repeat_enabled, createForm.repeat_type,
    createForm.repeat_end, createForm.repeat_end_count, createForm.repeat_end_date, createForm.custom_interval
  )

  const editRecurringDates = generateRecurringDates(
    form.start_date, form.repeat_enabled, form.repeat_type,
    form.repeat_end, form.repeat_end_count, form.repeat_end_date, form.custom_interval
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingBooking?.recurring_type || editingBooking?.schedule_id) {
      setShowUpdateChoice(true)
      return
    }
    await saveBooking('single')
  }

  // Build naive datetime string from date + time + hours (no Date object, no TZ shift)
  const buildNaiveTime = (date: string, time: string, addHours: number = 0) => {
    const [h, m] = time.split(':').map(Number)
    const totalMinutes = h * 60 + m + addHours * 60
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${date}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`
  }

  // Calculate minute difference between two naive time strings
  const naiveMinuteDiff = (a: string, b: string) => {
    const [ad, at] = a.split('T'); const [bd, bt] = b.split('T')
    const [ay, am, aday] = ad.split('-').map(Number); const [by, bm, bday] = bd.split('-').map(Number)
    const [ah, amin] = at.split(':').map(Number); const [bh, bmin] = bt.split(':').map(Number)
    const aTotal = new Date(ay, am - 1, aday).getTime() / 60000 + ah * 60 + amin
    const bTotal = new Date(by, bm - 1, bday).getTime() / 60000 + bh * 60 + bmin
    return aTotal - bTotal
  }

  // Shift a naive time string by N minutes
  const shiftNaive = (s: string, minutes: number) => {
    const [datePart, timePart] = s.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = timePart.split(':').map(Number)
    const dt = new Date(y, mo - 1, d, h, m + minutes)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
  }

  const saveBooking = async (scope: 'single' | 'all') => {
    setSaving(true)
    setShowUpdateChoice(false)

    const newStartStr = buildNaiveTime(form.start_date, form.start_time)
    const newEndStr = buildNaiveTime(form.start_date, form.start_time, form.hours)
    const recurringType = form.repeat_enabled ? getRecurringDisplayName(form.repeat_type, form.start_date) : null

    const updateData = {
      ...form,
      start_time: newStartStr,
      end_time: newEndStr,
      price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
      recurring_type: recurringType,
      force: true,
    }

    if (scope === 'all' && (editingBooking?.schedule_id || editingBooking?.recurring_type)) {
      // Check if the recurring pattern itself changed (not just time/price/cleaner)
      const oldRecurringType = editingBooking.recurring_type
      const patternChanged = recurringType !== oldRecurringType

      if (patternChanged && editingBooking.schedule_id && form.repeat_enabled) {
        // Pattern changed: one atomic server call replaces the old N+N
        // delete-each / create-each loop (rule update + cancel-future +
        // regenerate, all server-side). Only future scheduled/pending bookings
        // from this booking forward are touched.
        const startDateObj = new Date(form.start_date + 'T12:00:00')
        const newDates = generateRecurringDates(
          form.start_date, true, form.repeat_type,
          form.repeat_end, form.repeat_end_count, form.repeat_end_date, form.custom_interval
        )
        const res = await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id + '/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recurring_type: recurringType,
            day_of_week: startDateObj.getDay(),
            preferred_time: form.start_time,
            duration_hours: form.hours,
            hourly_rate: form.hourly_rate,
            cleaner_id: form.cleaner_id,
            service_type: form.service_type,
            price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
            status: 'scheduled',
            notes: form.notes || null,
            dates: newDates,
            from_date: editingBooking.start_time,
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          alert(`Failed to update recurring series: ${err.error || res.statusText}`)
          setSaving(false)
          return
        }
      } else {
        // Pattern unchanged: shift times/update fields on existing bookings
        const deltaMinutes = naiveMinuteDiff(newStartStr, editingBooking.start_time)
        const durationMinutes = form.hours * 60

        const futureBookings = editingBooking.schedule_id
          ? bookings.filter(b =>
              b.schedule_id === editingBooking.schedule_id &&
              b.status === 'scheduled' &&
              b.start_time >= editingBooking.start_time
            )
          : bookings.filter(b =>
              b.client_id === editingBooking.client_id &&
              b.recurring_type === editingBooking.recurring_type &&
              b.status === 'scheduled' &&
              b.start_time >= editingBooking.start_time
            )

        // Batch update all future bookings in one request (no email spam)
        // status/payment_status/payment_method are per-instance — never propagate
        // them across the series, or editing a completed past booking will mark
        // every future booking completed/paid too.
        const batchUpdates = futureBookings.map(booking => ({
          id: booking.id,
          data: {
            start_time: shiftNaive(booking.start_time, deltaMinutes),
            end_time: shiftNaive(booking.start_time, deltaMinutes + durationMinutes),
            cleaner_id: form.cleaner_id || null,
            price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
            hourly_rate: form.hourly_rate,
            service_type: form.service_type,
            notes: form.notes || null,
            recurring_type: recurringType,
          }
        }))

        const res = await fetch('/api/bookings/batch-update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: batchUpdates, notify_type: deltaMinutes !== 0 ? 'rescheduled' : 'booking_updated' })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          alert(`Failed to update series: ${err.error || res.statusText}`)
          setSaving(false)
          return
        }

        // Also update the schedule record with non-pattern fields
        if (editingBooking.schedule_id) {
          await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferred_time: form.start_time,
              duration_hours: form.hours,
              hourly_rate: form.hourly_rate,
              cleaner_id: form.cleaner_id,
              notes: form.notes || null,
            })
          })
        }
      }
    } else {
      // Update this booking
      const res = await fetch('/api/bookings/' + editingBooking?.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to save booking: ${err.error || res.statusText}`)
        setSaving(false)
        return
      }

      // If repeat newly enabled on a non-recurring booking, create future bookings
      if (form.repeat_enabled && !editingBooking?.recurring_type && editRecurringDates.length > 1) {
        for (let i = 1; i < editRecurringDates.length; i++) {
          const date = editRecurringDates[i]
          await fetch('/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: editingBooking?.client_id, cleaner_id: form.cleaner_id,
              start_time: buildNaiveTime(date, form.start_time), end_time: buildNaiveTime(date, form.start_time, form.hours),
              service_type: form.service_type, price: calculateEditPrice(),
              hourly_rate: form.hourly_rate, recurring_type: recurringType, notes: form.notes || null,
              skip_email: true
            })
          })
        }
      }
    }

    // Save team membership (lead + extras + team_size) for this booking.
    if (editingBooking?.id) {
      await fetch(`/api/bookings/${editingBooking.id}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: form.cleaner_id || null,
          extra_cleaner_ids: form.extra_cleaner_ids,
          team_size: form.team_size,
        })
      })
    }

    // Refresh booking in place — don't close panel
    const { data: refreshed } = await fetch('/api/bookings/' + editingBooking?.id).then(r => r.ok ? r.json() : { data: null })
    if (refreshed) setEditingBooking(refreshed)
    loadBookings()
    setSaving(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const recurringType = createForm.repeat_enabled ? getRecurringDisplayName(createForm.repeat_type, createForm.start_date) : null

    if (createForm.is_emergency) {
      // Emergency: single booking + broadcast (can't batch)
      const date = recurringDates[0]
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: createForm.client_id, property_id: createForm.property_id || null, cleaner_id: null,
          start_time: buildNaiveTime(date, createForm.start_time),
          end_time: buildNaiveTime(date, createForm.start_time, createForm.hours),
          service_type: createForm.service_type, price: calculatePrice(),
          hourly_rate: createForm.hourly_rate, recurring_type: recurringType,
          notes: createForm.notes || null, skip_email: true,
          status: 'available', cleaner_pay_rate: createForm.cleaner_pay_rate,
          max_hours: createForm.max_hours,
          force: true,
        })
      })
      if (res.ok) {
        const booking = await res.json()
        await fetch('/api/bookings/broadcast', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id })
        })
      }
    } else if (createForm.repeat_enabled && recurringType && recurringDates.length > 1) {
      // Recurring: create schedule + first 6 weeks of bookings (cron generates the rest daily)
      const fourWeeksOut = new Date(createForm.start_date + 'T12:00:00')
      fourWeeksOut.setDate(fourWeeksOut.getDate() + 42)
      const cutoff = fourWeeksOut.toISOString().split('T')[0]
      const initialDates = recurringDates.filter(d => d <= cutoff)

      const scheduleRes = await fetch('/api/admin/recurring-schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: createForm.client_id,
          property_id: createForm.property_id || null,
          cleaner_id: createForm.cleaner_id,
          recurring_type: recurringType,
          day_of_week: new Date(createForm.start_date + 'T12:00:00').getDay(),
          preferred_time: createForm.start_time,
          duration_hours: createForm.hours,
          hourly_rate: createForm.hourly_rate,
          cleaner_pay_rate: createForm.cleaner_pay_rate,
          notes: createForm.notes || null,
          start_date: createForm.start_date,
          price: calculatePrice(),
          service_type: createForm.service_type,
          status: createForm.status,
          dates: initialDates,
        })
      })
      if (!scheduleRes.ok) {
        const err = await scheduleRes.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to create recurring schedule: ${err.error || scheduleRes.statusText}`)
      }
    } else {
      // Single booking via batch (1 booking)
      const bookings = recurringDates.map(date => ({
        client_id: createForm.client_id,
        property_id: createForm.property_id || null,
        cleaner_id: createForm.cleaner_id,
        start_time: buildNaiveTime(date, createForm.start_time),
        end_time: buildNaiveTime(date, createForm.start_time, createForm.hours),
        service_type: createForm.service_type,
        price: calculatePrice(),
        hourly_rate: createForm.hourly_rate,
        recurring_type: recurringType,
        notes: createForm.notes || null,
        status: createForm.status,
        team_size: createForm.team_size,
        extra_cleaner_ids: createForm.extra_cleaner_ids,
        max_hours: createForm.max_hours,
      }))

      await fetch('/api/bookings/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings })
      })
    }
    setShowCreateModal(false); loadBookings(); setSaving(false)
  }

  const handleCancel = async (scope: 'single' | 'all') => {
    if (!editingBooking) return
    setSaving(true)

    try {
      if (scope === 'all' && (editingBooking.schedule_id || editingBooking.recurring_type)) {
        if (editingBooking.schedule_id) {
          // Use schedule_id for precise series cancellation (server-side)
          const res = await fetch('/api/bookings/' + editingBooking.id + '?cancel_series=true', { method: 'DELETE' })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            alert(`Failed to cancel series: ${err.error || 'Unknown error'}`)
            setSaving(false)
            return
          }
        } else {
          // Legacy fallback: batch cancel by client_id + recurring_type
          const futureBookings = bookings.filter(b =>
            b.client_id === editingBooking.client_id &&
            b.recurring_type === editingBooking.recurring_type &&
            (b.status === 'scheduled' || b.status === 'pending') &&
            b.start_time >= editingBooking.start_time
          )

          if (futureBookings.length > 0) {
            // Cancel first with email, rest skip email
            const res = await fetch('/api/bookings/' + futureBookings[0].id, { method: 'DELETE' })
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: res.statusText }))
              alert(`Failed to cancel booking: ${err.error || 'Unknown error'}`)
              setSaving(false)
              return
            }
            if (futureBookings.length > 1) {
              await Promise.all(
                futureBookings.slice(1).map(b =>
                  fetch('/api/bookings/' + b.id + '?skip_email=true', { method: 'DELETE' })
                )
              )
            }
          }
        }
      } else if (editingBooking.schedule_id) {
        // Single occurrence of a recurring series → record a skip exception.
        // This removes THIS date's booking AND stops the generator from
        // refilling it, without disturbing the rest of the series. Cleaner than
        // a bare delete the cron could regenerate.
        const occDate = editingBooking.start_time.split('T')[0]
        const res = await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id + '/exception', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ occurrence_date: occDate, type: 'skip' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          alert(`Failed to cancel this occurrence: ${err.error || 'Unknown error'}`)
          setSaving(false)
          return
        }
      } else {
        const res = await fetch('/api/bookings/' + editingBooking.id, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          alert(`Failed to cancel booking: ${err.error || 'Unknown error'}`)
          setSaving(false)
          return
        }
      }

      // Refresh — booking now shows as cancelled
      const res2 = await fetch('/api/bookings/' + editingBooking.id)
      if (res2.ok) { const refreshed = await res2.json(); if (refreshed) setEditingBooking(refreshed) }
      await loadBookings()
    } catch (e) {
      alert(`Failed to cancel booking: ${e instanceof Error ? e.message : 'Network error'}`)
    }
    setSaving(false)
  }

  const handleResend = async (bookingId: string, channel: 'email' | 'sms') => {
    setResendMenuId(null)
    const res = await fetch('/api/send-booking-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, clientOnly: true, ...(channel === 'sms' ? { channel: 'sms' } : {}) })
    })
    if (res.ok) {
      alert(channel === 'sms' ? 'Confirmation text sent!' : 'Confirmation email sent!')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || `Failed to send ${channel}`)
    }
  }

  const copyTeamLink = () => {
    if (editingBooking?.cleaner_token) {
      navigator.clipboard.writeText(window.location.origin + '/team/' + editingBooking.cleaner_token)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  }

  const formatDate = (dateStr: string) => {
    // Parse naive datetime string to avoid timezone shift
    const [datePart, timePart] = dateStr.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    const dt = new Date(y, mo - 1, d, h, m)
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const serviceTypesData = useServiceTypes()
  // Catalog-driven only — no cleaning fallback. Shows the tenant's own services.
  const serviceTypes = serviceTypesData.map(s => s.name)

  // Reverse-map stored recurring_type display name back to form repeat_type
  const reverseRecurringType = (displayName: string | null): string => {
    if (!displayName) return 'weekly'
    const lower = displayName.toLowerCase()
    if (lower === 'daily') return 'daily'
    if (lower === 'weekly') return 'weekly'
    if (lower === 'bi-weekly') return 'biweekly'
    if (lower === 'tri-weekly') return 'triweekly'
    if (lower === 'monthly') return 'monthly_date'
    if (lower === 'custom') return 'custom'
    // Pattern like "1st Mon", "2nd Thu" = monthly_day
    if (/^\d/.test(displayName)) return 'monthly_day'
    return 'weekly'
  }

  const activeFilterCount = [filters.service_type, filters.cleaner_id, filters.client_id, filters.date_from, filters.date_to].filter(Boolean).length

  // Status counts for filter pills
  const statusCounts = {
    all: bookings.length,
    scheduled: bookings.filter(b => b.status === 'scheduled').length,
    in_progress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  }

  // Summary stats
  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0)
  const upcomingCount = bookings.filter(b => b.status === 'scheduled' && new Date(b.start_time) > new Date()).length
  const thisWeekCount = bookings.filter(b => {
    const d = new Date(b.start_time)
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return d >= now && d <= weekFromNow && b.status === 'scheduled'
  }).length

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [filters, searchQuery])

  const statusPillClass = (status: string) => {
    const isActive = filters.status === status
    const base = 'px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5'
    if (status === '' && !filters.status) return base + ' bg-[#1E2A4A] text-white shadow-sm'
    if (isActive) return base + ' bg-[#1E2A4A] text-white shadow-sm'
    return base + ' bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
  }

  return (
    <>
      <main className="p-3 md:p-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">BOOKINGS</h2>
            <p className="text-2xl font-bold text-[#1E2A4A]">Manage Bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={'px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ' + (showFilters || activeFilterCount > 0 ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-[#1E2A4A] hover:border-gray-300 hover:bg-gray-50')}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </button>
            <button onClick={() => { setShowWaitlist(!showWaitlist); if (!showWaitlist) loadWaitlist() }} className={'px-4 py-2.5 border rounded-xl font-medium text-sm transition-all flex items-center gap-2 ' + (showWaitlist ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 text-[#1E2A4A] hover:border-gray-300 hover:bg-gray-50')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Waitlist
            </button>
            <button onClick={() => setShowCloseOut(!showCloseOut)} className={'px-4 py-2.5 border rounded-xl font-medium text-sm transition-all flex items-center gap-2 ' + (showCloseOut ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-[#1E2A4A] hover:border-gray-300 hover:bg-gray-50')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Close Out{closeOutJobs.length > 0 ? ` (${closeOutJobs.length})` : ''}
            </button>
            <button onClick={() => {
              const escCsv = (v: unknown) => {
                let s = v == null ? '' : String(v)
                // Neutralize CSV formula injection (Excel/Sheets execute leading =,+,-,@).
                if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
                return `"${s.replace(/"/g, '""')}"`
              }
              const rows = filteredBookings.map(b => [
                new Date(b.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York' }), new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                b.clients?.name || '', b.cleaners?.name || '', b.service_type || '', b.status,
                b.hourly_rate ? '$' + b.hourly_rate : '', '$' + (b.price / 100).toFixed(0), b.payment_status || ''
              ].map(escCsv).join(','))
              const csv = 'Date,Time,Client,Cleaner,Service,Status,Rate,Price,Payment\n' + rows.join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`; a.click()
              URL.revokeObjectURL(url)
            }} className="px-4 py-2.5 border border-gray-200 text-[#1E2A4A] rounded-xl font-medium text-sm hover:bg-gray-50 transition-all">Export</button>
            <button onClick={openCreate} className="bg-[#1E2A4A] text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-[#1E2A4A]/90 transition-all shadow-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Booking
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-xs text-gray-400 mb-4 hidden md:flex items-center gap-1 flex-wrap">
          <a href="https://www.thenycmaid.com/book" target="_blank" className="text-gray-500 hover:text-[#1E2A4A] hover:underline">Client Portal</a>
          <span className="text-gray-300 mx-1">/</span>
          <a href="https://www.thenycmaid.com/book/new" target="_blank" className="text-gray-500 hover:text-[#1E2A4A] hover:underline">New Booking</a>
          <span className="text-gray-300 mx-1">/</span>
          <a href="https://www.thenycmaid.com/book/collect" target="_blank" className="text-gray-500 hover:text-[#1E2A4A] hover:underline">Collect Info</a>
          <span className="text-gray-300 mx-1">/</span>
          <a href="https://www.thenycmaid.com/team" target="_blank" className="text-gray-500 hover:text-[#1E2A4A] hover:underline">Team Portal</a>
        </div>

        {/* Stat Cards */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Upcoming</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{upcomingCount}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">This Week</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{thisWeekCount}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{statusCounts.completed}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Revenue</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">${(totalRevenue / 100).toLocaleString('en-US')}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" placeholder={`Search client, ${worker.singular.toLowerCase()}, address...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1E2A4A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/10 focus:border-[#1E2A4A] transition-all" />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide flex-nowrap">
          <button onClick={() => setFilters({ ...filters, status: '' })} className={statusPillClass('')}>
            All <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{statusCounts.all}</span>
          </button>
          {statusCounts.pending > 0 && (
            <button onClick={() => setFilters({ ...filters, status: 'pending' })} className={statusPillClass('pending')}>
              Pending <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (filters.status === 'pending' ? 'bg-white/20' : 'bg-red-100 text-red-600')}>{statusCounts.pending}</span>
            </button>
          )}
          <button onClick={() => setFilters({ ...filters, status: 'scheduled' })} className={statusPillClass('scheduled')}>
            Scheduled <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (filters.status === 'scheduled' ? 'bg-white/20' : 'bg-blue-100 text-blue-600')}>{statusCounts.scheduled}</span>
          </button>
          <button onClick={() => setFilters({ ...filters, status: 'in_progress' })} className={statusPillClass('in_progress')}>
            In Progress <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (filters.status === 'in_progress' ? 'bg-white/20' : 'bg-amber-100 text-amber-600')}>{statusCounts.in_progress}</span>
          </button>
          <button onClick={() => setFilters({ ...filters, status: 'completed' })} className={statusPillClass('completed')}>
            Completed <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (filters.status === 'completed' ? 'bg-white/20' : 'bg-green-100 text-green-600')}>{statusCounts.completed}</span>
          </button>
          <button onClick={() => setFilters({ ...filters, status: 'cancelled' })} className={statusPillClass('cancelled')}>
            Canceled <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (filters.status === 'cancelled' ? 'bg-white/20' : 'bg-gray-100 text-gray-500')}>{statusCounts.cancelled}</span>
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-4 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Service</label>
                <select value={filters.service_type} onChange={(e) => setFilters({ ...filters, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] text-sm bg-white focus:outline-none focus:border-[#1E2A4A]">
                  <option value="">All</option>
                  {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{worker.singular}</label>
                <select value={filters.cleaner_id} onChange={(e) => setFilters({ ...filters, cleaner_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] text-sm bg-white focus:outline-none focus:border-[#1E2A4A]">
                  <option value="">All</option>
                  {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client</label>
                <select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] text-sm bg-white focus:outline-none focus:border-[#1E2A4A]">
                  <option value="">All</option>
                  {[...clients].sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
                <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] text-sm bg-white focus:outline-none focus:border-[#1E2A4A]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
                <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] text-sm bg-white focus:outline-none focus:border-[#1E2A4A]" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-gray-500">{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found</p>
              <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-[#1E2A4A] transition-colors">Clear All</button>
            </div>
          </div>
        )}

        {/* Pending Bookings Section */}
        {!loading && bookings.filter(b => b.status === 'pending').length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/60 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide">Pending Approval ({bookings.filter(b => b.status === 'pending').length})</h3>
            </div>
            <div className="space-y-2">
              {bookings.filter(b => b.status === 'pending').map((b) => (
                <div key={b.id} onClick={() => openEdit(b)} className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-red-200/40 rounded-xl p-3.5 cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                  <div>
                    <p className="text-[#1E2A4A] font-semibold text-sm">{b.clients?.name || '-'}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(b.start_time)} · {b.service_type}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{b.clients?.address || ''}</p>
                    {b.suggested_cleaner_id && (() => {
                      const suggested = cleaners.find(c => c.id === b.suggested_cleaner_id)
                      return suggested ? (
                        <p className="text-green-600 text-xs mt-1 font-medium">Suggested: {suggested.name}{b.suggested_reason ? ` — ${b.suggested_reason}` : ''}</p>
                      ) : null
                    })()}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Pending</span>
                    <p className="text-[#1E2A4A] text-sm font-semibold">~${(b.price / 100).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist Panel */}
        {showWaitlist && (
          <div className="mb-5">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200/60 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Waiting List ({waitlistEntries.length})</h3>
                </div>
                <button onClick={() => setShowWaitlist(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>
              {waitlistLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : waitlistEntries.length === 0 ? (
                <p className="text-purple-600 text-sm py-4 text-center">No one on the waiting list!</p>
              ) : (
                <div className="space-y-3">
                  {waitlistEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[#1E2A4A] font-semibold text-sm">{entry.name || 'Unknown'}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{formatPhone(entry.phone)}</p>
                          {entry.service_type && <p className="text-gray-400 text-xs mt-0.5">{entry.service_type}</p>}
                        </div>
                        <div className="text-right">
                          {entry.preferred_date && (
                            <p className="text-purple-700 font-medium text-sm">
                              {new Date(entry.preferred_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          )}
                          {entry.preferred_time && <p className="text-gray-400 text-xs">{entry.preferred_time}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            const endDate = new Date()
                            endDate.setMonth(endDate.getMonth() + 3)
                            setCreateForm({
                              client_id: entry.client_id || '',
                              cleaner_id: '', start_date: entry.preferred_date || tomorrow.toISOString().split('T')[0],
                              start_time: entry.preferred_time ? entry.preferred_time.replace(/\s*(am|pm)/i, (_, ap) => ap.toLowerCase() === 'am' ? ':00' : ':00').replace(/(\d{1,2})(am|pm)/i, (_, h, ap) => { const hr = parseInt(h); const hour = ap.toLowerCase() === 'pm' && hr < 12 ? hr + 12 : ap.toLowerCase() === 'am' && hr === 12 ? 0 : hr; return `${String(hour).padStart(2, '0')}:00` }) : '09:00',
                              hours: 2, hourly_rate: 69, service_type: entry.service_type || 'Standard Cleaning', notes: 'Booked from waitlist',
                              repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
                              repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
                              discount_enabled: false, discount_percent: 10, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled',
                              team_size: 1, extra_cleaner_ids: [], max_hours: null, override_availability: false, property_id: ''                            })
                            if (entry.name) setClientSearch(entry.name + ' - ' + entry.phone)
                            setShowClientDropdown(false)
                            setShowCreateModal(true)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Book Now
                        </button>
                        <a href={`sms:+1${entry.phone.replace(/\D/g, '')}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          Text
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Out Panel */}
        {showCloseOut && (
          <div className="mb-5">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Close Out Jobs ({closeOutJobs.length})</h3>
                </div>
                <button onClick={() => setShowCloseOut(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>
              {closeOutJobs.length === 0 ? (
                <p className="text-emerald-600 text-sm py-4 text-center">All jobs are closed out!</p>
              ) : (
                <div className="space-y-3">
                  {closeOutJobs.map((b) => {
                    const isSaving = closeOutSaving === b.id
                    const isExpanded = closeOutExpanded.has(b.id)
                    const toggleExpanded = () => {
                      setCloseOutExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(b.id)) next.delete(b.id); else next.add(b.id)
                        return next
                      })
                    }
                    return (
                      <div key={b.id} className={'bg-white rounded-xl border p-4 transition-all ' + (isSaving ? 'opacity-60 border-emerald-200' : 'border-gray-200')}>
                        {/* Job header */}
                        <div className="flex items-start justify-between mb-3">
                          <button onClick={toggleExpanded} className="flex-1 text-left hover:opacity-80 transition-opacity">
                            <p className="text-[#1E2A4A] font-semibold text-sm flex items-center gap-1.5">
                              <span className={'inline-block transition-transform ' + (isExpanded ? 'rotate-90' : '')}>▸</span>
                              {b.clients?.name || '-'}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5 ml-4">{formatDate(b.start_time)} · {b.cleaners?.name || 'Unassigned'}</p>
                            <p className="text-gray-400 text-xs mt-0.5 ml-4">{b.service_type}</p>
                          </button>
                          <div className="text-right">
                            <p className="text-[#1E2A4A] font-bold text-lg">${(b.price / 100).toFixed(0)}</p>
                            {b.cleaner_pay ? <p className="text-gray-400 text-xs">Pay: ${(Number(b.cleaner_pay) / 100).toFixed(2)}</p> : null}
                          </div>
                        </div>
                        {/* Close out controls */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Job Complete */}
                          <button
                            disabled={isSaving}
                            onClick={() => {
                              const newStatus = b.status === 'completed' ? 'in_progress' : 'completed'
                              handleCloseOutUpdate(b.id, { status: newStatus })
                            }}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                              (b.status === 'completed'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50')}
                          >
                            <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                              (b.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                              {b.status === 'completed' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            Job Done
                          </button>
                          {/* Payment Collected */}
                          <button
                            disabled={isSaving}
                            onClick={() => {
                              if (b.payment_status === 'paid') {
                                handleCloseOutUpdate(b.id, { payment_status: 'pending', payment_method: null })
                              } else {
                                handleCloseOutUpdate(b.id, { payment_status: 'paid' })
                              }
                            }}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                              (b.payment_status === 'paid'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50')}
                          >
                            <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                              (b.payment_status === 'paid' ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                              {b.payment_status === 'paid' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            Paid
                          </button>
                          {/* Payment Method */}
                          <div className="flex gap-1">
                            <button
                              disabled={isSaving}
                              onClick={() => handleCloseOutUpdate(b.id, { payment_method: 'zelle', payment_status: 'paid' })}
                              className={'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                                (b.payment_method === 'zelle'
                                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-purple-200 hover:text-purple-600')}
                            >
                              Zelle
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleCloseOutUpdate(b.id, { payment_method: 'apple_pay', payment_status: 'paid' })}
                              className={'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                                (b.payment_method === 'apple_pay'
                                  ? 'bg-gray-800 border-gray-800 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600')}
                            >
                              Apple
                            </button>
                          </div>
                          {/* Cleaner Paid */}
                          <button
                            disabled={isSaving}
                            onClick={() => handleCloseOutUpdate(b.id, { cleaner_paid: !b.cleaner_paid })}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                              (b.cleaner_paid
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50')}
                          >
                            <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                              (b.cleaner_paid ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                              {b.cleaner_paid && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            Team Paid
                          </button>
                        </div>
                        {isExpanded && <CloseoutDetail bookingId={b.id} onAnyChange={loadBookings} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Recently closed out */}
            {recentlyClosedJobs.length > 0 && (
              <div className="bg-gray-50/80 border border-gray-200/60 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Recently Closed (Last 7 Days)</h3>
                <div className="space-y-1">
                  {recentlyClosedJobs.map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                          <p className="text-sm text-[#1E2A4A] font-medium">{b.clients?.name || '-'}</p>
                          <p className="text-xs text-gray-400">{formatDate(b.start_time)} · {b.cleaners?.name || '-'}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs text-gray-400">{b.payment_method === 'zelle' ? 'Zelle' : 'Apple'}</span>
                        <span className="text-sm font-semibold text-[#1E2A4A]">${(b.price / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm hidden md:block">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#1E2A4A] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading bookings...</p>
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-500 text-sm">No bookings found.</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search</p>
            </div>
          ) : (
            <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{worker.singular}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Recurring</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedBookings.map((b) => (
                  <tr
                    key={b.id}
                    className={
                      'cursor-pointer transition-colors ' +
                      (b.status === 'in_progress' ? 'bg-amber-50/50 hover:bg-amber-50' :
                       b.status === 'cancelled' ? 'bg-gray-50/50 opacity-60 hover:opacity-80 hover:bg-gray-50' :
                       b.status === 'pending' ? 'bg-red-50/30 hover:bg-red-50/60' :
                       'hover:bg-gray-50/80')
                    }
                    onClick={() => openEdit(b)}
                  >
                    <td className="px-4 py-3.5">
                      <div>
                        <p className={'text-sm font-medium ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[#1E2A4A]')}>{b.clients?.name || '-'}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{b.clients?.address || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600')}>{b.service_type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[#1E2A4A]')}>{formatDate(b.start_time)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600')}>{b.cleaners?.name || <span className="text-gray-300">--</span>}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500')}>${(() => { const hours = Math.max(1, Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60))); return b.hourly_rate ? b.hourly_rate : b.price ? Math.round(b.price / 100 / hours) : 69 })()}/hr</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm font-semibold ' + (b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[#1E2A4A]')}>~${(b.price / 100).toFixed(0)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {b.recurring_type ? <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium border border-purple-100">{b.recurring_type}</span> : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ' +
                        (b.status === 'pending' ? 'bg-red-100 text-red-700' :
                         b.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                         b.status === 'completed' ? 'bg-green-100 text-green-700' :
                         b.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                         'bg-blue-100 text-blue-700')
                      }>
                        {b.status === 'completed' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        {b.status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {b.status !== 'cancelled' && (
                          <div className="relative">
                            <button onClick={() => setResendMenuId(resendMenuId === b.id ? null : b.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Resend confirmation">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                            {resendMenuId === b.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                                <button onClick={() => handleResend(b.id, 'email')} className="w-full text-left px-3 py-1.5 text-sm text-[#1E2A4A] hover:bg-gray-50 transition-colors">Email</button>
                                <button onClick={() => handleResend(b.id, 'sms')} className="w-full text-left px-3 py-1.5 text-sm text-[#1E2A4A] hover:bg-gray-50 transition-colors">Text</button>
                              </div>
                            )}
                          </div>
                        )}
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#1E2A4A] hover:bg-gray-100 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {b.status === 'cancelled' ? (
                          <button onClick={() => { if (confirm(`Permanently delete this canceled booking for ${b.clients?.name || 'this client'}?`)) { fetch('/api/bookings/' + b.id + '?hard_delete=true', { method: 'DELETE' }).then(() => loadBookings()) } }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        ) : (
                          <button onClick={async () => { if (confirm(`Cancel booking for ${b.clients?.name || 'this client'}?`)) { const res = await fetch('/api/bookings/' + b.id, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); alert(`Failed to cancel: ${err.error || 'Unknown error'}`); } await loadBookings() } }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Cancel">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredBookings.length)} of {filteredBookings.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | string)[], p, i, arr) => {
                      if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`ellipsis-${i}`} className="px-1.5 text-gray-300 text-xs">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={
                            'min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ' +
                            (currentPage === p ? 'bg-[#1E2A4A] text-white' : 'text-gray-500 hover:bg-gray-100')
                          }
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#1E2A4A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No bookings found.</p>
            </div>
          ) : (
            <>
              {paginatedBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => openEdit(b)}
                  className={
                    'bg-white rounded-xl border border-gray-200/60 p-4 cursor-pointer transition-all active:scale-[0.99] ' +
                    (b.status === 'in_progress' ? 'border-amber-200 bg-amber-50/30 shadow-sm' :
                     b.status === 'cancelled' ? 'opacity-60' :
                     b.status === 'pending' ? 'border-red-200 bg-red-50/20' :
                     'hover:shadow-sm')
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={'font-semibold text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[#1E2A4A]')}>{b.clients?.name || '-'}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{b.clients?.address || ''}</p>
                    </div>
                    <span className={
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ' +
                      (b.status === 'pending' ? 'bg-red-100 text-red-700' :
                       b.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                       b.status === 'completed' ? 'bg-green-100 text-green-700' :
                       b.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                       'bg-blue-100 text-blue-700')
                    }>
                      {b.status === 'completed' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      {b.status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      {b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {formatDate(b.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{b.service_type}</span>
                      {b.cleaners?.name && <span className="text-gray-400">/ {b.cleaners.name}</span>}
                      {b.recurring_type && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{b.recurring_type}</span>}
                    </div>
                    <span className={'text-sm font-bold ' + (b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[#1E2A4A]')}>~${(b.price / 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-4">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 disabled:opacity-30 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </main>

      {showModal && editingBooking && (
        <SidePanel open={showModal} onClose={() => { setShowModal(false); setEditingBooking(null) }} title={editingBooking.clients?.name || 'Booking'} width="max-w-lg">
          <form onSubmit={handleSubmit}>
            {/* ── CLIENT HEADER ── */}
            {editingBooking.client_id && clients.find(c => c.id === editingBooking.client_id)?.do_not_service && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-3">
                <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
              </div>
            )}
            <div className="flex items-start justify-between mb-1">
              <div>
                {editingBooking.clients?.address && <p className="text-sm text-gray-600">{editingBooking.clients.address}</p>}
                {editingBooking.clients?.phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-[#1E2A4A]">{formatPhone(editingBooking.clients.phone)}</span>
                    <a href={`/admin/comhub?dial=${encodeURIComponent(editingBooking.clients.phone)}`} className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Call</a>
                    <a href={`sms:${editingBooking.clients.phone}`} className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-xs font-medium">Text</a>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none cursor-pointer ${
                  form.status === 'pending' ? 'bg-red-100 text-red-700' : form.status === 'scheduled' ? 'bg-green-100 text-green-700' : form.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : form.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Canceled</option>
                </select>
                {(editingBooking.recurring_type || editingBooking.schedule_id) && (
                  <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{editingBooking.recurring_type || 'Recurring'}</span>
                )}
                {(editingBooking.notes || '').includes('Client accepted terms') ? (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">✓ Terms accepted</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">Awaiting terms</span>
                )}
              </div>
            </div>
            {editingBooking.cleaner_token && (
              <button type="button" onClick={copyTeamLink} className="text-xs text-[#1E2A4A]/50 hover:text-[#1E2A4A] mb-2 block">{copied ? 'Copied!' : 'Copy team link'}</button>
            )}

            {/* ── JOB PROGRESS ── */}
            {(() => {
              const locations = [
                { label: 'Check-in', loc: editingBooking.check_in_location },
                { label: 'Check-out', loc: editingBooking.check_out_location }
              ].filter(l => l.loc && typeof l.loc === 'object' && 'distance_miles' in (l.loc as Record<string, unknown>))
              if (locations.length === 0) return null
              return (
                <div className="mb-3 space-y-1">
                  {locations.map(({ label, loc }) => {
                    const l = loc as Record<string, unknown>; const flagged = l.flagged as boolean; const dist = l.distance_miles as number
                    return <div key={label} className={`text-xs px-3 py-1.5 rounded-lg ${flagged ? 'bg-red-50 text-red-700 font-medium' : 'bg-green-50 text-green-700'}`}>{flagged ? '⚠️' : '✓'} {label}: {dist.toFixed(2)} mi</div>
                  })}
                </div>
              )
            })()}
            {editingBooking.status === 'scheduled' && !editingBooking.check_in_time && (
              <button type="button" onClick={async () => { setSaving(true); const now = new Date().toISOString(); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress', check_in_time: now, cleaner_id: form.cleaner_id || null, skip_email: true }) }); setEditingBooking({ ...editingBooking, status: 'in_progress', check_in_time: now }); setForm({ ...form, status: 'in_progress' }); loadBookings(); setSaving(false) }} className="w-full mb-3 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium">Check In (Admin)</button>
            )}
            {editingBooking.check_in_time && (
              <div className="mb-3 space-y-1.5">
                {editCheckInVal === null ? (
                  <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>Checked in: {toEST(editingBooking.check_in_time)}</span>
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditCheckInVal(toDateTimeLocalET(editingBooking.check_in_time!))} className="text-[10px] underline text-green-800">edit</button>
                      {!editingBooking.check_out_time && (
                        <button type="button" disabled={saving} onClick={async () => { if (!confirm('Undo check-in? Sends this job back to scheduled.')) return; setSaving(true); const res = await fetch('/api/bookings/' + editingBooking.id + '/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'check-in' }) }); if (res.ok) { setEditingBooking({ ...editingBooking, status: 'scheduled', check_in_time: null, check_in_location: null, fifteen_min_alert_time: null }); setForm({ ...form, status: 'scheduled' }); loadBookings() } else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to undo') } setSaving(false) }} className="text-[10px] underline text-red-600">undo</button>
                      )}
                    </span>
                  </p>
                ) : (
                  <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span>Check-in:</span>
                    <input type="datetime-local" value={editCheckInVal} onChange={(e) => setEditCheckInVal(e.target.value)} className="bg-white border border-green-200 rounded px-1 py-0.5 text-xs" />
                    <button type="button" disabled={saving} onClick={async () => { if (!editCheckInVal) return; setSaving(true); const iso = fromDateTimeLocalET(editCheckInVal); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check_in_time: iso, skip_email: true }) }); setEditingBooking({ ...editingBooking, check_in_time: iso }); setEditCheckInVal(null); loadBookings(); setSaving(false) }} className="px-2 py-0.5 bg-green-700 text-white rounded text-[10px]">Save</button>
                    <button type="button" onClick={() => setEditCheckInVal(null)} className="px-2 py-0.5 border border-green-300 rounded text-[10px]">Cancel</button>
                  </div>
                )}
                {editingBooking.fifteen_min_alert_time && <p className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">30-min warning: {toEST(editingBooking.fifteen_min_alert_time)}</p>}
                {editingBooking.check_out_time && (
                  editCheckOutVal === null ? (
                    <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                      <span>Checked out: {toEST(editingBooking.check_out_time)}{editingBooking.actual_hours ? ` (${editingBooking.actual_hours}hrs)` : ''}</span>
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => setEditCheckOutVal(toDateTimeLocalET(editingBooking.check_out_time!))} className="text-[10px] underline text-green-800">edit</button>
                        <button type="button" disabled={saving} onClick={async () => { if (!confirm('Undo check-out? Sends this job back to in-progress.')) return; setSaving(true); const res = await fetch('/api/bookings/' + editingBooking.id + '/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'check-out' }) }); if (res.ok) { setEditingBooking({ ...editingBooking, status: 'in_progress', check_out_time: null, check_out_location: null, actual_hours: null }); setForm({ ...form, status: 'in_progress', actual_hours: null }); loadBookings() } else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to undo') } setSaving(false) }} className="text-[10px] underline text-red-600">undo</button>
                      </span>
                    </p>
                  ) : (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2 flex-wrap">
                      <span>Check-out:</span>
                      <input type="datetime-local" value={editCheckOutVal} onChange={(e) => setEditCheckOutVal(e.target.value)} className="bg-white border border-green-200 rounded px-1 py-0.5 text-xs" />
                      <button type="button" disabled={saving} onClick={async () => { if (!editCheckOutVal) return; setSaving(true); const iso = fromDateTimeLocalET(editCheckOutVal); const ciIso = editingBooking.check_in_time!; const checkIn = new Date(ciIso.endsWith('Z') || ciIso.includes('+') ? ciIso : ciIso + 'Z'); const totalMin = (new Date(iso).getTime() - checkIn.getTime()) / 60000; const halfHrs = Math.floor(totalMin / 30); const rem = totalMin - halfHrs * 30; const actualHours = Math.max(0.5, rem >= 5 ? (halfHrs + 1) * 0.5 : halfHrs * 0.5); const cap = (editingBooking as any).max_hours; const billableHours = (typeof cap === 'number' && cap > 0) ? Math.min(actualHours, cap) : actualHours; const teamSize = Math.max(1, (editingBooking as any).team_size || 1); const clientRate = editingBooking.hourly_rate || 69; const updatedPrice = Math.round(billableHours * clientRate * teamSize * 100); const cleanerHourlyPay = clientRate <= 60 ? 25 : 30; const cleanerPay = Math.round(billableHours * cleanerHourlyPay * 100); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check_out_time: iso, actual_hours: actualHours, price: updatedPrice, cleaner_pay: cleanerPay, skip_email: true }) }); setEditingBooking({ ...editingBooking, check_out_time: iso, actual_hours: actualHours, price: updatedPrice, cleaner_pay: cleanerPay }); setForm({ ...form, actual_hours: actualHours, cleaner_pay: cleanerPay }); setEditCheckOutVal(null); loadBookings(); setSaving(false) }} className="px-2 py-0.5 bg-green-700 text-white rounded text-[10px]">Save</button>
                      <button type="button" onClick={() => setEditCheckOutVal(null)} className="px-2 py-0.5 border border-green-300 rounded text-[10px]">Cancel</button>
                    </div>
                  )
                )}
                {!editingBooking.check_out_time && (
                  <div className="flex gap-2">
                    {!editingBooking.fifteen_min_alert_time && (
                      <button type="button" onClick={async () => { setSaving(true); try { await fetch('/api/team/30min-alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: editingBooking.id }) }); setEditingBooking({ ...editingBooking, fifteen_min_alert_time: new Date().toISOString() }) } catch {} setSaving(false) }} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold">30-Min Alert</button>
                    )}
                    {!confirmCheckout ? (
                      <button type="button" onClick={() => setConfirmCheckout(true)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium">Check Out</button>
                    ) : (
                      <div className="flex-1 flex gap-1.5">
                        <button type="button" onClick={() => setConfirmCheckout(false)} className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs">Cancel</button>
                        <button type="button" onClick={async () => { setConfirmCheckout(false); setSaving(true); const now = new Date(); const ciStr = editingBooking.check_in_time!; const checkIn = new Date(ciStr.endsWith('Z') || ciStr.includes('+') ? ciStr : ciStr + 'Z'); const totalMin = (now.getTime() - checkIn.getTime()) / 60000; const halfHrs = Math.floor(totalMin / 30); const rem = totalMin - halfHrs * 30; const actualHours = Math.max(0.5, rem >= 5 ? (halfHrs + 1) * 0.5 : halfHrs * 0.5); const cap = (editingBooking as any).max_hours; const billableHours = (typeof cap === 'number' && cap > 0) ? Math.min(actualHours, cap) : actualHours; const teamSize = Math.max(1, (editingBooking as any).team_size || 1); const clientRate = editingBooking.hourly_rate || 69; const updatedPrice = Math.round(billableHours * clientRate * teamSize * 100); const cleanerHourlyPay = clientRate <= 60 ? 25 : 30; const cleanerPay = Math.round(billableHours * cleanerHourlyPay * 100); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', check_out_time: now.toISOString(), actual_hours: actualHours, price: updatedPrice, cleaner_pay: cleanerPay, cleaner_id: form.cleaner_id || null, skip_email: true }) }); setEditingBooking({ ...editingBooking, status: 'completed', check_out_time: now.toISOString(), actual_hours: actualHours, price: updatedPrice, cleaner_pay: cleanerPay }); setForm({ ...form, status: 'completed', actual_hours: actualHours, cleaner_pay: cleanerPay }); loadBookings(); setSaving(false) }} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirm Check Out</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {(editingBooking.walkthrough_video_url || editingBooking.final_video_url) && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {editingBooking.walkthrough_video_url && <div><p className="text-[10px] text-gray-400 mb-0.5">Before</p><video src={editingBooking.walkthrough_video_url} controls className="w-full rounded-lg max-h-[120px]" preload="metadata" /></div>}
                {editingBooking.final_video_url && <div><p className="text-[10px] text-gray-400 mb-0.5">After</p><video src={editingBooking.final_video_url} controls className="w-full rounded-lg max-h-[120px]" preload="metadata" /></div>}
              </div>
            )}

            {/* ── BOOKING DETAILS (compact) ── */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Time</label>
                  <input type="time" min="08:00" max="16:00" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Hours</label>
                  <select value={form.hours} onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white">
                    {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Rate</label>
                  <div className="flex gap-1">
                    <select
                      value={[59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate) ? form.hourly_rate : 'custom'}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === 'custom') {
                          const isPreset = [59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate)
                          setForm({ ...form, hourly_rate: isPreset ? 0 : form.hourly_rate })
                        } else setForm({ ...form, hourly_rate: parseInt(v) })
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white"
                    >
                      <option value={59}>$59</option>
                      <option value={69}>$69</option>
                      <option value={89}>$89</option>
                      <option value={99}>$99</option>
                      <option value={79}>$79 (Legacy)</option>
                      <option value={49}>$49 (Legacy)</option>
                      <option value={65}>$65 (Legacy)</option>
                      <option value={75}>$75 (Legacy)</option>
                      <option value={100}>$100 (Legacy)</option>
                      <option value="custom">Custom</option>
                    </select>
                    {![59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate) && (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.hourly_rate}
                        onChange={(e) => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white"
                        placeholder="$"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Service</label>
                  <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white">
                    {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
                    <span className="text-sm text-[#1E2A4A]">Discount</span>
                    <div onClick={() => setForm({ ...form, discount_enabled: !form.discount_enabled })} className={`w-9 h-5 rounded-full transition-colors ${form.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${form.discount_enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </div>
                  </div>
                </div>
              </div>
              {form.discount_enabled && (
                <div className="flex gap-1 items-center">
                  <label className="text-[10px] text-gray-400 uppercase w-14">Percent</label>
                  <select
                    value={[5, 10, 20].includes(form.discount_percent) ? form.discount_percent : 'custom'}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'custom') {
                        const isPreset = [5, 10, 20].includes(form.discount_percent)
                        setForm({ ...form, discount_percent: isPreset ? 15 : form.discount_percent })
                      } else setForm({ ...form, discount_percent: parseInt(v) })
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white"
                  >
                    <option value={20}>20% ($69 weekly)</option>
                    <option value={10}>10% ($69 biweekly/monthly &middot; $59 weekly)</option>
                    <option value={5}>5% ($59 biweekly/monthly)</option>
                    <option value="custom">Custom</option>
                  </select>
                  {![5, 10, 20].includes(form.discount_percent) && (
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={form.discount_percent}
                      onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })}
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A] bg-white"
                      placeholder="%"
                    />
                  )}
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                <span className="text-gray-500">~{getEstimatedHoursRange(form.hours)}hrs × ${form.hourly_rate}{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}{form.discount_enabled && form.discount_percent > 0 ? ` − ${form.discount_percent}%` : ''}</span>
                <span className="font-semibold text-[#1E2A4A]">~${(calculateEditPrice() / 100).toFixed(0)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <RecurringOptions startDate={form.start_date} enabled={form.repeat_enabled} onEnabledChange={(v) => setForm({ ...form, repeat_enabled: v })} repeatType={form.repeat_type} onRepeatTypeChange={(v) => setForm({ ...form, repeat_type: v })} repeatEnd={form.repeat_end} onRepeatEndChange={(v) => setForm({ ...form, repeat_end: v })} repeatEndCount={form.repeat_end_count} onRepeatEndCountChange={(v) => setForm({ ...form, repeat_end_count: v })} repeatEndDate={form.repeat_end_date} onRepeatEndDateChange={(v) => setForm({ ...form, repeat_end_date: v })} customInterval={form.custom_interval} onCustomIntervalChange={(v) => setForm({ ...form, custom_interval: v })} previewDates={!(editingBooking?.recurring_type || editingBooking?.schedule_id) ? editRecurringDates : []} />
              </div>
            </div>

            {/* ── ACTUAL LABOR (completed only) ── */}
            {(form.status === 'completed' || form.actual_hours) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Hours</label>
                    <input type="number" step="0.5" min="0" value={form.actual_hours ?? ''} onChange={(e) => { const hrs = e.target.value ? parseFloat(e.target.value) : null; const cr = cleaners.find(c => c.id === form.cleaner_id)?.hourly_rate || 25; setForm({ ...form, actual_hours: hrs, cleaner_pay: hrs ? Math.round(hrs * cr * 100) : null }) }} placeholder="—" className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm text-[#1E2A4A] bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Team Pay</label>
                    <input type="number" step="0.01" min="0" value={form.cleaner_pay != null ? (form.cleaner_pay / 100).toFixed(2) : ''} onChange={(e) => setForm({ ...form, cleaner_pay: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} placeholder="auto" className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm text-[#1E2A4A] bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Team Paid</label>
                    <select value={form.cleaner_paid ? 'paid' : 'not_paid'} onChange={(e) => setForm({ ...form, cleaner_paid: e.target.value === 'paid' })} className={'w-full px-2 py-1.5 border rounded-lg text-sm ' + (form.cleaner_paid ? 'border-green-300 text-green-700 bg-green-50' : 'border-green-300 text-[#1E2A4A] bg-white')}>
                      <option value="not_paid">No</option><option value="paid">Yes</option>
                    </select>
                  </div>
                </div>
                {form.actual_hours && <p className="text-xs text-green-700 mt-1 text-right font-medium">{form.actual_hours}hrs × ${form.hourly_rate} = ${(form.actual_hours * form.hourly_rate).toFixed(0)}</p>}
              </div>
            )}

            {/* ── PAYMENT ── */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase">Payment</label>
                <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]">
                  <option value="pending">Pending</option><option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 uppercase">Method</label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[#1E2A4A]">
                  <option value="">—</option><option value="zelle">Zelle</option><option value="apple_pay">Apple Pay</option>
                </select>
              </div>
            </div>

            {/* ── CLEANER / TEAM ── */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] text-gray-400 uppercase">{form.team_size > 1 ? worker.plural : worker.singular}</label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500">Team size</label>
                  <select
                    value={form.team_size}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10) || 1
                      const maxExtras = Math.max(0, n - 1)
                      setForm({ ...form, team_size: n, extra_cleaner_ids: form.extra_cleaner_ids.slice(0, maxExtras) })
                    }}
                    className="px-2 py-0.5 border border-gray-300 rounded text-xs text-[#1E2A4A] bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {form.team_size > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ranked = Object.values(smartScores)
                          .filter(s => s.available)
                          .sort((a, b) => b.score - a.score)
                          .slice(0, form.team_size)
                        if (ranked.length === 0) return
                        const lead = ranked[0]?.id || ''
                        const extras = ranked.slice(1).map(r => r.id)
                        setForm({ ...form, cleaner_id: lead, extra_cleaner_ids: extras })
                      }}
                      className="text-[10px] px-2 py-0.5 bg-[#A8F0DC] text-[#1E2A4A] rounded font-semibold hover:bg-[#90E5CC]"
                    >
                      Auto-pick top {form.team_size}
                    </button>
                  )}
                </div>
              </div>
              {editingBooking.suggested_cleaner_id && !editingBooking.cleaner_id && form.team_size <= 1 && (() => {
                const suggested = cleaners.find(c => c.id === editingBooking.suggested_cleaner_id)
                return suggested ? (
                  <button type="button" onClick={() => setForm({ ...form, cleaner_id: suggested.id })} className="w-full mb-1.5 px-3 py-2 rounded-lg border-2 border-green-400 bg-green-50 text-left text-sm hover:bg-green-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800">Suggested: {suggested.name}</span>
                      <span className="text-[10px] text-green-600 font-medium">Tap to assign</span>
                    </div>
                    {editingBooking.suggested_reason && <p className="text-[10px] text-green-600 mt-0.5">{editingBooking.suggested_reason}</p>}
                  </button>
                ) : null
              })()}
              {suggestions.length > 0 && (
                <SuggestionStrip
                  suggestions={suggestions}
                  variant={Object.values(smartScores).filter(s => s.available).length === 0 ? 'full' : 'better'}
                  onPick={(t) => setForm({ ...form, start_time: t })}
                />
              )}
              {Object.keys(smartScores).length > 0 && (
                <p className="text-[10px] text-gray-500 mb-1">
                  Ranked by zone match, proximity, and schedule fit
                  {form.team_size > 1 && <> · click to add. Drag to reorder — top = LEAD.</>}
                </p>
              )}
              {/* Team order with drag-to-reorder. Top = lead. */}
              {form.team_size > 1 && (form.cleaner_id || form.extra_cleaner_ids.length > 0) && (
                <div className="mb-2 p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                  <p className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wide mb-1.5">Team order — drag to reorder</p>
                  <div className="space-y-1">
                    {[form.cleaner_id, ...form.extra_cleaner_ids].filter(Boolean).map((cid, idx, arr) => {
                      const c = cleaners.find(x => x.id === cid)
                      return (
                        <div
                          key={cid}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)) }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                            if (Number.isNaN(fromIdx) || fromIdx === idx) return
                            const next = [...arr]
                            const [moved] = next.splice(fromIdx, 1)
                            next.splice(idx, 0, moved)
                            setForm({ ...form, cleaner_id: next[0] || '', extra_cleaner_ids: next.slice(1) })
                          }}
                          className="flex items-center justify-between bg-white border border-indigo-200 rounded-md px-2.5 py-1.5 text-sm cursor-move hover:border-indigo-400"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400 text-base leading-none">⋮⋮</span>
                            <span className="font-medium text-[#1E2A4A]">{c?.name || cid}</span>
                            {idx === 0 && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                            {idx > 0 && <span className="text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = arr.filter((_, i) => i !== idx)
                              setForm({ ...form, cleaner_id: next[0] || '', extra_cleaner_ids: next.slice(1) })
                            }}
                            className="text-xs text-gray-400 hover:text-red-600"
                            title="Remove from team"
                          >✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {form.team_size <= 1 && (
                  <button type="button" onClick={() => setForm({ ...form, cleaner_id: '' })} className={`w-full flex items-center px-3 py-1.5 rounded-lg border text-sm ${!form.cleaner_id ? 'border-indigo-500 bg-indigo-50 font-medium' : 'border-gray-200 hover:border-gray-300'} text-[#1E2A4A]`}>Unassigned</button>
                )}
                {cleaners
                  .filter(c => c.active !== false)
                  .slice()
                  .sort((a, b) => {
                    const sa = smartScores[a.id]
                    const sb = smartScores[b.id]
                    if (sa && sb) {
                      if (sa.available && !sb.available) return -1
                      if (!sa.available && sb.available) return 1
                      return sb.score - sa.score
                    }
                    if (sa) return -1
                    if (sb) return 1
                    return a.name.localeCompare(b.name)
                  })
                  .map((c) => {
                  const avail = getCleanerAvailability(c, form.start_date, form.start_time, form.hours)
                  const isLead = form.cleaner_id === c.id
                  const isExtra = form.extra_cleaner_ids.includes(c.id)
                  const selected = isLead || isExtra
                  const isSuggested = c.id === editingBooking.suggested_cleaner_id
                  const smart = smartScores[c.id]
                  const isZoneMatch = !!smart?.zone_match
                  const topPick = smart && smart.available && Object.values(smartScores).filter(s => s.available).sort((x, y) => y.score - x.score)[0]?.id === c.id
                  const onClickPick = () => {
                    if (form.team_size <= 1) {
                      setForm({ ...form, cleaner_id: c.id, extra_cleaner_ids: [] })
                      return
                    }
                    if (isLead) {
                      const [newLead, ...rest] = form.extra_cleaner_ids
                      setForm({ ...form, cleaner_id: newLead || '', extra_cleaner_ids: rest })
                    } else if (isExtra) {
                      setForm({ ...form, extra_cleaner_ids: form.extra_cleaner_ids.filter(x => x !== c.id) })
                    } else if (!form.cleaner_id) {
                      setForm({ ...form, cleaner_id: c.id })
                    } else if (form.extra_cleaner_ids.length < form.team_size - 1) {
                      setForm({ ...form, extra_cleaner_ids: [...form.extra_cleaner_ids, c.id] })
                    }
                  }
                  return (
                    <button key={c.id} type="button" onClick={onClickPick} className={`w-full text-left px-3 py-1.5 rounded-lg border text-sm ${
                      isLead
                        ? 'border-indigo-500 bg-indigo-50'
                        : isExtra
                          ? 'border-indigo-500 bg-indigo-50'
                          : topPick
                            ? 'border-green-400 bg-green-50'
                            : isSuggested || isZoneMatch
                              ? 'border-green-300 bg-green-50/50'
                              : avail.available
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'border-gray-200 text-gray-400'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={selected ? 'font-medium text-[#1E2A4A]' : ''}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '9999px', background: colorForMember(memberColors, c.id), marginRight: '6px', verticalAlign: 'middle' }} />{(topPick || isSuggested) && !selected ? '★ ' : ''}{c.name}
                          {isLead && form.team_size > 1 && <span className="ml-1.5 text-[9px] bg-indigo-600 text-white px-1 py-0.5 rounded font-semibold">LEAD</span>}
                          {isExtra && <span className="ml-1.5 text-[9px] bg-indigo-400 text-white px-1 py-0.5 rounded font-semibold">EXTRA</span>}
                          {smart?.is_preferred && <span className="ml-1.5 text-[9px] bg-amber-500 text-white px-1 py-0.5 rounded font-semibold">★ PREFERRED</span>}
                          {isZoneMatch && <span className="ml-1.5 text-[9px] text-green-700 bg-green-100 px-1 py-0.5 rounded font-medium">zone</span>}
                          {smart?.has_car === false && <span className="ml-1 text-[9px] text-gray-500">no car</span>}
                        </span>
                        {form.start_date && (avail.available ? <span className="text-[10px] text-green-600 font-medium">{smart?.reason || 'Available'}</span> : <span className="text-[10px] text-red-500">{avail.reason}</span>)}
                      </div>
                      {smart?.available && (smart.distance_miles != null || smart.travel_from_prev_min != null || smart.travel_to_next_min != null || smart.travel_to_home_min != null || smart.can_make_home === false) && (
                        <div className="mt-0.5 text-[9px] text-gray-500 flex flex-wrap gap-x-2">
                          {smart.distance_miles != null && <span>📍 {smart.distance_miles} mi</span>}
                          {smart.travel_from_prev_min != null && <span>🚗 {smart.travel_from_prev_min} min from {smart.prev_job_label || 'prev'}</span>}
                          {smart.travel_to_next_min != null && <span>➡️ {smart.travel_to_next_min} min to {smart.next_job_label || 'next'}</span>}
                          {smart.travel_to_home_min != null && <span>🏠 {smart.travel_to_home_min} min to home</span>}
                          {smart.can_make_home === false && <span className="text-amber-600">won&apos;t make home on time</span>}
                        </div>
                      )}
                      {form.start_date && avail.dayBookings && avail.dayBookings.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">{avail.dayBookings.map((b, i) => <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{b.time} {b.client} ({b.hours}hr)</span>)}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── NOTES ── */}
            <div className="mt-3 mb-3">
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Notes</label>
              {editingBooking.notes && <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-2 italic">{editingBooking.notes}</p>}
              <BookingNotes bookingId={editingBooking.id} mode="admin" authorName="Admin" />
            </div>

            {/* ── ACTIONS ── */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              {(editingBooking.recurring_type || editingBooking.schedule_id) ? (
                <div className="relative">
                  <button type="button" onClick={() => setShowCancelMenu(!showCancelMenu)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">Cancel ▾</button>
                  {showCancelMenu && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                      <button type="button" onClick={() => { setShowCancelMenu(false); handleCancel('single') }} className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm">This booking</button>
                      <button type="button" onClick={() => { setShowCancelMenu(false); handleCancel('all') }} className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm">All future</button>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => handleCancel('single')} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">Cancel</button>
              )}
              <div className="flex-1" />
              <button type="button" onClick={() => { setShowModal(false); setEditingBooking(null) }} className="px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm">Close</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium">{saving ? '...' : 'Save'}</button>
            </div>
          </form>
        </SidePanel>
      )}

      {showUpdateChoice && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 flex items-center justify-center z-[10001]" onClick={() => setShowUpdateChoice(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1E2A4A] mb-4">Update Recurring Booking</h3>
            <p className="text-gray-600 mb-6">Apply changes to:</p>
            <div className="space-y-3">
              <button onClick={() => saveBooking('single')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[#1E2A4A] hover:bg-gray-50 text-left">
                <p className="font-medium">This booking only</p>
                <p className="text-sm text-gray-500">Only update this appointment</p>
              </button>
              <button onClick={() => saveBooking('all')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[#1E2A4A] hover:bg-gray-50 text-left">
                <p className="font-medium">All future bookings</p>
                <p className="text-sm text-gray-500">Update this and all upcoming appointments</p>
              </button>
            </div>
            <button onClick={() => setShowUpdateChoice(false)} className="w-full mt-4 py-2 text-gray-500 hover:text-[#1E2A4A]">Cancel</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <SidePanel open={showCreateModal} onClose={() => { setShowCreateModal(false); setShowClientDropdown(false) }} title="Create Booking" width="max-w-lg">
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Client *</label>
                  <input
                    type="text"
                    required={!createForm.client_id}
                    value={clientSearch}
                    onChange={(e) => handleClientSearchChange(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search by name or phone..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  />
                  
                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <button type="button" onClick={handleNewClientClick} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-200 font-medium text-[#1E2A4A]">+ New Client</button>
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button key={client.id} type="button" onClick={() => handleClientSelect(client)} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <div className="font-medium text-[#1E2A4A]">{client.name}</div>
                            <div className="text-sm text-gray-500">{formatPhone(client.phone)}</div>
                          </button>
                        ))
                      ) : clientSearch ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">No clients found</div>
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">Start typing to search...</div>
                      )}
                    </div>
                  )}
                </div>

                {createForm.client_id && clients.find(c => c.id === createForm.client_id)?.do_not_service && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                    <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
                    <p className="text-red-600 text-sm">This client is flagged as Do Not Service. Check client notes before proceeding.</p>
                  </div>
                )}
                {createForm.client_id && clientProperties.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Address{clientProperties.length > 1 ? ' *' : ''}</label>
                    <select
                      value={createForm.property_id}
                      onChange={(e) => setCreateForm({ ...createForm, property_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                    >
                      {clientProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}{p.is_primary ? ' (primary)' : ''}</option>
                      ))}
                    </select>
                    {clientProperties.length > 1 && (
                      <p className="mt-1 text-xs text-gray-500">This client has multiple addresses — pick the one being cleaned.</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Service</label>
                  <select value={createForm.service_type} onChange={(e) => {
                    const isEmergency = e.target.value === 'Emergency / Same-Day'
                    setCreateForm({ ...createForm, service_type: e.target.value, is_emergency: isEmergency, cleaner_id: isEmergency ? '' : createForm.cleaner_id })
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]">
                    {serviceTypes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Date *</label>
                    <input type="date" required value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Time *</label>
                    <input type="time" required min="08:00" max="16:00" value={createForm.start_time} onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" />
                  </div>
                </div>
                {createForm.is_emergency ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-3">🚨 Broadcasts to all team - first to claim gets it</p>
                    <label className="block text-sm font-medium text-red-700 mb-1">Team Pay Rate</label>
                    <div className="flex items-center">
                      <span className="text-[#1E2A4A] text-lg mr-1">$</span>
                      <input
                        type="number"
                        step="1"
                        min="25"
                        max="100"
                        value={createForm.cleaner_pay_rate}
                        onChange={(e) => setCreateForm({ ...createForm, cleaner_pay_rate: parseInt(e.target.value) || 40 })}
                        className="w-24 px-3 py-2 border border-red-300 rounded-lg text-[#1E2A4A] text-center font-mono bg-white"
                      />
                      <span className="text-[#1E2A4A] ml-1">/hr</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-[#1E2A4A]">{createForm.team_size > 1 ? worker.plural : worker.singular} *</label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Team size</label>
                        <select
                          value={createForm.team_size}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10) || 1
                            // Trim extras if shrinking team
                            const maxExtras = Math.max(0, n - 1)
                            setCreateForm({
                              ...createForm,
                              team_size: n,
                              extra_cleaner_ids: createForm.extra_cleaner_ids.slice(0, maxExtras),
                            })
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                        >
                          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        {createForm.team_size > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const ranked = Object.values(smartScores)
                                .filter(s => s.available)
                                .sort((a, b) => b.score - a.score)
                                .slice(0, createForm.team_size)
                              if (ranked.length === 0) return
                              const lead = ranked[0]?.id || ''
                              const extras = ranked.slice(1).map(r => r.id)
                              setCreateForm({ ...createForm, cleaner_id: lead, extra_cleaner_ids: extras })
                            }}
                            className="text-xs px-2 py-1 bg-[#A8F0DC] text-[#1E2A4A] rounded font-semibold hover:bg-[#90E5CC]"
                          >
                            Auto-pick top {createForm.team_size}
                          </button>
                        )}
                      </div>
                    </div>
                    {suggestions.length > 0 && (
                      <SuggestionStrip
                        suggestions={suggestions}
                        variant={Object.values(smartScores).filter(s => s.available).length === 0 ? 'full' : 'better'}
                        onPick={(t) => setCreateForm({ ...createForm, start_time: t })}
                      />
                    )}
                    {Object.keys(smartScores).length > 0 && (
                      <p className="text-[10px] text-gray-500 mb-1">
                        Ranked by zone match, proximity, and schedule fit
                        {createForm.team_size > 1 && <> · click to add. Drag to reorder — top of the team list is the LEAD (handles check-in / 30-min / check-out).</>}
                      </p>
                    )}
                    {/* Team order with drag-to-reorder. Top = lead. */}
                    {createForm.team_size > 1 && (createForm.cleaner_id || createForm.extra_cleaner_ids.length > 0) && (
                      <div className="mb-2 p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                        <p className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wide mb-1.5">Team order — drag to reorder</p>
                        <div className="space-y-1">
                          {[createForm.cleaner_id, ...createForm.extra_cleaner_ids].filter(Boolean).map((cid, idx, arr) => {
                            const c = cleaners.find(x => x.id === cid)
                            return (
                              <div
                                key={cid}
                                draggable
                                onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)) }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                                  if (Number.isNaN(fromIdx) || fromIdx === idx) return
                                  const next = [...arr]
                                  const [moved] = next.splice(fromIdx, 1)
                                  next.splice(idx, 0, moved)
                                  setCreateForm({ ...createForm, cleaner_id: next[0] || '', extra_cleaner_ids: next.slice(1) })
                                }}
                                className="flex items-center justify-between bg-white border border-indigo-200 rounded-md px-2.5 py-1.5 text-sm cursor-move hover:border-indigo-400"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-gray-400 text-base leading-none">⋮⋮</span>
                                  <span className="font-medium text-[#1E2A4A]">{c?.name || cid}</span>
                                  {idx === 0 && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                                  {idx > 0 && <span className="text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = arr.filter((_, i) => i !== idx)
                                    setCreateForm({ ...createForm, cleaner_id: next[0] || '', extra_cleaner_ids: next.slice(1) })
                                  }}
                                  className="text-xs text-gray-400 hover:text-red-600"
                                  title="Remove from team"
                                >✕</button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      {cleaners
                        .filter(c => c.active !== false)
                        .slice()
                        .sort((a, b) => {
                          const sa = smartScores[a.id]
                          const sb = smartScores[b.id]
                          if (sa && sb) {
                            if (sa.available && !sb.available) return -1
                            if (!sa.available && sb.available) return 1
                            return sb.score - sa.score
                          }
                          if (sa) return -1
                          if (sb) return 1
                          return a.name.localeCompare(b.name)
                        })
                        .map((c) => {
                        const avail = getCleanerAvailability(c, createForm.start_date, createForm.start_time, createForm.hours)
                        const isLead = createForm.cleaner_id === c.id
                        const isExtra = createForm.extra_cleaner_ids.includes(c.id)
                        const selected = isLead || isExtra
                        const smart = smartScores[c.id]
                        const isZoneMatch = !!smart?.zone_match
                        const topPick = smart && smart.available && Object.values(smartScores).filter(s => s.available).sort((x, y) => y.score - x.score)[0]?.id === c.id
                        const onClickPick = () => {
                          if (createForm.team_size <= 1) {
                            // Single-cleaner mode: just set lead.
                            setCreateForm({ ...createForm, cleaner_id: c.id, extra_cleaner_ids: [] })
                            return
                          }
                          // Team mode: cycle lead → extra → off.
                          if (isLead) {
                            // Promote first extra to lead, drop this one.
                            const [newLead, ...rest] = createForm.extra_cleaner_ids
                            setCreateForm({ ...createForm, cleaner_id: newLead || '', extra_cleaner_ids: rest })
                          } else if (isExtra) {
                            // Remove from extras.
                            setCreateForm({
                              ...createForm,
                              extra_cleaner_ids: createForm.extra_cleaner_ids.filter(x => x !== c.id),
                            })
                          } else if (!createForm.cleaner_id) {
                            // No lead yet — set as lead.
                            setCreateForm({ ...createForm, cleaner_id: c.id })
                          } else if (createForm.extra_cleaner_ids.length < createForm.team_size - 1) {
                            // Add as extra (capacity remains).
                            setCreateForm({
                              ...createForm,
                              extra_cleaner_ids: [...createForm.extra_cleaner_ids, c.id],
                            })
                          }
                        }
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={onClickPick}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                              isLead
                                ? 'border-indigo-500 bg-indigo-50 text-[#1E2A4A]'
                                : isExtra
                                  ? 'border-indigo-500 bg-indigo-50 text-[#1E2A4A]'
                                  : topPick
                                    ? 'border-green-400 bg-green-50 text-[#1E2A4A]'
                                    : isZoneMatch
                                      ? 'border-green-200 bg-green-50/40 text-[#1E2A4A]'
                                      : 'border-gray-200 hover:border-gray-300 text-[#1E2A4A]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={selected ? 'font-medium' : ''}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '9999px', background: colorForMember(memberColors, c.id), marginRight: '6px', verticalAlign: 'middle' }} />{topPick && !selected ? '★ ' : ''}{c.name}
                                {smart?.is_preferred && <span className="ml-1.5 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-semibold">★ PREFERRED</span>}
                                {isLead && createForm.team_size > 1 && <span className="ml-1.5 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                                {isExtra && <span className="ml-1.5 text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                                {isZoneMatch && <span className="ml-1.5 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-medium">zone</span>}
                                {smart?.has_car === false && <span className="ml-1 text-[10px] text-gray-500">no car</span>}
                              </span>
                              {createForm.start_date && (
                                avail.available
                                  ? <span className="text-xs text-green-600 font-medium">{smart?.reason || 'Available'}</span>
                                  : <span className="text-xs text-red-500">{avail.reason}</span>
                              )}
                            </div>
                            {smart?.available && (smart.distance_miles != null || smart.travel_from_prev_min != null || smart.travel_to_next_min != null || smart.travel_to_home_min != null || smart.can_make_home === false) && (
                              <div className="mt-0.5 text-[10px] text-gray-500 flex flex-wrap gap-x-2">
                                {smart.distance_miles != null && <span>📍 {smart.distance_miles} mi from home</span>}
                                {smart.travel_from_prev_min != null && <span>🚗 {smart.travel_from_prev_min} min from {smart.prev_job_label || 'prev job'}</span>}
                                {smart.travel_to_next_min != null && <span>➡️ {smart.travel_to_next_min} min to {smart.next_job_label || 'next job'}</span>}
                                {smart.travel_to_home_min != null && <span>🏠 {smart.travel_to_home_min} min to home</span>}
                                {smart.can_make_home === false && <span className="text-amber-600">won&apos;t make home on time</span>}
                              </div>
                            )}
                            {createForm.start_date && avail.dayBookings && avail.dayBookings.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {avail.dayBookings.map((b, i) => (
                                  <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                    {b.time} {b.client} ({b.hours}hr)
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Hours</label>
                    <select value={createForm.hours} onChange={(e) => setCreateForm({ ...createForm, hours: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]">
                      {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Rate</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={createForm.hourly_rate}
                      onChange={(e) => setCreateForm({ ...createForm, hourly_rate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                      placeholder="$/hr"
                    />
                  </div>
                </div>

                <RecurringOptions
                  startDate={createForm.start_date}
                  enabled={createForm.repeat_enabled}
                  onEnabledChange={(v) => setCreateForm({ ...createForm, repeat_enabled: v })}
                  repeatType={createForm.repeat_type}
                  onRepeatTypeChange={(v) => setCreateForm({ ...createForm, repeat_type: v })}
                  repeatEnd={createForm.repeat_end}
                  onRepeatEndChange={(v) => setCreateForm({ ...createForm, repeat_end: v })}
                  repeatEndCount={createForm.repeat_end_count}
                  onRepeatEndCountChange={(v) => setCreateForm({ ...createForm, repeat_end_count: v })}
                  repeatEndDate={createForm.repeat_end_date}
                  onRepeatEndDateChange={(v) => setCreateForm({ ...createForm, repeat_end_date: v })}
                  customInterval={createForm.custom_interval}
                  onCustomIntervalChange={(v) => setCreateForm({ ...createForm, custom_interval: v })}
                  previewDates={recurringDates}
                />

                <div className="py-3 border-t border-b border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-[#1E2A4A]">Recurring Discount</h4>
                    <div
                      onClick={() => setCreateForm({ ...createForm, discount_enabled: !createForm.discount_enabled })}
                      className={`w-10 h-6 rounded-full transition-colors ${createForm.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${createForm.discount_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                  {createForm.discount_enabled && (
                    <div className="flex gap-2 items-center pt-1">
                      <label className="text-xs text-gray-500 w-12">Percent:</label>
                      <select
                        value={[5, 10, 20].includes(createForm.discount_percent) ? createForm.discount_percent : 'custom'}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === 'custom') {
                            const isPreset = [5, 10, 20].includes(createForm.discount_percent)
                            setCreateForm({ ...createForm, discount_percent: isPreset ? 15 : createForm.discount_percent })
                          } else setCreateForm({ ...createForm, discount_percent: parseInt(v) })
                        }}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A]"
                      >
                        <option value={20}>20% ($69 weekly)</option>
                        <option value={10}>10% ($69 biweekly/monthly &middot; $59 weekly)</option>
                        <option value={5}>5% ($59 biweekly/monthly)</option>
                        <option value="custom">Custom %</option>
                      </select>
                      {![5, 10, 20].includes(createForm.discount_percent) && (
                        <input
                          type="number"
                          min="1"
                          max="50"
                          step="1"
                          value={createForm.discount_percent}
                          onChange={(e) => setCreateForm({ ...createForm, discount_percent: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A]"
                          placeholder="%"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">ESTIMATE{recurringDates.length > 1 ? ' (per visit)' : ''}</p>
                  <div className="flex justify-between">
                    <span>~{getEstimatedHoursRange(createForm.hours)}hrs × ${createForm.hourly_rate}/hr{createForm.team_size > 1 ? ` × ${createForm.team_size} cleaners` : ''}{createForm.discount_enabled && createForm.discount_percent > 0 ? ` − ${createForm.discount_percent}%` : ''}</span>
                    <span className="font-semibold">~${(calculatePrice() / 100).toFixed(0)}</span>
                  </div>
                  {recurringDates.length > 1 && <p className="text-xs text-gray-500 mt-1">Recurring schedule — billed per visit</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Status</label>
                  <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]">
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Canceled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Notes</label>
                  <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" rows={2} placeholder="Access codes..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setShowCreateModal(false); setShowClientDropdown(false) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]">Cancel</button>
                <button type="submit" disabled={saving || !createForm.client_id} className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-lg disabled:bg-gray-300">
                  {saving ? 'Creating...' : recurringDates.length > 1 ? 'Create Schedule' : 'Create'}
                </button>
              </div>
            </form>
        </SidePanel>
      )}

      {showNewClientModal && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 flex items-center justify-center z-[60]" onClick={() => setShowNewClientModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1E2A4A] mb-4">New Client</h3>
            <form onSubmit={handleNewClientSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]" placeholder="john@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" required value={newClientForm.phone} onChange={(e) => setNewClientForm({ ...newClientForm, phone: formatPhone(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]" placeholder="212-555-1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressAutocomplete value={newClientForm.address} onChange={(val) => setNewClientForm({ ...newClientForm, address: val })} placeholder="123 Main St, New York, NY 10001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Apt</label>
                <input type="text" value={newClientForm.unit} onChange={(e) => setNewClientForm({ ...newClientForm, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]" placeholder="Apt 4B" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                <select value={newClientForm.referrer_id} onChange={(e) => setNewClientForm({ ...newClientForm, referrer_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]">
                  <option value="">None</option>
                  {referrers.filter(ref => ref.active).map(ref => <option key={ref.id} value={ref.id}>{ref.name} ({ref.ref_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={newClientForm.notes} onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-[#1E2A4A]" rows={3} placeholder="Any special instructions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewClientModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-lg">{saving ? '...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
