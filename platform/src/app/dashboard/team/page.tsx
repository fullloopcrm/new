'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { downloadCSV } from '@/lib/csv'
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
  preferred_language: string
  working_days: number[] | null
  avatar_url: string | null
  notes: string | null
  created_at: string
}

type TeamConfig = {
  roles: string[]
  pay_rates: { label: string; amount: number }[]
  default_working_days: number[]
}

type WorkingHourEntry = { start: string; end: string } | null
type WorkingHours = Record<number, WorkingHourEntry>
type TimeOffEntry = { start: string; end: string; reason?: string }

const DEFAULT_ROLES = ['worker', 'lead', 'manager']

const DEFAULT_TEAM_CONFIG: TeamConfig = {
  roles: [...DEFAULT_ROLES],
  pay_rates: [],
  default_working_days: [1, 2, 3, 4, 5],
}

function parseNotesData(notes: string | null): { working_hours?: WorkingHours; time_off?: TimeOffEntry[] } {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {
    // plain text notes
  }
  return {}
}

function formatTime12Short(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const ampm = h >= 12 ? 'PM' : 'AM'
  const m = parseInt(mStr, 10)
  if (m === 0) return `${hour12}${ampm}`
  return `${hour12}:${String(m).padStart(2, '0')}${ampm}`
}

function getWorkingHoursSummary(wh: WorkingHours): string | null {
  const activeDays = Object.values(wh).filter((v): v is { start: string; end: string } => v !== null && v !== undefined)
  if (activeDays.length === 0) return null
  // Check if all active days have the same hours
  const first = activeDays[0]
  const allSame = activeDays.every(d => d.start === first.start && d.end === first.end)
  if (allSame) {
    return `${formatTime12Short(first.start)}-${formatTime12Short(first.end)}`
  }
  return 'Custom hours'
}

function getUpcomingTimeOff(entries: TimeOffEntry[]): TimeOffEntry | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Find first entry where end date >= today
  for (const entry of entries) {
    const endDate = new Date(entry.end + 'T00:00:00')
    if (endDate >= today) return entry
  }
  return null
}

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const dayLabelsFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  inactive: 'bg-gray-700 text-gray-400 border-gray-700',
}

const roleColors: Record<string, string> = {
  worker: 'bg-blue-500/20 text-blue-400',
  lead: 'bg-purple-500/20 text-purple-400',
  manager: 'bg-indigo-500/20 text-indigo-400',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [teamConfig, setTeamConfig] = useState<TeamConfig>(DEFAULT_TEAM_CONFIG)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')
  const [newRoleInput, setNewRoleInput] = useState('')
  const [newRateLabel, setNewRateLabel] = useState('')
  const [newRateAmount, setNewRateAmount] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'worker', hourly_rate: '', pay_rate: '',
    working_days: [1, 2, 3, 4, 5] as number[],
    avatar_url: '' as string,
    pay_rate_preset: 'custom' as string,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newPin, setNewPin] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const createPhotoRef = useRef<HTMLInputElement>(null)

  // Load team members
  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setTeam(data.team || []))
  }, [])

  // Load team config
  useEffect(() => {
    fetch('/api/settings/team')
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setTeamConfig(data.config)
          // Update form defaults from config
          setForm(f => ({ ...f, working_days: data.config.default_working_days || [1, 2, 3, 4, 5] }))
        }
      })
      .catch(() => { /* use defaults */ })
  }, [])

  async function saveTeamConfig(config: TeamConfig) {
    setSavingSettings(true)
    setSettingsMsg('')
    try {
      const res = await fetch('/api/settings/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        const data = await res.json()
        setTeamConfig(data.config)
        setSettingsMsg('Settings saved')
        setTimeout(() => setSettingsMsg(''), 2000)
      } else {
        const data = await res.json()
        setSettingsMsg(data.error || 'Failed to save')
      }
    } catch {
      setSettingsMsg('Network error')
    }
    setSavingSettings(false)
  }

  function addRole() {
    const role = newRoleInput.trim().toLowerCase()
    if (!role || teamConfig.roles.includes(role)) return
    const updated = { ...teamConfig, roles: [...teamConfig.roles, role] }
    setTeamConfig(updated)
    saveTeamConfig(updated)
    setNewRoleInput('')
  }

  function removeRole(role: string) {
    if (DEFAULT_ROLES.includes(role)) return
    const updated = { ...teamConfig, roles: teamConfig.roles.filter(r => r !== role) }
    setTeamConfig(updated)
    saveTeamConfig(updated)
  }

  function addPayRate() {
    const label = newRateLabel.trim()
    const amount = parseFloat(newRateAmount)
    if (!label || isNaN(amount) || amount < 0) return
    const updated = { ...teamConfig, pay_rates: [...teamConfig.pay_rates, { label, amount }] }
    setTeamConfig(updated)
    saveTeamConfig(updated)
    setNewRateLabel('')
    setNewRateAmount('')
  }

  function removePayRate(index: number) {
    const updated = { ...teamConfig, pay_rates: teamConfig.pay_rates.filter((_, i) => i !== index) }
    setTeamConfig(updated)
    saveTeamConfig(updated)
  }

  function toggleDefaultDay(day: number) {
    const days = teamConfig.default_working_days.includes(day)
      ? teamConfig.default_working_days.filter(d => d !== day)
      : [...teamConfig.default_working_days, day].sort()
    const updated = { ...teamConfig, default_working_days: days }
    setTeamConfig(updated)
    saveTeamConfig(updated)
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setNewPin('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          role: form.role,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
          pay_rate: form.pay_rate ? Number(form.pay_rate) : undefined,
          working_days: form.working_days,
          avatar_url: form.avatar_url || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTeam((prev) => [data.member, ...prev])
        setNewPin(data.member.pin)
        setShowAdd(false)
        setForm({ name: '', email: '', phone: '', role: 'worker', hourly_rate: '', pay_rate: '', working_days: teamConfig.default_working_days, avatar_url: '', pay_rate_preset: 'custom' })
      } else {
        setSaveError(data.error || 'Failed to save team member')
      }
    } catch {
      setSaveError('Network error -- please try again')
    }
    setSaving(false)
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day].sort()
    }))
  }

  function handlePayRatePreset(preset: string) {
    if (preset === 'custom') {
      setForm(f => ({ ...f, pay_rate_preset: 'custom', pay_rate: '' }))
    } else {
      const rate = teamConfig.pay_rates.find(r => r.label === preset)
      if (rate) {
        setForm(f => ({ ...f, pay_rate_preset: preset, pay_rate: String(rate.amount) }))
      }
    }
  }

  async function handleCreatePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Photo must be under 2MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSaveError('Only JPEG, PNG, or WebP photos allowed')
      return
    }
    setUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
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
        setUploadingPhoto(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
      setSaveError('Failed to read photo file')
      setUploadingPhoto(false)
    }
    reader.readAsDataURL(file)
  }

  const activeCount = team.filter(m => m.status === 'active').length

  return (
    <div>
      {/* PORTAL LINK */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Team Portal:</span>
          <a href={typeof window !== 'undefined' ? `${window.location.origin}/team` : '/team'} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded hover:text-blue-300">{typeof window !== 'undefined' ? `${window.location.origin}/team` : '/team'}</a>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/team`)} className="text-xs text-gray-400 hover:text-white transition-colors">Copy Link</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Team</h2>
            <p className="text-sm text-gray-500">{team.length} members &middot; {activeCount} active</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
            title="Team Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(team as unknown as Record<string, unknown>[], 'team', ['name', 'email', 'phone', 'role', 'status', 'pin', 'pay_rate', 'hourly_rate', 'preferred_language', 'created_at'])}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg"
          >
            Export CSV
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            {showAdd ? 'Cancel' : '+ Add Member'}
          </button>
        </div>
      </div>

      {/* TEAM SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Team Settings</h3>
            <div className="flex items-center gap-3">
              {settingsMsg && (
                <span className={`text-xs ${settingsMsg === 'Settings saved' ? 'text-green-400' : 'text-red-400'}`}>{settingsMsg}</span>
              )}
              {savingSettings && (
                <span className="text-xs text-gray-500">Saving...</span>
              )}
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* ROLES CONFIG */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-3 block">Roles</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {teamConfig.roles.map((role) => (
                  <span key={role} className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      role === 'worker' ? 'bg-blue-400' :
                      role === 'lead' ? 'bg-purple-400' :
                      role === 'manager' ? 'bg-indigo-400' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-gray-300 capitalize">{role}</span>
                    {DEFAULT_ROLES.includes(role) ? (
                      <span className="text-[10px] text-gray-600 ml-1">default</span>
                    ) : (
                      <button
                        onClick={() => removeRole(role)}
                        className="text-gray-600 hover:text-red-400 ml-1 text-xs leading-none"
                        title={`Remove ${role}`}
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="New role name..."
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-48 placeholder-gray-600"
                />
                <button
                  onClick={addRole}
                  disabled={!newRoleInput.trim()}
                  className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  + Add Role
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* PAY RATE PRESETS */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-3 block">Preset Pay Rates</label>
              {teamConfig.pay_rates.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {teamConfig.pay_rates.map((rate, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300">{rate.label}</span>
                        <span className="text-sm font-mono text-green-400">${rate.amount}/hr</span>
                      </div>
                      <button
                        onClick={() => removePayRate(i)}
                        className="text-gray-600 hover:text-red-400 text-sm"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 mb-3">No preset rates defined. Add rate tiers to quickly assign pay rates when creating members.</p>
              )}
              <div className="flex gap-2">
                <input
                  placeholder="Label (e.g. Standard)"
                  value={newRateLabel}
                  onChange={(e) => setNewRateLabel(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-40 placeholder-gray-600"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    placeholder="0"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRateAmount}
                    onChange={(e) => setNewRateAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPayRate())}
                    className="bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-12 py-1.5 text-sm w-32 placeholder-gray-600"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">/hr</span>
                </div>
                <button
                  onClick={addPayRate}
                  disabled={!newRateLabel.trim() || !newRateAmount}
                  className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  + Add Rate
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* DEFAULT WORKING DAYS */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-3 block">Default Working Days</label>
              <p className="text-xs text-gray-600 mb-3">Pre-selected working days when adding a new team member.</p>
              <div className="flex gap-2">
                {dayLabelsFull.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDefaultDay(i)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                      teamConfig.default_working_days.includes(i)
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Members', value: team.length, color: 'border-l-gray-400' },
          { label: 'Active', value: activeCount, color: 'border-l-green-500' },
          { label: 'Workers', value: team.filter(m => m.role === 'worker').length, color: 'border-l-blue-500' },
          { label: 'Leads / Managers', value: team.filter(m => m.role !== 'worker').length, color: 'border-l-purple-500' },
        ].map((card) => (
          <div key={card.label} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${card.color} p-4`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-xl font-bold text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* PIN SUCCESS BANNER */}
      {newPin && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-400">Team member created successfully!</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Their login PIN is <span className="font-mono font-bold text-white text-lg mx-1">{newPin}</span> -- share this with them to access the Team Portal.
            </p>
          </div>
          <button onClick={() => setNewPin('')} className="text-gray-500 hover:text-white text-lg">&times;</button>
        </div>
      )}

      {/* ADD FORM */}
      {showAdd && (
        <form onSubmit={addMember} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Add Team Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Name *</label>
              <input placeholder="Maria Garcia" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Email</label>
              <input placeholder="maria@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Phone</label>
              <input placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {teamConfig.roles.map((role) => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Hourly Rate (charge)</label>
              <input placeholder="45" type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Pay Rate ($/hr)</label>
              {teamConfig.pay_rates.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={form.pay_rate_preset}
                    onChange={(e) => handlePayRatePreset(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
                  >
                    <option value="custom">Custom</option>
                    {teamConfig.pay_rates.map((rate) => (
                      <option key={rate.label} value={rate.label}>{rate.label} (${rate.amount})</option>
                    ))}
                  </select>
                  {form.pay_rate_preset === 'custom' && (
                    <input
                      placeholder="25"
                      type="number"
                      value={form.pay_rate}
                      onChange={(e) => setForm({ ...form, pay_rate: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-24"
                    />
                  )}
                </div>
              ) : (
                <input placeholder="25" type="number" value={form.pay_rate} onChange={(e) => setForm({ ...form, pay_rate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
              )}
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase mb-2 block">Working Days</label>
            <div className="flex gap-1.5">
              {dayLabels.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                    form.working_days.includes(i)
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase mb-2 block">Photo (optional)</label>
            <input type="file" accept="image/*" ref={createPhotoRef} onChange={handleCreatePhotoUpload} className="hidden" />
            <div className="flex items-center gap-3">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">No photo</div>
              )}
              <button type="button" onClick={() => createPhotoRef.current?.click()} disabled={uploadingPhoto}
                className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg disabled:opacity-50">
                {uploadingPhoto ? 'Uploading...' : form.avatar_url ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
          </div>
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 mb-4 text-sm text-red-400">{saveError}</div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.name}
              className="bg-white text-gray-900 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Member'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((m) => {
          const workDays = m.working_days || [1, 2, 3, 4, 5]
          const notesData = parseNotesData(m.notes)
          const hoursSummary = notesData.working_hours ? getWorkingHoursSummary(notesData.working_hours) : null
          const upcomingOff = notesData.time_off ? getUpcomingTimeOff(notesData.time_off) : null
          return (
            <Link key={m.id} href={`/dashboard/team/${m.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className={`w-11 h-11 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-sm font-bold`}>
                      {initials(m.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{m.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColors[m.role] || 'bg-gray-700 text-gray-400'}`}>
                        {m.role}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${statusColors[m.status] || 'bg-gray-700 text-gray-400 border-gray-700'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-3">
                {m.phone && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="text-xs w-4 text-center">T</span>
                    <span>{m.phone}</span>
                  </div>
                )}
                {m.email && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="text-xs w-4 text-center">@</span>
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-xs w-4 text-center">$</span>
                  <span>{m.pay_rate ? `$${m.pay_rate}/hr` : 'Not set'}</span>
                </div>
              </div>

              {/* WORKING DAYS */}
              <div className="flex gap-1 mb-1">
                {dayLabels.map((label, i) => (
                  <div key={i} className={`w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center ${
                    workDays.includes(i) ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-600'
                  }`}>
                    {label}
                  </div>
                ))}
              </div>

              {/* WORKING HOURS SUMMARY */}
              {hoursSummary && (
                <p className="text-[10px] text-gray-500 mb-1">{hoursSummary}</p>
              )}

              {/* UPCOMING TIME OFF BADGE */}
              {upcomingOff && (
                <div className="mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                    Off {new Date(upcomingOff.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {upcomingOff.start !== upcomingOff.end && (
                      <> - {new Date(upcomingOff.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="font-mono text-xs text-gray-400">PIN: {m.pin}</span>
                <span className="text-[10px] text-gray-400 uppercase">{m.preferred_language || 'EN'}</span>
              </div>
            </Link>
          )
        })}

        {team.length === 0 && (
          <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
            No team members yet -- add your first one above
          </div>
        )}
      </div>
    </div>
  )
}
