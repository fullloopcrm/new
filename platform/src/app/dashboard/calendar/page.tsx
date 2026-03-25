'use client'

import { useEffect, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import SidePanel from '@/components/SidePanel'

interface Client { id: string; name: string; phone: string; address: string }
interface TeamMember { id: string; name: string }
interface TeamMemberAvail { id: string; name: string; available: boolean; conflict?: string; preferred?: boolean; history_count?: number; jobs_today?: number; tags?: string[]; score?: number; meets_requirements?: boolean; missing_skills?: string[] }
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
  team_member_id: string
  clients: Client | null
  team_members: TeamMember | null
  hourly_rate?: number
  recurring_type?: string | null
  schedule_id?: string | null
}

interface BookingEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor?: string
  extendedProps: { booking: Booking | null; teamMemberId?: string }
}

const TEAM_COLORS = [
  '#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316'
]

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 6
  const m = i % 2 === 0 ? '00' : '30'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
  return { value: `${String(h).padStart(2, '0')}:${m}`, label: `${hr}:${m} ${ampm}` }
})

type BusinessHours = Record<string, { enabled: boolean; start: string; end: string }>

const DEFAULT_HOURS: BusinessHours = {
  Monday: { enabled: true, start: '08:00', end: '18:00' },
  Tuesday: { enabled: true, start: '08:00', end: '18:00' },
  Wednesday: { enabled: true, start: '08:00', end: '18:00' },
  Thursday: { enabled: true, start: '08:00', end: '18:00' },
  Friday: { enabled: true, start: '08:00', end: '18:00' },
  Saturday: { enabled: false, start: '09:00', end: '14:00' },
  Sunday: { enabled: false, start: '09:00', end: '14:00' },
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<BookingEvent[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'scheduled', 'in_progress', 'completed'])
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null)

  // Inline settings
  const [showSettings, setShowSettings] = useState(false)
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.tenant?.business_hours) {
          try {
            const parsed = typeof data.tenant.business_hours === 'string'
              ? JSON.parse(data.tenant.business_hours)
              : data.tenant.business_hours
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setBusinessHours({ ...DEFAULT_HOURS, ...parsed })
            }
          } catch { /* keep defaults */ }
        }
        setSettingsLoaded(true)
      })
      .catch(() => setSettingsLoaded(true))
  }, [])

  async function saveBusinessHours(updated: BusinessHours) {
    setSettingsSaving(true)
    setSettingsMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_hours: JSON.stringify(updated) }),
      })
      if (res.ok) {
        setSettingsMsg('Saved!')
        setTimeout(() => setSettingsMsg(''), 2000)
      } else {
        setSettingsMsg('Failed to save')
      }
    } catch {
      setSettingsMsg('Network error')
    }
    setSettingsSaving(false)
  }

  function updateDay(day: string, field: 'enabled' | 'start' | 'end', value: unknown) {
    const updated = { ...businessHours, [day]: { ...businessHours[day], [field]: value } }
    setBusinessHours(updated)
    saveBusinessHours(updated)
  }

  const [panelBooking, setPanelBooking] = useState<Booking | null>(null)
  const [panelMembers, setPanelMembers] = useState<TeamMemberAvail[]>([])
  const [panelMemberId, setPanelMemberId] = useState<string>('')
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelWarning, setPanelWarning] = useState<string>('')
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [noQualifiedMatch, setNoQualifiedMatch] = useState(false)
  const [clientRequirements, setClientRequirements] = useState<string[]>([])

  useEffect(() => { loadTeam() }, [])
  useEffect(() => { if (dateRange) loadBookings(dateRange.from, dateRange.to) }, [dateRange])
  useEffect(() => { filterBookings() }, [allBookings, selectedMember, selectedStatuses, memberColors])

  const loadBookings = async (from: string, to: string) => {
    const res = await fetch(`/api/bookings?from=${from}&to=${to}`)
    if (res.ok) {
      const data = await res.json()
      setAllBookings(Array.isArray(data) ? data : data.bookings || [])
    }
  }

  const loadTeam = async () => {
    const res = await fetch('/api/team')
    if (res.ok) {
      const data = await res.json()
      const members = Array.isArray(data) ? data : data.team_members || []
      setTeamMembers(members)
      const colors: Record<string, string> = {}
      members.forEach((m: TeamMember, i: number) => { colors[m.id] = TEAM_COLORS[i % TEAM_COLORS.length] })
      setMemberColors(colors)
    }
  }

  const filterBookings = useCallback(() => {
    let filtered = [...allBookings]
    if (selectedMember) filtered = filtered.filter(b => b.team_member_id === selectedMember)
    if (selectedStatuses.length > 0) filtered = filtered.filter(b => selectedStatuses.includes(b.status))

    const events: BookingEvent[] = filtered.map((b) => {
      const prefix = b.status === 'pending' ? '\u23F3 ' : b.status === 'in_progress' ? '\u25B6\uFE0F ' : ''
      const bg = b.status === 'pending' ? '#dc2626' : memberColors[b.team_member_id] || '#0d9488'
      const clientName = (b.clients?.name || 'Client').split(' ')[0]
      const [, timePart] = b.start_time.split('T')
      const [h, m] = (timePart || '00:00').split(':').map(Number)
      const ampm = h >= 12 ? 'p' : 'a'
      const hr = h % 12 || 12
      const timeStr = m > 0 ? `${hr}:${String(m).padStart(2, '0')}${ampm}` : `${hr}${ampm}`
      return {
        id: b.id,
        title: `${timeStr} ${prefix}${clientName}`,
        start: b.start_time,
        end: b.end_time,
        backgroundColor: bg,
        borderColor: bg,
        extendedProps: { booking: b, teamMemberId: b.team_member_id }
      }
    })
    setBookings(events)
  }, [allBookings, selectedMember, selectedStatuses, memberColors])

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])
  }

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  }

  const formatNaiveTime = (timeStr: string) => {
    const [, t] = timeStr.split('T')
    const [h, m] = (t || '00:00').split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
  }

  const formatNaiveDate = (timeStr: string) => {
    const [datePart] = timeStr.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleDatesSet = (info: { startStr: string; endStr: string }) => {
    const from = info.startStr.split('T')[0]
    const to = info.endStr.split('T')[0]
    setDateRange({ from, to })
  }

  const openPanel = async (booking: Booking) => {
    setPanelBooking(booking)
    setPanelMemberId(booking.team_member_id || '')
    setPanelWarning('')
    setPanelSaving(false)

    const date = booking.start_time.split('T')[0]
    const [, t] = booking.start_time.split('T')
    const startTime = (t || '09:00').slice(0, 5)
    const [sh, sm] = startTime.split(':').map(Number)
    const [, et] = booking.end_time.split('T')
    const [eh, em] = (et || '11:00').split(':').map(Number)
    const duration = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2

    setLoadingAvail(true)
    try {
      const clientParam = booking.client_id ? `&client_id=${booking.client_id}` : ''
      const res = await fetch(`/api/team-availability?date=${date}&start_time=${startTime}&duration=${duration}&exclude_booking=${booking.id}${clientParam}`)
      if (res.ok) {
        const data = await res.json()
        setPanelMembers(data.members || data.team_members || [])
        setNoQualifiedMatch(data.no_qualified_match || false)
        setClientRequirements(data.client_requirements || [])
        // Auto-select preferred member if available and no one assigned yet
        if (!booking.team_member_id && data.preferred_member_id) {
          const preferred = (data.members || []).find((m: TeamMemberAvail) => m.id === data.preferred_member_id && m.available)
          if (preferred) setPanelMemberId(preferred.id)
        }
      }
    } catch { /* fallback */ }
    setLoadingAvail(false)
  }

  const closePanel = () => {
    setPanelBooking(null)
    setPanelMembers([])
    setPanelWarning('')
  }

  const checkPostSaveConflicts = (bookingId: string, memberId: string, startTime: string, endTime: string) => {
    const date = startTime.split('T')[0]
    const [, st] = startTime.split('T')
    const [sh, sm] = (st || '00:00').split(':').map(Number)
    const startMin = sh * 60 + sm
    const [, et] = endTime.split('T')
    const [eh, em] = (et || '00:00').split(':').map(Number)
    const endMin = eh * 60 + em

    const overlaps = allBookings.filter(b => {
      if (b.id === bookingId || b.team_member_id !== memberId || b.status === 'cancelled') return false
      if (!b.start_time.startsWith(date)) return false
      const [, bst] = b.start_time.split('T')
      const [bsh, bsm] = (bst || '00:00').split(':').map(Number)
      const bStart = bsh * 60 + bsm
      const [, bet] = b.end_time.split('T')
      const [beh, bem] = (bet || '00:00').split(':').map(Number)
      const bEnd = beh * 60 + bem
      return startMin < bEnd && endMin > bStart
    })

    if (overlaps.length > 0) {
      const names = overlaps.map(b => b.clients?.name || 'another client').join(', ')
      const memberName = teamMembers.find(m => m.id === memberId)?.name || 'This team member'
      return `${memberName} has overlapping bookings: ${names}`
    }
    return ''
  }

  const handleConfirm = async () => {
    if (!panelBooking) return
    setPanelSaving(true)
    setPanelWarning('')
    const updates: Record<string, unknown> = { status: 'scheduled' }
    if (panelMemberId) updates.team_member_id = panelMemberId
    const res = await fetch(`/api/bookings/${panelBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (res.ok) {
      const warning = panelMemberId ? checkPostSaveConflicts(panelBooking.id, panelMemberId, panelBooking.start_time, panelBooking.end_time) : ''
      if (warning) setPanelWarning(warning)
      else closePanel()
      if (dateRange) loadBookings(dateRange.from, dateRange.to)
    } else if (res.status === 409) {
      const data = await res.json()
      setPanelWarning(data.error || 'Team member is unavailable on this date')
    } else {
      setPanelWarning('Failed to confirm booking')
    }
    setPanelSaving(false)
  }

  const handleAssign = async () => {
    if (!panelBooking || !panelMemberId) return
    setPanelSaving(true)
    setPanelWarning('')
    const res = await fetch(`/api/bookings/${panelBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_member_id: panelMemberId })
    })
    if (res.ok) {
      const warning = checkPostSaveConflicts(panelBooking.id, panelMemberId, panelBooking.start_time, panelBooking.end_time)
      if (warning) setPanelWarning(warning)
      else closePanel()
      if (dateRange) loadBookings(dateRange.from, dateRange.to)
    } else if (res.status === 409) {
      const data = await res.json()
      setPanelWarning(data.error || 'Team member is unavailable on this date')
    } else {
      setPanelWarning('Failed to assign team member')
    }
    setPanelSaving(false)
  }

  const handleDecline = async () => {
    if (!panelBooking || !confirm('Cancel this booking?')) return
    setPanelSaving(true)
    await fetch(`/api/bookings/${panelBooking.id}`, { method: 'DELETE' })
    closePanel()
    if (dateRange) loadBookings(dateRange.from, dateRange.to)
    setPanelSaving(false)
  }

  const handleEventClick = (info: { event: { id: string } }) => {
    const booking = allBookings.find(b => b.id === info.event.id)
    if (booking) openPanel(booking)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventDrop = async (info: any) => {
    const booking = info.event.extendedProps.booking
    const newStart = toLocalISOString(info.event.start)
    const newEnd = toLocalISOString(info.event.end)
    const clientName = booking.clients?.name || 'this client'
    const newDateLabel = info.event.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    if (!confirm(`Move ${clientName} to ${newDateLabel}?`)) { info.revert(); return }
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: newStart, end_time: newEnd })
    })
    if (res.ok) { if (dateRange) loadBookings(dateRange.from, dateRange.to) }
    else { info.revert() }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventResize = async (info: any) => {
    const booking = info.event.extendedProps.booking
    const newStart = toLocalISOString(info.event.start)
    const newEnd = toLocalISOString(info.event.end)
    const hours = Math.round((info.event.end.getTime() - info.event.start.getTime()) / (1000 * 60 * 60))
    const clientName = booking.clients?.name || 'this client'
    if (!confirm(`Resize ${clientName} to ${hours} hours?`)) { info.revert(); return }
    const hourlyRate = booking.hourly_rate || 75
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: newStart, end_time: newEnd, price: hours * hourlyRate * 100 })
    })
    if (res.ok) { if (dateRange) loadBookings(dateRange.from, dateRange.to) }
    else { info.revert() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Calendar</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
          title="Calendar Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Inline Business Hours Settings */}
      {showSettings && settingsLoaded && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Business Hours</h3>
            <div className="flex items-center gap-3">
              {settingsMsg && <span className={`text-xs ${settingsMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{settingsMsg}</span>}
              {settingsSaving && <span className="text-xs text-gray-500">Saving...</span>}
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const dh = businessHours[day] || DEFAULT_HOURS[day]
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-24 flex items-center gap-2">
                      <button
                        onClick={() => updateDay(day, 'enabled', !dh.enabled)}
                        className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${dh.enabled ? 'bg-teal-600' : 'bg-slate-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${dh.enabled ? 'translate-x-4' : ''}`} />
                      </button>
                      <span className={`text-sm ${dh.enabled ? 'text-white' : 'text-slate-500'}`}>{day.slice(0, 3)}</span>
                    </div>
                    {dh.enabled ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={dh.start}
                          onChange={(e) => updateDay(day, 'start', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <span className="text-slate-500 text-sm">to</span>
                        <select
                          value={dh.end}
                          onChange={(e) => updateDay(day, 'end', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-center px-3 py-2">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Team Member</label>
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-600">
            <option value="">All Team</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              { key: 'pending', label: 'Pending', cls: 'text-red-700 font-medium' },
              { key: 'scheduled', label: 'Scheduled', cls: 'text-slate-700' },
              { key: 'in_progress', label: 'In Progress', cls: 'text-teal-700 font-medium' },
              { key: 'completed', label: 'Completed', cls: 'text-slate-700' },
              { key: 'cancelled', label: 'Cancelled', cls: 'text-slate-700' },
            ].map(s => (
              <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedStatuses.includes(s.key)} onChange={() => toggleStatus(s.key)} className="w-3.5 h-3.5 accent-teal-600" />
                <span className={`text-sm ${s.cls}`}>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full md:w-auto md:ml-auto">
          <label className="block text-xs font-medium text-slate-500 mb-1">Team Colors</label>
          <div className="flex gap-2 flex-wrap">
            {teamMembers.map(m => (
              <div key={m.id} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: memberColors[m.id] }} />
                <span className="text-xs text-slate-600">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Calendar */}
      <div className="hidden md:block">
        <style>{`
          .fc .fc-icon-chevron-left::before { content: '\\2039' !important; }
          .fc .fc-icon-chevron-right::before { content: '\\203A' !important; }
          .fc-daygrid-day-number { font-size: 12px !important; font-weight: 600 !important; padding: 2px 4px !important; color: #666 !important; }
          .fc-daygrid-day-events { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1px !important; padding: 0 2px !important; }
          .fc-daygrid-event-harness { margin-top: 0 !important; margin-bottom: 0 !important; min-width: 0 !important; }
          .fc-daygrid-event { font-size: 9px !important; line-height: 1.2 !important; padding: 1px 2px !important; border-radius: 3px !important; overflow: hidden !important; margin: 0 !important; }
          .fc-daygrid-event .fc-event-main { padding: 0 !important; overflow: hidden !important; white-space: nowrap !important; text-overflow: ellipsis !important; }
          .fc-daygrid-event .fc-event-title { font-size: 9px !important; font-weight: 500 !important; }
          .fc-daygrid-event .fc-event-time { display: none !important; }
          .fc-daygrid-more-link { font-size: 9px !important; grid-column: 1 / -1 !important; }
        `}</style>
        <div className="border border-slate-200 rounded-lg p-2 bg-white">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={bookings}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            editable={true}
            selectable={true}
            selectMirror={true}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            height="calc(100vh - 200px)"
            eventDisplay="block"
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            dayMaxEvents={6}
            snapDuration="00:30:00"
            slotDuration="00:30:00"
            firstDay={1}
            fixedWeekCount={false}
            showNonCurrentDates={false}
            eventOrder="title"
          />
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <span>Click to view/edit — Drag to move</span>
          <span className="ml-auto">
            {allBookings.filter(b => b.status === 'pending').length > 0 && (
              <><span className="text-red-600 font-medium">{allBookings.filter(b => b.status === 'pending').length}</span> pending<span className="mx-2">&middot;</span></>
            )}
            <span className="text-teal-600 font-medium">{allBookings.filter(b => b.status === 'scheduled').length}</span> scheduled
            <span className="mx-2">&middot;</span>
            <span className="font-medium">{allBookings.length}</span> total
          </span>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden">
        {(() => {
          let filtered = [...allBookings]
          if (selectedMember) filtered = filtered.filter(b => b.team_member_id === selectedMember)
          if (selectedStatuses.length > 0) filtered = filtered.filter(b => selectedStatuses.includes(b.status))
          filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          const todayStr = new Date().toISOString().split('T')[0]
          filtered = filtered.filter(b => b.start_time.split('T')[0] >= todayStr)

          const grouped: Record<string, Booking[]> = {}
          for (const b of filtered) {
            const dateKey = b.start_time.split('T')[0]
            if (!grouped[dateKey]) grouped[dateKey] = []
            grouped[dateKey].push(b)
          }

          const dateKeys = Object.keys(grouped).sort()
          if (dateKeys.length === 0) return <p className="text-center text-slate-400 py-8">No upcoming appointments</p>

          return dateKeys.map(dateKey => {
            const dayDate = new Date(dateKey + 'T12:00:00')
            const isToday = dateKey === todayStr
            const label = isToday ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            return (
              <div key={dateKey} className="mb-4">
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-1.5 px-1 ${isToday ? 'text-teal-600' : 'text-slate-400'}`}>{label}</h3>
                <div className="space-y-1.5">
                  {grouped[dateKey].map(b => {
                    const color = b.status === 'pending' ? '#dc2626' : memberColors[b.team_member_id] || '#0d9488'
                    const [, st] = b.start_time.split('T'); const [sh, sm] = (st || '00:00').split(':').map(Number)
                    const [, et] = b.end_time.split('T'); const [eh, em] = (et || '00:00').split(':').map(Number)
                    const time = new Date(2000, 0, 1, sh, sm).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    const endTime = new Date(2000, 0, 1, eh, em).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    return (
                      <button key={b.id} onClick={() => openPanel(b)} className="w-full flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100 active:bg-slate-50 text-left">
                        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {b.status === 'pending' && '\u23F3 '}{b.status === 'in_progress' && '\u25B6\uFE0F '}{b.clients?.name || 'Client'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{b.service_type} — {b.team_members?.name || 'Unassigned'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-slate-900">{time}</p>
                          <p className="text-xs text-slate-400">{endTime}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Booking Detail SidePanel */}
      <SidePanel open={!!panelBooking} onClose={closePanel} title={panelBooking?.clients?.name || 'Booking'} width="max-w-md">
        {panelBooking && (
          <div className="space-y-5">
            {panelWarning && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                {panelWarning}
                <button onClick={() => setPanelWarning('')} className="ml-2 text-yellow-600 underline">Dismiss</button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                panelBooking.status === 'pending' ? 'bg-red-100 text-red-700' :
                panelBooking.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                panelBooking.status === 'in_progress' ? 'bg-teal-100 text-teal-700' :
                panelBooking.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                'bg-slate-100 text-slate-500'
              }`}>{panelBooking.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              {panelBooking.recurring_type && (
                <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{panelBooking.recurring_type}</span>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-slate-900 text-lg">{panelBooking.clients?.name || 'Unknown Client'}</p>
              {panelBooking.clients?.phone && (
                <a href={`tel:${panelBooking.clients.phone}`} className="text-sm text-teal-600 hover:underline block">{panelBooking.clients.phone}</a>
              )}
              {panelBooking.clients?.address && (
                <p className="text-sm text-slate-600">{panelBooking.clients.address}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900 font-medium">{formatNaiveDate(panelBooking.start_time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Time</span>
                <span className="text-slate-900 font-medium">{formatNaiveTime(panelBooking.start_time)} - {formatNaiveTime(panelBooking.end_time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Service</span>
                <span className="text-slate-900 font-medium">{panelBooking.service_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Price</span>
                <span className="text-slate-900 font-medium">${(panelBooking.price / 100).toFixed(0)}</span>
              </div>
              {panelBooking.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-sm text-slate-900">{panelBooking.notes}</p>
                </div>
              )}
            </div>

            <div>
              {noQualifiedMatch && clientRequirements.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-amber-800">No qualified team member available</p>
                  <p className="text-xs text-amber-600 mt-1">Client requires: {clientRequirements.join(', ')}</p>
                  <p className="text-xs text-amber-600">You can still assign manually or waitlist this booking.</p>
                </div>
              )}
              <label className="block text-sm font-medium text-slate-900 mb-2">
                {panelBooking.status === 'pending' ? 'Assign Team Member' : 'Team Member'}
              </label>
              {loadingAvail ? (
                <p className="text-sm text-slate-400">Checking availability...</p>
              ) : (
                <div className="space-y-1.5">
                  {(panelMembers.length > 0 ? panelMembers : teamMembers.map(m => ({ id: m.id, name: m.name, available: true, conflict: undefined as string | undefined, preferred: false, history_count: 0, jobs_today: 0, tags: [] as string[], score: 0, meets_requirements: true, missing_skills: [] as string[] }))).map((m, idx) => {
                    const isOff = !m.available && (m.conflict === 'Day off' || m.conflict?.includes('off') || m.conflict?.includes('Not scheduled') || m.conflict?.includes('unavailable'))
                    return (
                    <button
                      key={m.id}
                      onClick={() => !isOff && setPanelMemberId(m.id)}
                      disabled={isOff}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-colors ${
                        isOff
                          ? 'border-red-200 bg-red-50 opacity-70 cursor-not-allowed'
                          : panelMemberId === m.id
                            ? 'border-teal-600 bg-teal-50'
                            : m.available
                              ? m.preferred ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                              : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: memberColors[m.id] || '#666' }} />
                        <span className={`font-medium truncate ${isOff ? 'text-red-400' : panelMemberId === m.id ? 'text-teal-700' : 'text-slate-700'}`}>{m.name}</span>
                        {m.preferred && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold flex-shrink-0">PREFERRED</span>}
                        {!m.preferred && (m.history_count || 0) > 0 && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium flex-shrink-0">{m.history_count}x</span>}
                        {idx === 0 && m.available && panelMembers.length > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium flex-shrink-0">BEST</span>}
                        {m.missing_skills && m.missing_skills.length > 0 && <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px] font-medium flex-shrink-0">missing: {m.missing_skills.join(', ')}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isOff && <span className="text-xs text-red-600 font-medium">OFF — Cannot assign</span>}
                        {!isOff && m.available && (m.jobs_today != null) && <span className="text-[10px] text-slate-400">{m.jobs_today === 0 ? 'light day' : `${m.jobs_today} today`}</span>}
                        {!isOff && !m.available && m.conflict && <span className="text-xs text-yellow-600">{m.conflict}</span>}
                        {!isOff && m.available && <span className="text-xs text-green-600">Available</span>}
                      </div>
                    </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {panelBooking.status === 'pending' && (
                <>
                  <button onClick={handleConfirm} disabled={panelSaving || !panelMemberId}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                    {panelSaving ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                  <button onClick={handleDecline} disabled={panelSaving}
                    className="w-full py-2.5 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50">
                    Decline
                  </button>
                </>
              )}
              {panelBooking.status !== 'pending' && panelMemberId !== panelBooking.team_member_id && panelMemberId && (
                <button onClick={handleAssign} disabled={panelSaving}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                  {panelSaving ? 'Saving...' : 'Reassign Team Member'}
                </button>
              )}
              <a href={`/dashboard/bookings/${panelBooking.id}`}
                className="w-full py-2.5 border border-slate-300 text-slate-900 rounded-lg font-medium text-center block hover:bg-slate-50">
                Full Edit
              </a>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  )
}
