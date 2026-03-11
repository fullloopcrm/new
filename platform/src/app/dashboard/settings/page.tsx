'use client'

import { useEffect, useState } from 'react'
import { formatPhone } from '@/lib/phone'
import { downloadCSV } from '@/lib/csv'
import AddressAutocomplete from '@/components/address-autocomplete'

type Tenant = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  zip_code: string | null
  team_size: string
  timezone: string
  industry: string
  business_hours: string | null
  primary_color: string
  secondary_color: string
  logo_url: string | null
  tagline: string | null
  website_url: string | null
  resend_api_key: string | null
  resend_domain: string | null
  email_from: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  stripe_account_id: string | null
  google_place_id: string | null

  // Scheduling fields
  booking_buffer_minutes: number | null
  default_duration_hours: number | null
  min_days_ahead: number | null
  allow_same_day: boolean | null
  business_hours_start: string | null
  business_hours_end: string | null

  // Referral & policy fields
  commission_rate: number | null
  attribution_window_hours: number | null
  active_client_threshold_days: number | null
  at_risk_threshold_days: number | null
  reschedule_notice_days: number | null

  // Guidelines
  guidelines_en: string | null
  guidelines_es: string | null
  guidelines_updated_at: string | null

  // Payment methods
  payment_methods: string[] | null
  zelle_email: string | null
  apple_cash_phone: string | null
}

type ServiceType = {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
  sort_order: number
  active: boolean
}

const TABS = ['Business', 'Services', 'Scheduling', 'Referrals & Policies', 'Integrations', 'Branding', 'Notifications', 'Guidelines', 'Tools'] as const
type Tab = typeof TABS[number]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
]

const BUSINESS_HOURS_START_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
]

const BUSINESS_HOURS_END_OPTIONS = [
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Business')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [services, setServices] = useState<ServiceType[]>([])
  const [form, setForm] = useState<Partial<Tenant>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newService, setNewService] = useState({ name: '', default_duration_hours: '3', default_hourly_rate: '49' })
  const [addingService, setAddingService] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editServiceForm, setEditServiceForm] = useState({ name: '', default_duration_hours: '', default_hourly_rate: '' })
  const [savingService, setSavingService] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, Record<string, boolean>>>({})
  const [exporting, setExporting] = useState<string | null>(null)

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => { setTenant(data.tenant); setForm(data.tenant) })
    fetch('/api/settings/services')
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data) => setNotifPrefs(data.preferences || {}))
  }, [])

  async function saveTenant() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { tenant: updated } = await res.json()
      setTenant(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newService.name,
        default_duration_hours: Number(newService.default_duration_hours),
        default_hourly_rate: Number(newService.default_hourly_rate),
      }),
    })
    if (res.ok) {
      const { service } = await res.json()
      setServices((prev) => [...prev, service])
      setNewService({ name: '', default_duration_hours: '3', default_hourly_rate: '49' })
      setAddingService(false)
    }
  }

  async function toggleService(id: string, active: boolean) {
    await fetch(`/api/settings/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, active } : s))
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service type?')) return
    await fetch(`/api/settings/services/${id}`, { method: 'DELETE' })
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  function startEditService(s: ServiceType) {
    setEditingServiceId(s.id)
    setEditServiceForm({
      name: s.name,
      default_duration_hours: String(s.default_duration_hours),
      default_hourly_rate: String(s.default_hourly_rate),
    })
  }

  async function saveEditService(id: string) {
    setSavingService(true)
    const res = await fetch(`/api/settings/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editServiceForm.name,
        default_duration_hours: Number(editServiceForm.default_duration_hours),
        default_hourly_rate: Number(editServiceForm.default_hourly_rate),
      }),
    })
    if (res.ok) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, name: editServiceForm.name, default_duration_hours: Number(editServiceForm.default_duration_hours), default_hourly_rate: Number(editServiceForm.default_hourly_rate) }
            : s
        )
      )
      setEditingServiceId(null)
    }
    setSavingService(false)
  }

  function maskKey(key: string | null) {
    if (!key) return ''
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }

  function togglePaymentMethod(method: string) {
    const current = form.payment_methods || []
    if (current.includes(method)) {
      setForm({ ...form, payment_methods: current.filter((m) => m !== method) })
    } else {
      setForm({ ...form, payment_methods: [...current, method] })
    }
  }

  async function broadcastGuidelines() {
    if (!confirm('This will send a notification to ALL team members to review the updated guidelines. Continue?')) return
    await fetch('/api/settings/broadcast-guidelines', { method: 'POST' })
    alert('Guidelines broadcast sent to all team members.')
  }

  async function exportData(type: string) {
    setExporting(type)
    try {
      const res = await fetch(`/api/${type}`)
      const data = await res.json()
      const items = data[type] || data.data || []
      downloadCSV(items, `${type}-export`)
    } catch {
      alert(`Failed to export ${type}`)
    }
    setExporting(null)
  }

  async function runBackup() {
    if (!confirm('Run a manual backup now?')) return
    try {
      await fetch('/api/cron/backup', { method: 'POST' })
      alert('Backup completed successfully.')
    } catch {
      alert('Backup failed.')
    }
  }

  async function deleteAllData() {
    const confirmation = prompt('Type DELETE to permanently erase all data. This cannot be undone.')
    if (confirmation !== 'DELETE') return
    alert('Contact support to complete this action.')
  }

  function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return { headers: [], rows: [] }

    // Parse a CSV line, handling quoted fields with commas inside
    function parseLine(line: string): string[] {
      const fields: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            current += '"'
            i++
          } else if (ch === '"') {
            inQuotes = false
          } else {
            current += ch
          }
        } else {
          if (ch === '"') {
            inQuotes = true
          } else if (ch === ',') {
            fields.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
      }
      fields.push(current.trim())
      return fields
    }

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }
    return { headers, rows }
  }

  function handleCSVFile(file: File) {
    setCsvError(null)
    setImportResult(null)
    setCsvFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)

      if (rows.length === 0) {
        setCsvError('CSV file is empty or has no data rows.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }

      // Check required columns
      if (!headers.includes('name')) {
        setCsvError('Missing required column: "name". Your CSV must have a "name" column header.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }
      if (!headers.includes('phone')) {
        setCsvError('Missing required column: "phone". Your CSV must have a "phone" column header.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }

      // Filter to only recognized columns
      const recognized = ['name', 'phone', 'email', 'address', 'source', 'notes', 'status']
      const displayHeaders = headers.filter((h) => recognized.includes(h))

      setCsvHeaders(displayHeaders)
      setCsvParsed(rows)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const template = 'name,phone,email,address,source,notes,status\nJane Doe,555-123-4567,jane@email.com,"123 Main St, Apt 4",referral,Great client,active\nJohn Smith,555-987-6543,,,website,,\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importClients() {
    if (csvParsed.length === 0) return
    setImporting(true)
    setImportResult(null)
    setCsvError(null)

    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: csvParsed }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult(data)
        if (data.imported > 0) {
          // Clear parsed data on success
          setCsvParsed([])
          setCsvHeaders([])
          setCsvFile(null)
        }
      } else {
        setCsvError(data.error || 'Import failed.')
      }
    } catch {
      setCsvError('Network error. Please try again.')
    }
    setImporting(false)
  }

  function resetImport() {
    setCsvFile(null)
    setCsvParsed([])
    setCsvHeaders([])
    setCsvError(null)
    setImportResult(null)
  }

  if (!tenant) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>

      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? 'border-white text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Business' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-4 max-w-2xl">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Global Timezone</label>
            <p className="text-xs text-slate-400 mb-2">All scheduling, reminders, and cron jobs use this timezone</p>
            <select value={form.timezone || 'America/New_York'} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="America/New_York">America/New_York (Eastern)</option>
              <option value="America/Chicago">America/Chicago (Central)</option>
              <option value="America/Denver">America/Denver (Mountain)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
              <option value="America/Anchorage">America/Anchorage (Alaska)</option>
              <option value="Pacific/Honolulu">Pacific/Honolulu (Hawaii)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Business Name</label>
            <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Phone</label>
              <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Email</label>
              <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Address</label>
            <AddressAutocomplete value={form.address || ''} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, City, State" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Industry</label>
              <select value={form.industry || 'cleaning'} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="cleaning">Cleaning / Maid Service</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="landscaping">Landscaping / Lawn Care</option>
                <option value="pest_control">Pest Control</option>
                <option value="handyman">Handyman</option>
                <option value="pressure_washing">Pressure Washing</option>
                <option value="window_cleaning">Window Cleaning</option>
                <option value="junk_removal">Junk Removal</option>
                <option value="roofing">Roofing</option>
                <option value="painting">Painting</option>
                <option value="carpet_cleaning">Carpet / Upholstery Cleaning</option>
                <option value="pool_service">Pool Service</option>
                <option value="locksmith">Locksmith</option>
                <option value="appliance_repair">Appliance Repair</option>
                <option value="tree_service">Tree Service</option>
                <option value="moving">Moving / Hauling</option>
                <option value="flooring">Flooring</option>
                <option value="fencing">Fencing</option>
                <option value="concrete">Concrete / Masonry</option>
                <option value="garage_door">Garage Door</option>
                <option value="chimney">Chimney Sweep</option>
                <option value="septic">Septic / Drain</option>
                <option value="solar">Solar</option>
                <option value="home_security">Home Security</option>
                <option value="snow_removal">Snow Removal</option>
                <option value="restoration">Restoration (Water/Fire/Mold)</option>
                <option value="remodeling">Remodeling / General Contractor</option>
                <option value="irrigation">Irrigation / Sprinklers</option>
                <option value="decks">Decks / Hardscaping</option>
                <option value="insulation">Insulation / Waterproofing</option>
                <option value="wildlife_removal">Wildlife / Animal Removal</option>
                <option value="home_inspection">Home Inspection</option>
                <option value="smart_home">Smart Home / AV</option>
                <option value="multi_service">Home Service Company (Multi-Service)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Zip Code</label>
              <input value={form.zip_code || ''} onChange={(e) => setForm({ ...form, zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="60614" maxLength={5} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Team Size</label>
              <select value={form.team_size || 'solo'} onChange={(e) => setForm({ ...form, team_size: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="solo">Just Me</option>
                <option value="2-5">2-5</option>
                <option value="6+">6+</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Business Hours</label>
              <input value={form.business_hours || ''} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} placeholder="e.g. Mon-Fri 8am-6pm" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'Services' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">{services.length} service types</p>
            <button onClick={() => setAddingService(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
              + Add Service
            </button>
          </div>

          {addingService && (
            <form onSubmit={addService} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <input placeholder="Service Name *" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Duration (hours)" type="number" step="0.5" value={newService.default_duration_hours} onChange={(e) => setNewService({ ...newService, default_duration_hours: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Hourly Rate ($)" type="number" value={newService.default_hourly_rate} onChange={(e) => setNewService({ ...newService, default_hourly_rate: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-cta font-semibold">Save</button>
                <button type="button" onClick={() => setAddingService(false)} className="text-sm text-slate-400">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-lg p-4">
                {editingServiceId === s.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Service Name</label>
                      <input value={editServiceForm.name} onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Duration (hours)</label>
                        <input type="number" step="0.5" value={editServiceForm.default_duration_hours} onChange={(e) => setEditServiceForm({ ...editServiceForm, default_duration_hours: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hourly Rate ($)</label>
                        <input type="number" value={editServiceForm.default_hourly_rate} onChange={(e) => setEditServiceForm({ ...editServiceForm, default_hourly_rate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEditService(s.id)} disabled={savingService} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-cta font-semibold disabled:opacity-50">
                        {savingService ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingServiceId(null)} className="text-sm text-slate-400 hover:text-slate-900">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${s.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{s.name}</p>
                      <p className="text-xs text-slate-400">{s.default_duration_hours}hr &middot; ${s.default_hourly_rate}/hr</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEditService(s)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                      <button
                        onClick={() => toggleService(s.id, !s.active)}
                        className={`text-xs px-2 py-1 rounded ${s.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => deleteService(s.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Scheduling' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Business Hours Start</label>
              <select
                value={form.business_hours_start || '08:00'}
                onChange={(e) => setForm({ ...form, business_hours_start: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {BUSINESS_HOURS_START_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Business Hours End</label>
              <select
                value={form.business_hours_end || '18:00'}
                onChange={(e) => setForm({ ...form, business_hours_end: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {BUSINESS_HOURS_END_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Default Job Duration (hours)</label>
              <select
                value={form.default_duration_hours ?? '3'}
                onChange={(e) => setForm({ ...form, default_duration_hours: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Booking Buffer (minutes)</label>
              <select
                value={form.booking_buffer_minutes ?? '30'}
                onChange={(e) => setForm({ ...form, booking_buffer_minutes: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {[0, 15, 30, 45, 60, 90, 120].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Min time between bookings</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Minimum Days Ahead</label>
              <select
                value={form.min_days_ahead ?? '1'}
                onChange={(e) => setForm({ ...form, min_days_ahead: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>0 (same day)</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={7}>7</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Allow Same-Day Bookings</label>
              <button
                onClick={() => setForm({ ...form, allow_same_day: !form.allow_same_day })}
                className={`mt-1 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.allow_same_day ? 'bg-green-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.allow_same_day ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <p className="text-xs text-slate-400 mt-1">{form.allow_same_day ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-2">Payment Methods Accepted</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHOD_OPTIONS.map((pm) => (
                <label key={pm.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form.payment_methods || []).includes(pm.value)}
                    onChange={() => togglePaymentMethod(pm.value)}
                    className="rounded border-slate-200 bg-slate-50 text-green-500 focus:ring-green-500"
                  />
                  {pm.label}
                </label>
              ))}
            </div>
          </div>
          {(form.payment_methods || []).includes('zelle') || (form.payment_methods || []).includes('apple_pay') ? (
            <div className="grid grid-cols-2 gap-4">
              {(form.payment_methods || []).includes('zelle') && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Zelle Email</label>
                  <input
                    value={form.zelle_email || ''}
                    onChange={(e) => setForm({ ...form, zelle_email: e.target.value })}
                    placeholder="payments@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {(form.payment_methods || []).includes('apple_pay') && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Apple Cash Phone</label>
                  <input
                    value={form.apple_cash_phone || ''}
                    onChange={(e) => setForm({ ...form, apple_cash_phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          ) : null}
          <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Scheduling'}
          </button>
        </div>
      )}

      {tab === 'Referrals & Policies' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Referral Program</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.commission_rate ?? ''}
                  onChange={(e) => setForm({ ...form, commission_rate: e.target.value ? Number(e.target.value) : null })}
                  placeholder="10"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Referrers earn this % of each booking</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Attribution Window (hours)</label>
                <select
                  value={form.attribution_window_hours ?? '72'}
                  onChange={(e) => setForm({ ...form, attribution_window_hours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                  <option value={168}>168 hours (1 week)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">How long a referral link stays active</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Client Lifecycle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Active Client Threshold (days)</label>
                <input
                  type="number"
                  value={form.active_client_threshold_days ?? 45}
                  onChange={(e) => setForm({ ...form, active_client_threshold_days: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Clients without bookings in this many days become &quot;At Risk&quot;</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">At-Risk Threshold (days)</label>
                <input
                  type="number"
                  value={form.at_risk_threshold_days ?? 90}
                  onChange={(e) => setForm({ ...form, at_risk_threshold_days: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">At-risk clients without bookings become &quot;Churned&quot;</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Cancellation &amp; Rescheduling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Reschedule Notice (days)</label>
                <input
                  type="number"
                  value={form.reschedule_notice_days ?? 7}
                  onChange={(e) => setForm({ ...form, reschedule_notice_days: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Min notice required for recurring rescheduling</p>
              </div>
            </div>
          </div>
          <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Policies'}
          </button>
        </div>
      )}

      {tab === 'Integrations' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-5 max-w-2xl">
          <p className="text-xs text-slate-400">Integrations are managed by the platform admin. Contact support to make changes.</p>
          {[
            { label: 'Email (Resend)', connected: !!tenant.resend_api_key, detail: tenant.email_from || tenant.resend_domain || null },
            { label: 'SMS (Telnyx)', connected: !!(tenant.telnyx_api_key && tenant.telnyx_phone), detail: tenant.telnyx_phone || null },
            { label: 'Payments (Stripe)', connected: !!tenant.stripe_account_id, detail: tenant.stripe_account_id ? `Connected` : null },
            { label: 'Google Business', connected: !!tenant.google_place_id, detail: tenant.google_place_id ? `Place ID configured` : null },
          ].map((svc) => (
            <div key={svc.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{svc.label}</p>
                {svc.detail && <p className="text-xs text-slate-400 mt-0.5 font-mono">{svc.detail}</p>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                svc.connected ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {svc.connected ? 'Connected' : 'Not configured'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Branding' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.primary_color || '#000000'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-10 rounded border border-slate-200 cursor-pointer" />
                <input value={form.primary_color || ''} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.secondary_color || '#666666'} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="h-10 w-10 rounded border border-slate-200 cursor-pointer" />
                <input value={form.secondary_color || ''} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Logo URL</label>
            <input value={form.logo_url || ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Tagline</label>
            <input value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Website URL</label>
            <input value={form.website_url || ''} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          {form.primary_color && (
            <div className="p-4 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-400 mb-2">Preview</p>
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.primary_color }} />
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.secondary_color || '#666' }} />
                <span className="font-bold" style={{ color: form.primary_color }}>{form.name}</span>
              </div>
            </div>
          )}
          <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Branding'}
          </button>
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="max-w-2xl">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Notification Preferences</h3>
            <p className="text-xs text-slate-400 mb-4">Choose which notifications you receive and how.</p>
            <div className="space-y-3">
              {[
                { key: 'booking_reminder', label: 'Booking Reminders', desc: 'Reminders before appointments' },
                { key: 'booking_confirmed', label: 'Booking Confirmed', desc: 'When a booking is confirmed' },
                { key: 'payment_received', label: 'Payment Received', desc: 'When a payment comes in' },
                { key: 'new_review', label: 'New Review', desc: 'When a client leaves a review' },
                { key: 'new_referral', label: 'New Referral', desc: 'When a referral converts' },
                { key: 'daily_summary', label: 'Daily Summary', desc: 'Morning recap of your day' },
                { key: 'follow_up', label: 'Follow-up Sent', desc: 'Post-service thank you messages' },
                { key: 'team_checkin', label: 'Team Check-in', desc: 'When team members check in to jobs' },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                  <div>
                    <p className="text-sm text-slate-900">{pref.label}</p>
                    <p className="text-xs text-slate-400">{pref.desc}</p>
                  </div>
                  <div className="flex gap-3">
                    {['email', 'sms', 'in_app'].map(channel => (
                      <label key={channel} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={notifPrefs[pref.key]?.[channel] ?? (channel === 'in_app')}
                          onChange={(e) => {
                            const updated = {
                              ...notifPrefs,
                              [pref.key]: {
                                ...notifPrefs[pref.key],
                                [channel]: e.target.checked,
                              },
                            }
                            setNotifPrefs(updated)
                            fetch('/api/settings/notifications', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ preferences: updated }),
                            })
                          }}
                          className="rounded border-slate-200 bg-slate-50"
                        />
                        {channel === 'in_app' ? 'App' : channel.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Guidelines' && (
        <div className="max-w-3xl space-y-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Team Member Guidelines</h3>
            <p className="text-sm text-slate-400 mb-6">Bilingual guidelines shown to team members on their dashboard. Displayed as a popup they must review.</p>

            <div className="space-y-6">
              <div>
                <label className="text-xs text-slate-400 uppercase block mb-2">English</label>
                <textarea
                  rows={12}
                  value={form.guidelines_en || ''}
                  onChange={(e) => setForm({ ...form, guidelines_en: e.target.value })}
                  placeholder={"1. CHECK YOUR SCHEDULE DAILY\n\u2014 Log into your portal every morning\n\u2014 Review all assigned jobs for the day\n\u2014 Confirm arrival times\n\n2. PROFESSIONALISM\n\u2014 Arrive on time\n\u2014 Wear company uniform\n\u2014 Be courteous and respectful"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase block mb-2">
                  Spanish / Espa&ntilde;ol <span className="normal-case text-slate-500">(auto-translated on save)</span>
                </label>
                <textarea
                  rows={12}
                  value={form.guidelines_es || ''}
                  onChange={(e) => setForm({ ...form, guidelines_es: e.target.value })}
                  placeholder={"1. REVISA TU HORARIO DIARIAMENTE\n\u2014 Inicia sesi\u00f3n en tu portal cada ma\u00f1ana\n\u2014 Revisa todos los trabajos asignados para el d\u00eda\n\u2014 Confirma las horas de llegada"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Guidelines'}
              </button>
              <button
                onClick={broadcastGuidelines}
                className="border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors"
              >
                Broadcast to All Team Members
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Tools' && (
        <div className="max-w-2xl space-y-4">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Data Export</h3>
            <p className="text-sm text-slate-400 mb-4">Download your data as CSV files.</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { key: 'clients', label: 'Export Clients' },
                { key: 'bookings', label: 'Export Bookings' },
                { key: 'team', label: 'Export Team' },
                { key: 'finance', label: 'Export Revenue' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => exportData(item.key)}
                  disabled={exporting === item.key}
                  className="bg-slate-50 border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {exporting === item.key ? 'Exporting...' : item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Import Clients from CSV</h3>

            {/* Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 font-medium mb-2">How to format your CSV file:</p>
              <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                <li>The first row must be column headers</li>
                <li><span className="text-slate-900 font-medium">Required columns:</span> name, phone</li>
                <li><span className="text-slate-300">Optional columns:</span> email, address, source, notes, status</li>
                <li>Status values: active, lead, at_risk, churned, inactive (defaults to &quot;active&quot;)</li>
                <li>Phone formats accepted: 555-123-4567, (555) 123-4567, +15551234567</li>
                <li>If a field contains commas, wrap it in double quotes (e.g. &quot;123 Main St, Apt 4&quot;)</li>
                <li>Maximum 500 clients per import</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Download sample CSV template
              </button>
            </div>

            {/* File upload */}
            {!csvFile && !importResult && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  id="csv-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCSVFile(file)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-slate-400 mb-2">
                    <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Click to select a <span className="text-slate-900 font-medium">.csv</span> file</p>
                  <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                </label>
              </div>
            )}

            {/* CSV Parse Error */}
            {csvError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-400">{csvError}</p>
              </div>
            )}

            {/* Preview Table */}
            {csvParsed.length > 0 && !importResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-700">
                    Preview: showing {Math.min(5, csvParsed.length)} of <span className="text-slate-900 font-medium">{csvParsed.length}</span> rows
                  </p>
                  <button onClick={resetImport} className="text-xs text-slate-400 hover:text-slate-300">
                    Clear
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 text-xs text-slate-400 font-medium">#</th>
                        {csvHeaders.map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-xs text-slate-400 font-medium uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {csvParsed.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          {csvHeaders.map((h) => (
                            <td key={h} className={`px-3 py-2 ${row[h] ? 'text-slate-300' : 'text-slate-500'}`}>
                              {row[h] || '\u2014'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvParsed.length > 5 && (
                  <p className="text-xs text-slate-400 mt-2">...and {csvParsed.length - 5} more rows</p>
                )}

                {/* Import button */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={importClients}
                    disabled={importing}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 hover:bg-teal-700 transition-colors"
                  >
                    {importing ? 'Importing...' : `Import ${csvParsed.length} Client${csvParsed.length === 1 ? '' : 's'}`}
                  </button>
                  <button onClick={resetImport} className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="mt-4 space-y-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400 font-medium">
                    Import complete: {importResult.imported} client{importResult.imported === 1 ? '' : 's'} imported
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm text-yellow-400 mt-1">
                      {importResult.skipped} row{importResult.skipped === 1 ? '' : 's'} skipped
                    </p>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm text-red-400 font-medium mb-2">Errors ({importResult.errors.length}):</p>
                    <ul className="text-xs text-red-400/80 space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={resetImport} className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
                  Import another file
                </button>
              </div>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Daily Backup</h3>
            <p className="text-sm text-slate-400 mb-4">Automated daily backups run at midnight. Last backup data is emailed to your business email.</p>
            <button
              onClick={runBackup}
              className="bg-slate-50 border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors"
            >
              Run Backup Now
            </button>
          </div>
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">Irreversible actions.</p>
            <button
              onClick={deleteAllData}
              className="text-red-400 border border-red-400/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-400/10 transition-colors"
            >
              Delete All Data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
