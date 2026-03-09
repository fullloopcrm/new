'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { downloadCSV } from '@/lib/csv'
import { usePoll } from '@/lib/use-poll'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

const CalendarView = dynamic(() => import('./calendar-view'), { ssr: false })

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  payment_status: string | null
  notes: string | null
  clients: { name: string; phone: string | null; address: string | null } | null
  team_members: { name: string; phone: string | null } | null
  service_types: { name: string } | null
}

type Schedule = {
  id: string
  recurring_type: string
  day_of_week: number | null
  preferred_time: string | null
  duration_hours: number | null
  status: string
  paused_until: string | null
  notes: string | null
  clients: { name: string } | null
  team_members: { name: string } | null
  service_types: { name: string } | null
  created_at: string
}

type Client = { id: string; name: string }
type TeamMember = { id: string; name: string }
type ServiceType = { id: string; name: string; default_duration_hours: number; default_hourly_rate: number }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  triweekly: 'Every 3 Weeks',
  monthly_date: 'Monthly (date)',
  monthly_weekday: 'Monthly (weekday)',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
  no_show: 'bg-slate-600 text-slate-400',
  pending: 'bg-slate-600 text-slate-400',
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

const scheduleStatusTabs = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [view, setView] = useState<'list' | 'calendar' | 'schedules'>('calendar')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [form, setForm] = useState({
    client_id: '', team_member_id: '', service_type_id: '',
    date: '', time: '09:00', notes: '', price: '',
    hours: '', rate: '', status: 'scheduled',
    repeat: false, repeat_frequency: 'weekly',
    discount: false,
  })
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bookingCreated, setBookingCreated] = useState(false)
  const [stats, setStats] = useState({ upcoming: 0, thisWeek: 0, completed: 0, revenue: 0 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')

  // Schedule state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [showScheduleCreate, setShowScheduleCreate] = useState(false)
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('')
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [scheduleClients, setScheduleClients] = useState<{ id: string; name: string }[]>([])
  const [scheduleTeam, setScheduleTeam] = useState<{ id: string; name: string }[]>([])
  const [scheduleServices, setScheduleServices] = useState<{ id: string; name: string }[]>([])
  const [scheduleForm, setScheduleForm] = useState({
    client_id: '', team_member_id: '', service_type_id: '',
    recurring_type: 'weekly', day_of_week: '1', preferred_time: '09:00', duration_hours: '3',
    hourly_rate: '', pay_rate: '', notes: '',
  })
  const [scheduleSaving, setScheduleSaving] = useState(false)

  const bookingsSettings = usePageSettings('bookings')

  const loadBookings = useCallback(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    params.set('page', String(page))
    params.set('limit', '50')
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then((data) => { setBookings(data.bookings || []); setTotal(data.total || 0) })
  }, [statusFilter, search, page])

  useEffect(() => { loadBookings() }, [loadBookings])
  usePoll(loadBookings, 30000)

  // Load stats
  useEffect(() => {
    fetch('/api/bookings/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (showCreate) {
      Promise.all([
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/team').then((r) => r.json()),
        fetch('/api/settings/services').then((r) => r.json()),
      ]).then(([c, t, s]) => {
        setClients(c.clients || [])
        setTeam(t.team || [])
        setServices(s.services || [])
      })
    }
  }, [showCreate])

  // Load schedules when schedules view is active
  useEffect(() => {
    if (view === 'schedules') {
      fetch('/api/schedules')
        .then((r) => r.json())
        .then((data) => setSchedules(data.schedules || []))
    }
  }, [view])

  // Load schedule form dropdowns when schedule create form opens
  useEffect(() => {
    if (showScheduleCreate) {
      Promise.all([
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/team').then((r) => r.json()),
        fetch('/api/settings/services').then((r) => r.json()),
      ]).then(([c, t, s]) => {
        setScheduleClients(c.clients || [])
        setScheduleTeam(t.team || [])
        setScheduleServices(s.services || [])
      })
    }
  }, [showScheduleCreate])

  async function createBooking(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const hours = parseFloat(form.hours) || 0
    const rate = parseFloat(form.rate) || 0
    const startTime = form.date && form.time ? `${form.date}T${form.time}` : ''
    const endTime = startTime && hours
      ? new Date(new Date(startTime).getTime() + hours * 3600000).toISOString()
      : null
    let priceInCents = Math.round(hours * rate * 100)
    if (form.discount) priceInCents = Math.round(priceInCents * 0.9)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: form.client_id || null,
        team_member_id: form.team_member_id || null,
        service_type_id: form.service_type_id || null,
        start_time: startTime,
        end_time: endTime,
        status: form.status,
        notes: form.notes,
        price: priceInCents || null,
        hourly_rate: rate || null,
      }),
    })
    if (res.ok) {
      // If repeat is enabled, also create a recurring schedule
      if (form.repeat && form.client_id) {
        const startDate = new Date(startTime)
        await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: form.client_id,
            team_member_id: form.team_member_id || null,
            service_type_id: form.service_type_id || null,
            recurring_type: form.repeat_frequency,
            day_of_week: startDate.getDay(),
            preferred_time: form.time,
            duration_hours: hours || null,
            hourly_rate: rate || null,
            notes: form.notes || null,
          }),
        })
      }

      setShowCreate(false)
      setForm({
        client_id: '', team_member_id: '', service_type_id: '',
        date: '', time: '09:00', notes: '', price: '',
        hours: '', rate: '', status: 'scheduled',
        repeat: false, repeat_frequency: 'weekly',
        discount: false,
      })
      setClientSearch('')
      setShowClientDropdown(false)
      loadBookings()
      setView('calendar')
      setBookingCreated(true)
      setTimeout(() => setBookingCreated(false), 4000)
    }
    setSaving(false)
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault()
    setScheduleSaving(true)
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: scheduleForm.client_id,
        team_member_id: scheduleForm.team_member_id || null,
        service_type_id: scheduleForm.service_type_id || null,
        recurring_type: scheduleForm.recurring_type,
        day_of_week: parseInt(scheduleForm.day_of_week),
        preferred_time: scheduleForm.preferred_time,
        duration_hours: parseFloat(scheduleForm.duration_hours),
        hourly_rate: scheduleForm.hourly_rate ? Number(scheduleForm.hourly_rate) : null,
        pay_rate: scheduleForm.pay_rate ? Number(scheduleForm.pay_rate) : null,
        notes: scheduleForm.notes || null,
      }),
    })
    if (res.ok) {
      const { schedule } = await res.json()
      setSchedules((prev) => [schedule, ...prev])
      setShowScheduleCreate(false)
    }
    setScheduleSaving(false)
  }

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  // Schedule computed values
  const activeCount = schedules.filter(s => s.status === 'active').length
  const pausedCount = schedules.filter(s => s.status === 'paused').length

  const filteredSchedules = schedules.filter(s => {
    if (scheduleStatusFilter && s.status !== scheduleStatusFilter) return false
    if (scheduleSearch) {
      const q = scheduleSearch.toLowerCase()
      const clientMatch = s.clients?.name?.toLowerCase().includes(q)
      const serviceMatch = s.service_types?.name?.toLowerCase().includes(q)
      if (!clientMatch && !serviceMatch) return false
    }
    return true
  })

  return (
    <div>
      {/* PORTAL LINK */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Client Booking Portal:</span>
          <code className="text-blue-400 font-mono text-xs bg-slate-700 px-2 py-0.5 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/portal/book` : '/portal/book'}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/portal/book`)} className="text-xs text-slate-400 hover:text-white transition-colors">Copy Link</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Bookings</h2>
            <p className="text-sm text-slate-400">{view === 'schedules' ? `${schedules.length} total schedules` : `${total} total bookings`}</p>
          </div>
          <PageSettingsGear open={bookingsSettings.open} setOpen={bookingsSettings.setOpen} title="Bookings" />
        </div>
        <div className="flex gap-2">
          {view !== 'schedules' && (
            <button
              onClick={() => downloadCSV(
                bookings.map(b => ({
                  date: new Date(b.start_time).toLocaleDateString(),
                  time: new Date(b.start_time).toLocaleTimeString(),
                  client: b.clients?.name || '',
                  service: b.service_types?.name || b.service_type || '',
                  team_member: b.team_members?.name || '',
                  status: b.status,
                  price: b.price != null ? (b.price / 100).toFixed(2) : '',
                  payment_status: b.payment_status || '',
                  notes: b.notes || '',
                })),
                'bookings',
                ['date', 'time', 'client', 'service', 'team_member', 'status', 'price', 'payment_status', 'notes']
              )}
              className="text-sm text-slate-400 hover:text-white border border-slate-600 px-3 py-2 rounded-lg"
            >
              Export CSV
            </button>
          )}
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>List</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'calendar' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Calendar</button>
            <button onClick={() => setView('schedules')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'schedules' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Schedules</button>
          </div>
          {view === 'schedules' ? (
            <button onClick={() => setShowScheduleCreate(!showScheduleCreate)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
              {showScheduleCreate ? 'Cancel' : '+ New Schedule'}
            </button>
          ) : (
            <button onClick={() => setShowCreate(!showCreate)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
              {showCreate ? 'Cancel' : '+ New Booking'}
            </button>
          )}
        </div>
      </div>

      <PageSettingsPanel
        {...bookingsSettings}
        title="Bookings"
        tips={[
          'Use the calendar view to visualize your week',
          'Enable repeat when creating bookings to auto-generate recurring schedules',
          'Bulk select bookings to confirm or cancel multiple at once',
          'Share the Client Booking Portal link so clients can self-book',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Default Booking Status</label>
              <select
                value={(config.default_status as string) || 'scheduled'}
                onChange={(e) => updateConfig('default_status', e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="border-t border-slate-700" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Default Booking Duration</label>
              <select
                value={(config.default_duration as string) || '3'}
                onChange={(e) => updateConfig('default_duration', e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              >
                <option value="1">1 hour</option>
                <option value="1.5">1.5 hours</option>
                <option value="2">2 hours</option>
                <option value="2.5">2.5 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="5">5 hours</option>
                <option value="6">6 hours</option>
                <option value="8">8 hours</option>
              </select>
            </div>
            <div className="border-t border-slate-700" />
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-slate-300">Require team member assignment</label>
              <button
                onClick={() => updateConfig('require_team_member', !config.require_team_member)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.require_team_member ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.require_team_member ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="border-t border-slate-700" />
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-slate-300">Auto-confirm bookings</label>
              <button
                onClick={() => updateConfig('auto_confirm', !config.auto_confirm)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.auto_confirm ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.auto_confirm ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {bookingCreated && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">&#10003;</span>
            <span className="text-sm text-green-400 font-medium">Booking created successfully!</span>
            {view !== 'calendar' && (
              <button onClick={() => setView('calendar')} className="text-sm text-blue-400 hover:text-blue-300 ml-2 underline">
                View on Calendar
              </button>
            )}
          </div>
          <button onClick={() => setBookingCreated(false)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {view === 'schedules' ? (
        <>
          {/* SCHEDULE STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Schedules', value: schedules.length, color: 'border-l-gray-400' },
              { label: 'Active', value: activeCount, color: 'border-l-green-500' },
              { label: 'Paused', value: pausedCount, color: 'border-l-yellow-500' },
              { label: 'Weekly', value: schedules.filter(s => s.recurring_type === 'weekly').length, color: 'border-l-blue-500' },
            ].map((card) => (
              <div key={card.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${card.color} p-5`}>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          {/* SCHEDULE CREATE FORM */}
          {showScheduleCreate && (
            <form onSubmit={createSchedule} className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-white mb-4">Create Recurring Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Client *</label>
                  <select value={scheduleForm.client_id} onChange={(e) => setScheduleForm({ ...scheduleForm, client_id: e.target.value })} required
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Client</option>
                    {scheduleClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Team Member</label>
                  <select value={scheduleForm.team_member_id} onChange={(e) => setScheduleForm({ ...scheduleForm, team_member_id: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Team Member</option>
                    {scheduleTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Service</label>
                  <select value={scheduleForm.service_type_id} onChange={(e) => setScheduleForm({ ...scheduleForm, service_type_id: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Service</option>
                    {scheduleServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Frequency</label>
                  <select value={scheduleForm.recurring_type} onChange={(e) => setScheduleForm({ ...scheduleForm, recurring_type: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="triweekly">Every 3 Weeks</option>
                    <option value="monthly_date">Monthly (same date)</option>
                    <option value="monthly_weekday">Monthly (same weekday)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Day</label>
                  <select value={scheduleForm.day_of_week} onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Time</label>
                  <input type="time" value={scheduleForm.preferred_time} onChange={(e) => setScheduleForm({ ...scheduleForm, preferred_time: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Duration (hrs)</label>
                  <input type="number" step="0.5" value={scheduleForm.duration_hours} onChange={(e) => setScheduleForm({ ...scheduleForm, duration_hours: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Notes</label>
                  <input placeholder="Special instructions..." value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={scheduleSaving || !scheduleForm.client_id}
                  className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                  {scheduleSaving ? 'Creating...' : 'Create Schedule'}
                </button>
                <button type="button" onClick={() => setShowScheduleCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              </div>
            </form>
          )}

          {/* SCHEDULE SEARCH */}
          <div className="mb-4">
            <input
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder="Search by client name or service type..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </div>

          {/* SCHEDULE STATUS TABS */}
          <div className="flex gap-1 mb-4">
            {scheduleStatusTabs.map((tab) => (
              <button key={tab.value} onClick={() => setScheduleStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  scheduleStatusFilter === tab.value
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* SCHEDULE TABLE */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Day / Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/schedules/${s.id}`} className="font-medium text-white hover:text-teal-400">
                        {s.clients?.name || '\u2014'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{s.team_members?.name || '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-400">{s.service_types?.name || '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-400">{frequencyLabels[s.recurring_type] || s.recurring_type}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{s.day_of_week != null ? DAYS[s.day_of_week] : '\u2014'}</p>
                      <p className="text-xs text-slate-400">{s.preferred_time || ''} {s.duration_hours ? `\u00b7 ${s.duration_hours}hr` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        s.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {s.status}
                      </span>
                      {s.paused_until && (
                        <p className="text-[10px] text-slate-400 mt-0.5">until {new Date(s.paused_until).toLocaleDateString()}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSchedules.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {scheduleStatusFilter ? `No ${scheduleStatusFilter} schedules` : 'No recurring schedules yet'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Upcoming', value: stats.upcoming, icon: '\u25EB', color: 'border-l-blue-500' },
              { label: 'This Week', value: stats.thisWeek, icon: '\u25C8', color: 'border-l-indigo-500' },
              { label: 'Completed', value: stats.completed, icon: '\u2713', color: 'border-l-green-500', sub: 'this month' },
              { label: 'Revenue', value: fmt(stats.revenue), icon: '$', color: 'border-l-purple-500', sub: 'this month' },
            ].map((card) => (
              <div key={card.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${card.color} p-5`}>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* CREATE FORM */}
          {showCreate && (() => {
            const filteredClients = clients.filter((c) =>
              clientSearch.length > 0 && c.name.toLowerCase().includes(clientSearch.toLowerCase())
            )
            const selectedClient = clients.find((c) => c.id === form.client_id)
            const hours = parseFloat(form.hours) || 0
            const rate = parseFloat(form.rate) || 0
            const subtotal = hours * rate
            const total = form.discount ? subtotal * 0.9 : subtotal

            return (
            <form onSubmit={createBooking} className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 space-y-5">
              <h3 className="text-lg font-semibold text-white">Create Booking</h3>

              {/* Row 1: Client (full width) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Client</label>
                {selectedClient ? (
                  <div className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <span className="text-white flex-1">{selectedClient.name}</span>
                    <button type="button" onClick={() => { setForm({ ...form, client_id: '' }); setClientSearch(''); }} className="text-slate-400 hover:text-white text-xs">Clear</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                      onFocus={() => { if (clientSearch.length > 0) setShowClientDropdown(true) }}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                    />
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                        {filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm({ ...form, client_id: c.id })
                              setClientSearch(c.name)
                              setShowClientDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 hover:text-white"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Service (full width) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Service</label>
                <select
                  value={form.service_type_id}
                  onChange={(e) => {
                    const svc = services.find((s) => s.id === e.target.value)
                    setForm({
                      ...form,
                      service_type_id: e.target.value,
                      hours: svc ? String(svc.default_duration_hours) : form.hours,
                      rate: svc ? String(svc.default_hourly_rate) : form.rate,
                    })
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.default_duration_hours}hr &middot; ${s.default_hourly_rate}/hr)</option>
                  ))}
                </select>
              </div>

              {/* Row 3: Team Member (full width) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Team Member *</label>
                <select
                  value={form.team_member_id}
                  onChange={(e) => setForm({ ...form, team_member_id: e.target.value })}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Team Member</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 4: Hours + Rate (2 columns) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Hours</label>
                  <select
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Hours</option>
                    {['1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '8'].map((h) => (
                      <option key={h} value={h}>{h}hr</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Rate</label>
                  <select
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Rate</option>
                    {[25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((r) => (
                      <option key={r} value={String(r)}>${r}/hr</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Date + Time (2 columns) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Time *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Row 6: Repeat toggle + Discount toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Repeat</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, repeat: !form.repeat })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.repeat ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.repeat ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                  {form.repeat && (
                    <select
                      value={form.repeat_frequency}
                      onChange={(e) => setForm({ ...form, repeat_frequency: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mt-2"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">10% Discount</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, discount: !form.discount })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.discount ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.discount ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 7: Estimate Summary */}
              {hours > 0 && rate > 0 && (
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    ~{hours}hrs &times; ${rate}/hr
                  </div>
                  <div className="text-right">
                    {form.discount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 line-through">${subtotal.toFixed(0)}</span>
                        <span className="text-lg font-bold text-green-400">~${total.toFixed(0)}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-white">~${total.toFixed(0)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Row 8: Status */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Row 9: Notes */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea
                  placeholder="Access codes, special instructions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              {/* Row 10: Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-600 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.date || !form.time || !form.team_member_id}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
            )
          })()}

          {view === 'list' ? (
            <>
              {/* SEARCH + STATUS TABS */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
                <input
                  placeholder="Search client, team member, service..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full md:w-64 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-1 flex-wrap">
                  {statusTabs.map((tab) => (
                    <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        statusFilter === tab.value
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:bg-slate-700'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BULK ACTION BAR */}
              {selected.size > 0 && (
                <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4">
                  <span className="text-sm text-white font-medium">{selected.size} selected</span>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm">
                    <option value="">Bulk action...</option>
                    <option value="confirmed">Confirm All</option>
                    <option value="cancelled">Cancel All</option>
                    <option value="delete">Delete</option>
                  </select>
                  <button onClick={async () => {
                    if (!bulkAction) return
                    if (bulkAction === 'delete' && !confirm(`Delete ${selected.size} bookings?`)) return
                    for (const id of selected) {
                      if (bulkAction === 'delete') {
                        await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
                      } else {
                        await fetch(`/api/bookings/${id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: bulkAction }),
                        })
                      }
                    }
                    setSelected(new Set())
                    setBulkAction('')
                    loadBookings()
                  }} disabled={!bulkAction}
                    className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                    Apply
                  </button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-white ml-auto">Clear</button>
                </div>
              )}

              {/* TABLE */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox"
                          checked={bookings.length > 0 && selected.size === bookings.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelected(new Set(bookings.map(b => b.id)))
                            } else {
                              setSelected(new Set())
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Date & Time</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium">Team</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <input type="checkbox"
                            checked={selected.has(b.id)}
                            onChange={(e) => {
                              const next = new Set(selected)
                              if (e.target.checked) next.add(b.id)
                              else next.delete(b.id)
                              setSelected(next)
                            }}
                            className="rounded border-slate-600 bg-slate-700"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/bookings/${b.id}`} className="font-medium text-white hover:text-teal-400">
                            {new Date(b.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {b.end_time && ` \u2013 ${new Date(b.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{b.clients?.name || '\u2014'}</p>
                          {b.clients?.phone && <p className="text-xs text-slate-400">{b.clients.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.service_types?.name || b.service_type || '\u2014'}</td>
                        <td className="px-4 py-3 text-slate-400">{b.team_members?.name || '\u2014'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[b.status] || 'bg-slate-600 text-slate-400'}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {b.price != null ? fmt(b.price) : '\u2014'}
                        </td>
                        <td className="px-4 py-3">
                          {b.payment_status === 'paid' ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Paid</span>
                          ) : b.payment_status === 'pending' ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">Pending</span>
                          ) : (
                            <span className="text-xs text-slate-400">{'\u2014'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No bookings found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {total > 50 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-30 hover:bg-slate-700">Previous</button>
                  <span className="px-3 py-1.5 text-sm text-slate-400">Page {page} of {Math.ceil(total / 50)}</span>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}
                    className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-30 hover:bg-slate-700">Next</button>
                </div>
              )}
            </>
          ) : (
            <CalendarView
              bookings={bookings}
              onDateClick={(date, time) => {
                setForm(f => ({ ...f, date, time }))
                setShowCreate(true)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
