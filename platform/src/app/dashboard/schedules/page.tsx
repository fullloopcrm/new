'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  triweekly: 'Every 3 Weeks',
  monthly_date: 'Monthly (date)',
  monthly_weekday: 'Monthly (weekday)',
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
]

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [team, setTeam] = useState<{ id: string; name: string }[]>([])
  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    client_id: '', team_member_id: '', service_type_id: '',
    recurring_type: 'weekly', day_of_week: '1', preferred_time: '09:00', duration_hours: '3',
    hourly_rate: '', pay_rate: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/schedules')
      .then((r) => r.json())
      .then((data) => setSchedules(data.schedules || []))
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

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: form.client_id,
        team_member_id: form.team_member_id || null,
        service_type_id: form.service_type_id || null,
        recurring_type: form.recurring_type,
        day_of_week: parseInt(form.day_of_week),
        preferred_time: form.preferred_time,
        duration_hours: parseFloat(form.duration_hours),
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        pay_rate: form.pay_rate ? Number(form.pay_rate) : null,
        notes: form.notes || null,
      }),
    })
    if (res.ok) {
      const { schedule } = await res.json()
      setSchedules((prev) => [schedule, ...prev])
      setShowCreate(false)
    }
    setSaving(false)
  }

  const activeCount = schedules.filter(s => s.status === 'active').length
  const pausedCount = schedules.filter(s => s.status === 'paused').length

  const filtered = schedules.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const clientMatch = s.clients?.name?.toLowerCase().includes(q)
      const serviceMatch = s.service_types?.name?.toLowerCase().includes(q)
      if (!clientMatch && !serviceMatch) return false
    }
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Schedules</h2>
          <p className="text-sm text-gray-500">{schedules.length} total &middot; {activeCount} active &middot; {pausedCount} paused</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
          {showCreate ? 'Cancel' : '+ New Schedule'}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Schedules', value: schedules.length, color: 'border-l-gray-400' },
          { label: 'Active', value: activeCount, color: 'border-l-green-500' },
          { label: 'Paused', value: pausedCount, color: 'border-l-yellow-500' },
          { label: 'Weekly', value: schedules.filter(s => s.recurring_type === 'weekly').length, color: 'border-l-blue-500' },
        ].map((card) => (
          <div key={card.label} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <form onSubmit={createSchedule} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Create Recurring Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Client *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select Client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Team Member</label>
              <select value={form.team_member_id} onChange={(e) => setForm({ ...form, team_member_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select Team Member</option>
                {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Service</label>
              <select value={form.service_type_id} onChange={(e) => setForm({ ...form, service_type_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select Service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Frequency</label>
              <select value={form.recurring_type} onChange={(e) => setForm({ ...form, recurring_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="triweekly">Every 3 Weeks</option>
                <option value="monthly_date">Monthly (same date)</option>
                <option value="monthly_weekday">Monthly (same weekday)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Day</label>
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Time</label>
              <input type="time" value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Duration (hrs)</label>
              <input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 uppercase mb-1 block">Notes</label>
              <input placeholder="Special instructions..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.client_id}
              className="bg-white text-gray-900 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Schedule'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* SEARCH */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name or service type..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
        />
      </div>

      {/* STATUS TABS */}
      <div className="flex gap-1 mb-4">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-gray-900'
                : 'text-gray-500 hover:bg-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Frequency</th>
              <th className="px-4 py-3 font-medium">Day / Time</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/schedules/${s.id}`} className="font-medium text-white hover:text-blue-400">
                    {s.clients?.name || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.team_members?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.service_types?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{frequencyLabels[s.recurring_type] || s.recurring_type}</td>
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{s.day_of_week != null ? DAYS[s.day_of_week] : '—'}</p>
                  <p className="text-xs text-gray-400">{s.preferred_time || ''} {s.duration_hours ? `· ${s.duration_hours}hr` : ''}</p>
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
                    <p className="text-[10px] text-gray-400 mt-0.5">until {new Date(s.paused_until).toLocaleDateString()}</p>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                {statusFilter ? `No ${statusFilter} schedules` : 'No recurring schedules yet'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
