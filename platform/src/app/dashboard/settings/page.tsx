'use client'

import { useEffect, useState } from 'react'
import { formatPhone } from '@/lib/phone'
import { downloadCSV } from '@/lib/csv'
import AddressAutocomplete from '@/components/address-autocomplete'
import ServiceAreaEditor from '@/components/ServiceAreaEditor'
import PermissionsTab from './PermissionsTab'
import CommunicationsTab from './CommunicationsTab'

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
  stripe_api_key: string | null
  stripe_account_id: string | null
  google_place_id: string | null
  imap_host: string | null
  imap_port: number | null
  imap_user: string | null
  imap_pass: string | null
  anthropic_api_key: string | null
  indexnow_key: string | null

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

  // Selena AI config
  selena_config: Record<string, unknown> | null

  // Agent / bot name — single source of truth read by both agent brains
  agent_name: string | null
}

type PricingModel = 'hourly' | 'flat' | 'quote' | 'sqft_tiered'

// Mirrors src/lib/sqft-pricing.ts SqftTier — ascending by max_sqft, a
// trailing {max_sqft: null} tier is the uncapped catch-all.
type SqftTier = { max_sqft: number | null; price_cents: number }

type ServiceType = {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
  pricing_model: PricingModel | null
  price_cents: number | null
  per_unit: string | null
  min_charge_cents: number | null
  sqft_tiers: SqftTier[] | null
  sort_order: number
  active: boolean
}

// Client-side row shape for editing sqft tiers — raw <input> string values.
// Leave max_sqft blank on the last row to make it the uncapped catch-all tier.
type SqftTierRow = { max_sqft: string; price: string }

// Client-side form shape — all values are strings (raw <input> values).
type ServiceFormState = {
  name: string
  pricing_model: PricingModel
  default_duration_hours: string
  default_hourly_rate: string
  price: string
  min_charge: string
  sqft_tiers: SqftTierRow[]
}

const EMPTY_SQFT_TIER_ROW: SqftTierRow = { max_sqft: '', price: '' }

const EMPTY_SERVICE_FORM: ServiceFormState = {
  name: '', pricing_model: 'hourly', default_duration_hours: '3',
  default_hourly_rate: '49', price: '', min_charge: '',
  sqft_tiers: [{ max_sqft: '5000', price: '' }, EMPTY_SQFT_TIER_ROW],
}

const PRICING_MODELS: { value: PricingModel; label: string }[] = [
  { value: 'hourly', label: 'Hourly (duration × rate)' },
  { value: 'flat', label: 'Flat price' },
  { value: 'sqft_tiered', label: 'By lot size (sqft tiers)' },
  { value: 'quote', label: 'By quote (priced per job)' },
]

// SqftTierRow[] (form) → SqftTier[] (API). Blank rows are dropped; a row with
// no max_sqft becomes the uncapped catch-all — only valid as the last row,
// enforced server-side by validateSqftTiers.
function tierRowsToApi(rows: SqftTierRow[]): SqftTier[] {
  return rows
    .filter((r) => r.price.trim() !== '')
    .map((r) => ({
      max_sqft: r.max_sqft.trim() === '' ? null : Math.round(Number(r.max_sqft)),
      price_cents: Math.round(Number(r.price) * 100),
    }))
}

function tiersToFormRows(tiers: SqftTier[] | null | undefined): SqftTierRow[] {
  if (!tiers || tiers.length === 0) return [{ max_sqft: '5000', price: '' }, EMPTY_SQFT_TIER_ROW]
  return tiers.map((t) => ({ max_sqft: t.max_sqft == null ? '' : String(t.max_sqft), price: String(t.price_cents / 100) }))
}

// Build the API payload from a form. Non-hourly models still send safe
// duration/rate defaults so a NOT NULL column can never blow up the insert;
// dollar inputs are converted to *_cents.
function buildServicePayload(f: ServiceFormState) {
  const model: PricingModel = f.pricing_model || 'hourly'
  return {
    name: f.name,
    pricing_model: model,
    default_duration_hours: model === 'hourly' ? Number(f.default_duration_hours) || 1 : 1,
    default_hourly_rate: model === 'hourly' ? Number(f.default_hourly_rate) || 0 : 0,
    // Only 'flat' carries a fixed price; 'quote' is priced per deal;
    // 'sqft_tiered' carries its price in sqft_tiers instead. per_unit must be
    // one of the DB enum values (hour/job/…) and is NOT NULL.
    price_cents: model === 'flat' ? Math.round(Number(f.price || 0) * 100) : null,
    per_unit: model === 'hourly' ? 'hour' : model === 'sqft_tiered' ? 'sqft' : 'job',
    min_charge_cents: f.min_charge ? Math.round(Number(f.min_charge) * 100) : null,
    sqft_tiers: model === 'sqft_tiered' ? tierRowsToApi(f.sqft_tiers) : null,
  }
}

// Human summary of a service's price for the list row.
function formatServicePrice(s: ServiceType): string {
  const model = s.pricing_model || 'hourly'
  const min = s.min_charge_cents ? ` (min $${(s.min_charge_cents / 100).toFixed(0)})` : ''
  if (model === 'flat') return `$${((s.price_cents || 0) / 100).toFixed(0)} flat${min}`
  if (model === 'quote') return `By quote${min}`
  if (model === 'sqft_tiered') {
    const tiers = s.sqft_tiers || []
    if (tiers.length === 0) return `By lot size (no tiers set)${min}`
    const prices = tiers.map((t) => t.price_cents / 100)
    const lo = Math.min(...prices), hi = Math.max(...prices)
    return `$${lo.toFixed(0)}–$${hi.toFixed(0)} by lot size (${tiers.length} tier${tiers.length === 1 ? '' : 's'})${min}`
  }
  return `${s.default_duration_hours}hr · $${s.default_hourly_rate}/hr${min}`
}

const INPUT_CLS = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm'

// Ordered list of {up to N sqft: $price} rows. Rows are entered smallest lot
// size first; leave the LAST row's "up to" blank to make it the uncapped
// catch-all tier for anything bigger (server enforces this ordering too).
function SqftTierEditor({ rows, set }: { rows: SqftTierRow[]; set: (rows: SqftTierRow[]) => void }) {
  function updateRow(i: number, patch: Partial<SqftTierRow>) {
    set(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    set(rows.filter((_, idx) => idx !== i))
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Price by lot size. Leave the last row&apos;s &quot;up to&quot; blank for anything larger.</p>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input
            placeholder={i === rows.length - 1 ? 'Up to (sqft) — blank = no limit' : 'Up to (sqft)'}
            type="number" min="1" value={row.max_sqft}
            onChange={(e) => updateRow(i, { max_sqft: e.target.value })}
            className={INPUT_CLS}
          />
          <input
            placeholder="Price ($)" type="number" min="0" value={row.price}
            onChange={(e) => updateRow(i, { price: e.target.value })}
            className={INPUT_CLS}
          />
          <button type="button" onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500 px-2" aria-label="Remove tier">✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...rows, { ...EMPTY_SQFT_TIER_ROW }])}
        className="text-xs text-blue-600 hover:underline"
      >
        + Add tier
      </button>
    </div>
  )
}

// Shared pricing-model editor used by both the add and edit forms.
function PricingFields({ f, set }: { f: ServiceFormState; set: (patch: Partial<ServiceFormState>) => void }) {
  return (
    <>
      <select value={f.pricing_model} onChange={(e) => set({ pricing_model: e.target.value as PricingModel })} className={INPUT_CLS}>
        {PRICING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      {f.pricing_model === 'hourly' && (
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Duration (hours)" type="number" step="0.5" value={f.default_duration_hours} onChange={(e) => set({ default_duration_hours: e.target.value })} className={INPUT_CLS} />
          <input placeholder="Hourly Rate ($)" type="number" value={f.default_hourly_rate} onChange={(e) => set({ default_hourly_rate: e.target.value })} className={INPUT_CLS} />
        </div>
      )}
      {f.pricing_model === 'flat' && (
        <input placeholder="Flat Price ($)" type="number" value={f.price} onChange={(e) => set({ price: e.target.value })} className={INPUT_CLS} />
      )}
      {f.pricing_model === 'quote' && (
        <p className="text-xs text-slate-400">Priced per job — set the amount on each quote or deal.</p>
      )}
      {f.pricing_model === 'sqft_tiered' && (
        <SqftTierEditor rows={f.sqft_tiers} set={(rows) => set({ sqft_tiers: rows })} />
      )}
      {f.pricing_model !== 'hourly' && (
        <input placeholder="Minimum charge ($) — optional" type="number" value={f.min_charge} onChange={(e) => set({ min_charge: e.target.value })} className={INPUT_CLS} />
      )}
    </>
  )
}

const TABS = ['Business', 'Service Area', 'Services', 'Sales', 'Scheduling', 'Referrals & Policies', 'Permissions', 'Integrations', 'Branding', 'Communications', 'Guidelines', 'Selena', 'Tools'] as const
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
  const [newService, setNewService] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [addingService, setAddingService] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editServiceForm, setEditServiceForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [savingService, setSavingService] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [selenaConfig, setSelenaConfig] = useState<Record<string, unknown>>({})

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
      .then((data) => { setTenant(data.tenant); setForm(data.tenant); if (data.tenant?.selena_config) setSelenaConfig(data.tenant.selena_config) })
    fetch('/api/settings/services')
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
  }, [])

  async function saveTenant() {
    setSaving(true)
    // Never resend selena_config here -- this tab never edits it, but `form` was
    // seeded from the full tenant row at page load and never refreshed after a
    // saveSelenaConfig() call, so including it would silently overwrite the live
    // selena_config (role/portal permission overrides, SELENA persona, etc.) back
    // to its page-load snapshot on every unrelated general-tab save.
    const { selena_config: _staleSelenaConfig, ...tenantFields } = form
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantFields),
    })
    if (res.ok) {
      const { tenant: updated } = await res.json()
      setTenant(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function saveSelenaConfig() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selena_config: selenaConfig }),
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
      body: JSON.stringify(buildServicePayload(newService)),
    })
    if (res.ok) {
      const { service } = await res.json()
      setServices((prev) => [...prev, service])
      setNewService(EMPTY_SERVICE_FORM)
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
      pricing_model: s.pricing_model || 'hourly',
      default_duration_hours: String(s.default_duration_hours ?? ''),
      default_hourly_rate: String(s.default_hourly_rate ?? ''),
      price: s.price_cents != null ? String(s.price_cents / 100) : '',
      min_charge: s.min_charge_cents != null ? String(s.min_charge_cents / 100) : '',
      sqft_tiers: tiersToFormRows(s.sqft_tiers),
    })
  }

  async function saveEditService(id: string) {
    setSavingService(true)
    const res = await fetch(`/api/settings/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildServicePayload(editServiceForm)),
    })
    if (res.ok) {
      const { service } = await res.json()
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...service } : s)))
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

      {tab === 'Service Area' && (
        <div className="border border-slate-200 rounded-lg p-6 max-w-2xl">
          <p className="text-xs text-slate-400 mb-4">
            Sets your team-page coverage map. Local = one metro with zones; National = the states you serve.
            The map shows where your team lives so you can see where to recruit.
          </p>
          <ServiceAreaEditor />
        </div>
      )}

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
              <PricingFields f={newService} set={(p) => setNewService({ ...newService, ...p })} />
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
                    <PricingFields f={editServiceForm} set={(p) => setEditServiceForm({ ...editServiceForm, ...p })} />
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
                      <p className="text-xs text-slate-400">{formatServicePrice(s)}</p>
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

      {tab === 'Sales' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Proposal Defaults</h3>
            <p className="text-xs text-slate-400 mb-4">New proposals in the builder start with these. You can still change any of them per proposal.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Default Tax Rate (%)</label>
                <input
                  type="number" min={0} step="0.001"
                  value={(selenaConfig.tax_rate as number) ?? ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, tax_rate: e.target.value ? Number(e.target.value) : 0 })}
                  placeholder="8.875"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Applied to taxable line items.</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Valid For (days)</label>
                <input
                  type="number" min={1}
                  value={(selenaConfig.proposal_valid_days as number) ?? 30}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, proposal_valid_days: e.target.value ? Number(e.target.value) : 30 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">How long a proposal stays acceptable.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Default Deposit</label>
            <div className="flex gap-2">
              <select
                value={(selenaConfig.proposal_deposit_type as string) || 'none'}
                onChange={(e) => setSelenaConfig({ ...selenaConfig, proposal_deposit_type: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="none">No deposit</option>
                <option value="percent">% of total</option>
                <option value="flat">Flat $</option>
              </select>
              {((selenaConfig.proposal_deposit_type as string) || 'none') !== 'none' && (
                <input
                  type="number" min={0}
                  value={(selenaConfig.proposal_deposit_value as number) ?? ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, proposal_deposit_value: e.target.value ? Number(e.target.value) : 0 })}
                  placeholder={(selenaConfig.proposal_deposit_type as string) === 'percent' ? '25' : '500'}
                  className="w-40 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Prefills the deposit control on new proposals (% of total, or a flat dollar amount).</p>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Default Terms &amp; Conditions</label>
            <textarea
              rows={4}
              value={(selenaConfig.proposal_terms as string) || ''}
              onChange={(e) => setSelenaConfig({ ...selenaConfig, proposal_terms: e.target.value })}
              placeholder="Payment terms, warranty, cancellation policy, etc. — appears on every new proposal."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button onClick={saveSelenaConfig} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Proposal Defaults'}
          </button>
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

      {tab === 'Permissions' && <PermissionsTab />}

      {tab === 'Integrations' && (
        <div className="border border-slate-200 rounded-lg p-6 space-y-6 max-w-2xl">
          <p className="text-xs text-slate-400">Connect your accounts to enable email, SMS, payments, and reviews. Sign up with each provider and paste your keys below.</p>

          {/* Email — Resend */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Email (Resend)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.resend_api_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.resend_api_key ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sign up at resend.com and create an API key.</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">API Key</label>
              <input value={form.resend_api_key || ''} onChange={(e) => setForm({ ...form, resend_api_key: e.target.value || null })} placeholder="re_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Sending Domain</label>
                <input value={form.resend_domain || ''} onChange={(e) => setForm({ ...form, resend_domain: e.target.value || null })} placeholder="mail.yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">From Address</label>
                <input value={form.email_from || ''} onChange={(e) => setForm({ ...form, email_from: e.target.value || null })} placeholder="noreply@yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* SMS — Telnyx */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">SMS (Telnyx)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.telnyx_api_key && form.telnyx_phone ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.telnyx_api_key && form.telnyx_phone ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sign up at telnyx.com, create an API key, and purchase a phone number.</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">API Key</label>
              <input value={form.telnyx_api_key || ''} onChange={(e) => setForm({ ...form, telnyx_api_key: e.target.value || null })} placeholder="KEY_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Phone Number</label>
              <input value={form.telnyx_phone || ''} onChange={(e) => setForm({ ...form, telnyx_phone: e.target.value || null })} placeholder="+12125551234" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* Payments — Stripe */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Payments (Stripe)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.stripe_api_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.stripe_api_key ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sign up at stripe.com and copy your Secret Key from the Developers section.</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Secret Key</label>
              <input value={form.stripe_api_key || ''} onChange={(e) => setForm({ ...form, stripe_api_key: e.target.value || null })} placeholder="sk_live_xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* Google Business */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Google Business</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.google_place_id ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.google_place_id ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Place ID</label>
              <input value={form.google_place_id || ''} onChange={(e) => setForm({ ...form, google_place_id: e.target.value || null })} placeholder="ChIJxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* IMAP — ComHub inbound client email */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Inbound Email (IMAP)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.imap_host && form.imap_user && form.imap_pass ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.imap_host && form.imap_user && form.imap_pass ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Connect your business inbox — client emails flow into ComHub as threads and Yinez can auto-reply. Use an app password (e.g. imap.gmail.com).</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400 block mb-1">IMAP Host</label>
                <input value={form.imap_host || ''} onChange={(e) => setForm({ ...form, imap_host: e.target.value || null })} placeholder="imap.gmail.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Port</label>
                <input type="number" value={form.imap_port ?? ''} onChange={(e) => setForm({ ...form, imap_port: e.target.value === '' ? null : Number(e.target.value) })} placeholder="993" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Email / Username</label>
                <input value={form.imap_user || ''} onChange={(e) => setForm({ ...form, imap_user: e.target.value || null })} placeholder="hi@yourbusiness.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">App Password</label>
                <input type="password" value={form.imap_pass || ''} onChange={(e) => setForm({ ...form, imap_pass: e.target.value || null })} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
            </div>
          </div>

          {/* Anthropic — Selena AI brain */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Selena AI (Anthropic)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.anthropic_api_key ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {form.anthropic_api_key ? 'Using your key' : 'Using platform key'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sign up at console.anthropic.com, generate a key. Leave blank to use the platform-billed key (charges roll into your monthly rate).</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Anthropic API Key</label>
              <input type="password" value={form.anthropic_api_key || ''} onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value || null })} placeholder="sk-ant-xxxx" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* IndexNow — SEO instant indexing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">SEO (IndexNow)</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded ${form.indexnow_key ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.indexnow_key ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Generate a 32-char hex key at indexnow.org. Lets Bing/Yahoo/DuckDuckGo instantly index new content.</p>
            <div>
              <label className="text-sm text-slate-400 block mb-1">IndexNow Key</label>
              <input value={form.indexnow_key || ''} onChange={(e) => setForm({ ...form, indexnow_key: e.target.value || null })} placeholder="32-char hex key" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          <button onClick={saveTenant} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Integrations'}
          </button>
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

      {tab === 'Communications' && <CommunicationsTab />}

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

      {tab === 'Selena' && (
        <div className="max-w-2xl space-y-6">

          {/* Section 1: General */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">General</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">AI Enabled</label>
                <button
                  type="button"
                  onClick={() => setSelenaConfig({ ...selenaConfig, ai_enabled: !selenaConfig.ai_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.ai_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.ai_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Bot Name</label>
                <input
                  type="text"
                  value={form.agent_name || ''}
                  placeholder="Jefe"
                  onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Tone</label>
                <select
                  value={(selenaConfig.tone as string) || 'warm_friendly'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, tone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="warm_friendly">Warm & friendly</option>
                  <option value="professional_direct">Professional & direct</option>
                  <option value="casual_fun">Casual & fun</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Emoji Usage</label>
                <select
                  value={(selenaConfig.emoji_usage as string) || 'one_per_message'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, emoji_usage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="one_per_message">One per message</option>
                  <option value="minimal">Minimal</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Language</label>
                <select
                  value={(selenaConfig.language as string) || 'en'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, language: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="en">English only</option>
                  <option value="en_es">Bilingual EN/ES</option>
                  <option value="es">Spanish only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Services & Pricing */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Services & Pricing</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Pricing Display</label>
                <p className="text-xs text-slate-400 mb-2">Rows of label + price that Selena can reference</p>
                {((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }]).map((row, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Client provides supplies)"
                      value={row.label}
                      onChange={(e) => {
                        const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }])]
                        rows[i] = { ...rows[i], label: e.target.value }
                        setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="$49/hr"
                      value={row.price}
                      onChange={(e) => {
                        const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [{ label: '', price: '' }])]
                        rows[i] = { ...rows[i], price: e.target.value }
                        setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                      }}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [])]
                        rows.splice(i, 1)
                        setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                      }}
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const rows = [...((selenaConfig.pricing_rows as { label: string; price: string }[]) || [])]
                    rows.push({ label: '', price: '' })
                    setSelenaConfig({ ...selenaConfig, pricing_rows: rows })
                  }}
                  className="text-teal-600 text-sm font-medium hover:text-teal-700"
                >
                  + Add Pricing Row
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Time Estimates</label>
                <p className="text-xs text-slate-400 mb-2">Size label and estimated duration</p>
                {((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }]).map((row, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="1BR/1BA"
                      value={row.size}
                      onChange={(e) => {
                        const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }])]
                        rows[i] = { ...rows[i], size: e.target.value }
                        setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="~2 hours"
                      value={row.estimate}
                      onChange={(e) => {
                        const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [{ size: '', estimate: '' }])]
                        rows[i] = { ...rows[i], estimate: e.target.value }
                        setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                      }}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [])]
                        rows.splice(i, 1)
                        setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                      }}
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const rows = [...((selenaConfig.time_estimates as { size: string; estimate: string }[]) || [])]
                    rows.push({ size: '', estimate: '' })
                    setSelenaConfig({ ...selenaConfig, time_estimates: rows })
                  }}
                  className="text-teal-600 text-sm font-medium hover:text-teal-700"
                >
                  + Add Time Estimate
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Emergency Rate ($)</label>
                <input
                  type="number"
                  value={(selenaConfig.emergency_rate as number) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, emergency_rate: Number(e.target.value) })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Emergency Available</label>
                <button
                  type="button"
                  onClick={() => setSelenaConfig({ ...selenaConfig, emergency_available: !selenaConfig.emergency_available })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.emergency_available ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.emergency_available ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Service Areas */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Service Areas</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Areas Served</label>
                <textarea
                  rows={2}
                  value={(selenaConfig.areas_served as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, areas_served: e.target.value })}
                  placeholder="Manhattan, Brooklyn, Queens"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Areas Not Served</label>
                <textarea
                  rows={2}
                  value={(selenaConfig.areas_not_served as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, areas_not_served: e.target.value })}
                  placeholder="Staten Island, Long Island"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Out-of-Area Response</label>
                <input
                  type="text"
                  value={(selenaConfig.out_of_area_response as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, out_of_area_response: e.target.value })}
                  placeholder="Sorry, we don't serve that area yet!"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Booking Rules */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Rules</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Arrival Buffer Weekday (minutes)</label>
                <input
                  type="number"
                  value={(selenaConfig.arrival_buffer_weekday as number) ?? 30}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, arrival_buffer_weekday: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Arrival Buffer Weekend (minutes)</label>
                <input
                  type="number"
                  value={(selenaConfig.arrival_buffer_weekend as number) ?? 60}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, arrival_buffer_weekend: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Minimum Booking Notice (hours)</label>
                <input
                  type="number"
                  value={(selenaConfig.min_booking_notice_hours as number) ?? 24}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, min_booking_notice_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Cancellation Policy</label>
                <select
                  value={(selenaConfig.cancellation_policy as string) || 'no_cancel_reschedule_only'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, cancellation_policy: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="no_cancel_reschedule_only">No cancellation, reschedule only</option>
                  <option value="24hr_notice">24hr notice</option>
                  <option value="48hr_notice">48hr notice</option>
                  <option value="7day_recurring">7 day notice for recurring</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Reschedule Policy</label>
                <select
                  value={(selenaConfig.reschedule_policy as string) || 'anytime'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, reschedule_policy: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="anytime">Anytime</option>
                  <option value="24hr_notice">24hr notice</option>
                  <option value="48hr_notice">48hr notice</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Payment */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Accepted Methods</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {['Zelle', 'Apple Pay', 'Venmo', 'Cash', 'Check', 'Credit Card'].map((method) => {
                    const key = method.toLowerCase().replace(/ /g, '_')
                    const methods = (selenaConfig.accepted_payment_methods as string[]) || []
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={methods.includes(key)}
                          onChange={() => {
                            const current = [...methods]
                            if (current.includes(key)) {
                              setSelenaConfig({ ...selenaConfig, accepted_payment_methods: current.filter((m) => m !== key) })
                            } else {
                              setSelenaConfig({ ...selenaConfig, accepted_payment_methods: [...current, key] })
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        {method}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Payment Timing</label>
                <select
                  value={(selenaConfig.payment_timing as string) || '15_before_completion'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, payment_timing: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="15_before_completion">15 minutes before completion</option>
                  <option value="upon_completion">Upon completion</option>
                  <option value="invoice_after">Invoice after</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Payment Instructions</label>
                <textarea
                  rows={2}
                  value={(selenaConfig.payment_instructions as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, payment_instructions: e.target.value })}
                  placeholder="Zelle to hi@business.com or Apple Pay to 2125551234"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Common Questions */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Common Questions</h3>
            <p className="text-xs text-slate-400 mb-3">Preset Q&A pairs Selena uses to answer common questions</p>
            <div className="space-y-3">
              {((selenaConfig.common_questions as { question: string; answer: string }[]) || [
                { question: 'Can I leave during the service?', answer: '' },
                { question: 'Do I need to be home?', answer: '' },
                { question: 'Same person every time?', answer: '' },
                { question: 'Are you insured?', answer: '' },
                { question: 'What supplies do you use?', answer: '' },
                { question: "What's included in the service?", answer: '' },
              ]).map((qa, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Question / trigger"
                    value={qa.question}
                    onChange={(e) => {
                      const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [
                        { question: 'Can I leave during the service?', answer: '' },
                        { question: 'Do I need to be home?', answer: '' },
                        { question: 'Same person every time?', answer: '' },
                        { question: 'Are you insured?', answer: '' },
                        { question: 'What supplies do you use?', answer: '' },
                        { question: "What's included in the service?", answer: '' },
                      ])]
                      rows[i] = { ...rows[i], question: e.target.value }
                      setSelenaConfig({ ...selenaConfig, common_questions: rows })
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Selena's response"
                    value={qa.answer}
                    onChange={(e) => {
                      const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [
                        { question: 'Can I leave during the service?', answer: '' },
                        { question: 'Do I need to be home?', answer: '' },
                        { question: 'Same person every time?', answer: '' },
                        { question: 'Are you insured?', answer: '' },
                        { question: 'What supplies do you use?', answer: '' },
                        { question: "What's included in the service?", answer: '' },
                      ])]
                      rows[i] = { ...rows[i], answer: e.target.value }
                      setSelenaConfig({ ...selenaConfig, common_questions: rows })
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [])]
                      rows.splice(i, 1)
                      setSelenaConfig({ ...selenaConfig, common_questions: rows })
                    }}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const rows = [...((selenaConfig.common_questions as { question: string; answer: string }[]) || [])]
                  rows.push({ question: '', answer: '' })
                  setSelenaConfig({ ...selenaConfig, common_questions: rows })
                }}
                className="text-teal-600 text-sm font-medium hover:text-teal-700"
              >
                + Add Question
              </button>
            </div>
          </div>

          {/* Section 7: Escalation */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Escalation</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Phone</label>
                <input
                  type="text"
                  value={(selenaConfig.escalation_phone as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_phone: e.target.value })}
                  placeholder="Who gets the escalation text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Email</label>
                <input
                  type="text"
                  value={(selenaConfig.escalation_email as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_email: e.target.value })}
                  placeholder="escalation@business.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Auto-Escalate Triggers</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {[
                    { key: 'client_upset', label: 'Client upset' },
                    { key: 'damage_reported', label: 'Damage reported' },
                    { key: 'unusual_request', label: 'Unusual request' },
                    { key: 'asks_for_human', label: 'Asks for human' },
                    { key: 'price_complaint', label: 'Price complaint' },
                  ].map((trigger) => {
                    const triggers = (selenaConfig.escalation_triggers as string[]) || []
                    return (
                      <label key={trigger.key} className="flex items-center gap-2 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={triggers.includes(trigger.key)}
                          onChange={() => {
                            const current = [...triggers]
                            if (current.includes(trigger.key)) {
                              setSelenaConfig({ ...selenaConfig, escalation_triggers: current.filter((t) => t !== trigger.key) })
                            } else {
                              setSelenaConfig({ ...selenaConfig, escalation_triggers: [...current, trigger.key] })
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        {trigger.label}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Escalation Message</label>
                <input
                  type="text"
                  value={(selenaConfig.escalation_message as string) || 'Let me have someone look at this — one sec 😊'}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, escalation_message: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 8: Post-Booking */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Post-Booking</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Confirmation Message</label>
                <p className="text-xs text-slate-400 mb-1">Variables: {'{name}'}, {'{date}'}, {'{time}'}, {'{rate}'}, {'{address}'}</p>
                <textarea
                  rows={3}
                  value={(selenaConfig.confirmation_message as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, confirmation_message: e.target.value })}
                  placeholder="Hi {name}, you're all set for {date} at {time}! See you at {address}."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Post-Job Follow-Up Enabled</label>
                <button
                  type="button"
                  onClick={() => setSelenaConfig({ ...selenaConfig, followup_enabled: !selenaConfig.followup_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.followup_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.followup_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Follow-Up Timing (hours after checkout)</label>
                <input
                  type="number"
                  value={(selenaConfig.followup_hours as number) ?? 24}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, followup_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Google Review Link</label>
                <input
                  type="text"
                  value={(selenaConfig.google_review_link as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, google_review_link: e.target.value })}
                  placeholder="https://g.page/r/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Rating Request Enabled</label>
                <button
                  type="button"
                  onClick={() => setSelenaConfig({ ...selenaConfig, rating_request_enabled: !selenaConfig.rating_request_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.rating_request_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.rating_request_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Retention Text Enabled</label>
                  <p className="text-xs text-slate-400">30-day re-engagement</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelenaConfig({ ...selenaConfig, retention_text_enabled: !selenaConfig.retention_text_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${selenaConfig.retention_text_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${selenaConfig.retention_text_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Retention Text Message</label>
                <textarea
                  rows={2}
                  value={(selenaConfig.retention_text_message as string) || ''}
                  onChange={(e) => setSelenaConfig({ ...selenaConfig, retention_text_message: e.target.value })}
                  placeholder="Hey {name}! It's been a month — ready for another clean? 🧹"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 9: Checklist Fields */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Checklist Fields</h3>
            <p className="text-xs text-slate-400 mb-4">Define what Selena collects during intake and in what order</p>
            <div className="space-y-4">
              {((selenaConfig.checklist_fields as { key: string; enabled: boolean; required: boolean; question: string; quick_replies: string }[]) || [
                { key: 'service_type', enabled: true, required: true, question: 'What type of cleaning do you need?', quick_replies: 'Regular, Deep, Move-in/out, Airbnb, Emergency' },
                { key: 'bedrooms', enabled: true, required: true, question: 'How many bedrooms?', quick_replies: '1, 2, 3, 4+' },
                { key: 'bathrooms', enabled: true, required: true, question: 'How many bathrooms?', quick_replies: '1, 2, 3, 4+' },
                { key: 'rate', enabled: true, required: false, question: '(auto from pricing)', quick_replies: '' },
                { key: 'day', enabled: true, required: true, question: 'What day works best?', quick_replies: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
                { key: 'time', enabled: true, required: true, question: 'What time?', quick_replies: '8am, 10am, 12pm, 2pm, 4pm' },
                { key: 'name', enabled: true, required: true, question: "What's your full name?", quick_replies: '' },
                { key: 'phone', enabled: true, required: true, question: 'Best phone number to reach you?', quick_replies: '' },
                { key: 'address', enabled: true, required: true, question: 'Full address with zip code?', quick_replies: '' },
                { key: 'email', enabled: true, required: false, question: 'Email address?', quick_replies: '' },
                { key: 'notes', enabled: true, required: false, question: 'Any special notes or instructions?', quick_replies: '' },
              ]).map((field, i) => {
                const defaults = [
                  { key: 'service_type', enabled: true, required: true, question: 'What type of cleaning do you need?', quick_replies: 'Regular, Deep, Move-in/out, Airbnb, Emergency' },
                  { key: 'bedrooms', enabled: true, required: true, question: 'How many bedrooms?', quick_replies: '1, 2, 3, 4+' },
                  { key: 'bathrooms', enabled: true, required: true, question: 'How many bathrooms?', quick_replies: '1, 2, 3, 4+' },
                  { key: 'rate', enabled: true, required: false, question: '(auto from pricing)', quick_replies: '' },
                  { key: 'day', enabled: true, required: true, question: 'What day works best?', quick_replies: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
                  { key: 'time', enabled: true, required: true, question: 'What time?', quick_replies: '8am, 10am, 12pm, 2pm, 4pm' },
                  { key: 'name', enabled: true, required: true, question: "What's your full name?", quick_replies: '' },
                  { key: 'phone', enabled: true, required: true, question: 'Best phone number to reach you?', quick_replies: '' },
                  { key: 'address', enabled: true, required: true, question: 'Full address with zip code?', quick_replies: '' },
                  { key: 'email', enabled: true, required: false, question: 'Email address?', quick_replies: '' },
                  { key: 'notes', enabled: true, required: false, question: 'Any special notes or instructions?', quick_replies: '' },
                ]
                const updateField = (updates: Partial<typeof field>) => {
                  const rows = [...((selenaConfig.checklist_fields as typeof defaults) || defaults)]
                  rows[i] = { ...rows[i], ...updates }
                  setSelenaConfig({ ...selenaConfig, checklist_fields: rows })
                }
                return (
                  <div key={field.key} className="border border-slate-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{field.key}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          Enabled
                          <button
                            type="button"
                            onClick={() => updateField({ enabled: !field.enabled })}
                            className={`relative w-9 h-5 rounded-full transition-colors ${field.enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.enabled ? 'translate-x-4' : ''}`} />
                          </button>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          Required
                          <button
                            type="button"
                            onClick={() => updateField({ required: !field.required })}
                            className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-teal-500' : 'bg-slate-200'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.required ? 'translate-x-4' : ''}`} />
                          </button>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Question Selena Asks</label>
                      <input
                        type="text"
                        value={field.question}
                        onChange={(e) => updateField({ question: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">SMS Quick Reply Options (comma-separated)</label>
                      <input
                        type="text"
                        value={field.quick_replies}
                        onChange={(e) => updateField({ quick_replies: e.target.value })}
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button onClick={async () => { await saveTenant(); await saveSelenaConfig() }} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
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
