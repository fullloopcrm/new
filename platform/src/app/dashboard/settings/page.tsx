'use client'

// File-split status (2026-07-28): types/constants moved to
// _settings-types.ts; the Selena, Tools, Integrations, and Scheduling tabs
// (the 4 largest, ~1150 of ~1530 render-section lines) moved to their own
// components, following the same pattern already established here for
// Permissions/Communications. Verified via tsc --noEmit + eslint on every
// touched file. Business/Sales/Services/Referrals & Policies/Branding/
// Service Area tabs (~370 lines) are NOT yet split out -- smaller wins left
// for a follow-up pass; each is self-contained enough (reads/writes `form`
// plus a couple of local handlers) to extract the same way.
import { useEffect, useState } from 'react'
import { formatPhone } from '@/lib/phone'
import AddressAutocomplete from '@/components/address-autocomplete'
import ServiceAreaEditor from '@/components/ServiceAreaEditor'
import PermissionsTab from './PermissionsTab'
import CommunicationsTab from './CommunicationsTab'
import { SelenaTab } from './SelenaTab'
import { ToolsTab } from './ToolsTab'
import { IntegrationsTab } from './IntegrationsTab'
import { SchedulingTab } from './SchedulingTab'
import { PricingFields } from './PricingFields'
import {
  tenantSiteUrl, type Tenant, type ServiceType, type ServiceFormState,
  EMPTY_SERVICE_FORM, buildServicePayload, formatServicePrice, TABS, type Tab,
} from './_settings-types'

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
  const [selenaConfig, setSelenaConfig] = useState<Record<string, unknown>>({})

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

  // togglePaymentMethod moved into SchedulingTab.tsx (its only call site).
  // exportData/runBackup/deleteAllData/parseCSV/handleCSVFile/downloadTemplate/
  // importClients/resetImport moved into ToolsTab.tsx, which is now fully
  // self-contained (owns its own CSV-import/export-in-flight state too).

  if (!tenant) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        {tenantSiteUrl(tenant) && (
          <a href={tenant.website_url || tenantSiteUrl(tenant)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            View website ↗
          </a>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? 'border-white text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-400'
            }`}
          >
            {t === 'Selena' ? (form.agent_name || 'Selena') : t}
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
        <SchedulingTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
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
        <IntegrationsTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
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


      {tab === 'Selena' && (
        <SelenaTab form={form} setForm={setForm} selenaConfig={selenaConfig} setSelenaConfig={setSelenaConfig} saveTenant={saveTenant} saveSelenaConfig={saveSelenaConfig} saving={saving} saved={saved} />
      )}

      {tab === 'Tools' && <ToolsTab />}
    </div>
  )
}
