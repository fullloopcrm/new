'use client'

// File-split status (2026-07-28): types/constants moved to
// _settings-types.ts; every tab (Business, Service Area, Services, Sales,
// Scheduling, Referrals & Policies, Permissions, Integrations, Branding,
// Communications, Selena, Tools) now lives in its own component, following
// the same pattern established here for Permissions/Communications.
// Services (like Tools) is fully self-contained -- it owns and fetches its
// own service-type list, since nothing outside that tab reads it. Sales
// stays lifted (selenaConfig/setSelenaConfig/saveSelenaConfig) because
// SelenaTab.tsx shares the same state. Verified via tsc --noEmit + eslint
// on every touched file.
import { useEffect, useState } from 'react'
import PermissionsTab from './PermissionsTab'
import CommunicationsTab from './CommunicationsTab'
import { SelenaTab } from './SelenaTab'
import { ToolsTab } from './ToolsTab'
import { IntegrationsTab } from './IntegrationsTab'
import { SchedulingTab } from './SchedulingTab'
import { BusinessTab } from './BusinessTab'
import { ServiceAreaTab } from './ServiceAreaTab'
import { ServicesTab } from './ServicesTab'
import { SalesTab } from './SalesTab'
import { ReferralsPoliciesTab } from './ReferralsPoliciesTab'
import { AdditionalDetailsTab } from './AdditionalDetailsTab'
import { BrandingTab } from './BrandingTab'
import { tenantSiteUrl, type Tenant, TABS, type Tab } from './_settings-types'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Business')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState<Partial<Tenant>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selenaConfig, setSelenaConfig] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => { setTenant(data.tenant); setForm(data.tenant); if (data.tenant?.selena_config) setSelenaConfig(data.tenant.selena_config) })
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

  function maskKey(key: string | null) {
    if (!key) return ''
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }

  // togglePaymentMethod moved into SchedulingTab.tsx (its only call site).
  // exportData/runBackup/deleteAllData/parseCSV/handleCSVFile/downloadTemplate/
  // importClients/resetImport moved into ToolsTab.tsx, which is now fully
  // self-contained (owns its own CSV-import/export-in-flight state too).
  // addService/toggleService/deleteService/startEditService/saveEditService
  // moved into ServicesTab.tsx, likewise fully self-contained.

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

      {tab === 'Service Area' && <ServiceAreaTab />}

      {tab === 'Business' && (
        <BusinessTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
      )}

      {tab === 'Services' && <ServicesTab />}

      {tab === 'Sales' && (
        <SalesTab selenaConfig={selenaConfig} setSelenaConfig={setSelenaConfig} saveSelenaConfig={saveSelenaConfig} saving={saving} saved={saved} />
      )}

      {tab === 'Scheduling' && (
        <SchedulingTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
      )}

      {tab === 'Referrals & Policies' && (
        <ReferralsPoliciesTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
      )}

      {tab === 'Additional Details' && <AdditionalDetailsTab />}

      {tab === 'Permissions' && <PermissionsTab />}

      {tab === 'Integrations' && (
        <IntegrationsTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
      )}

      {tab === 'Branding' && (
        <BrandingTab form={form} setForm={setForm} saveTenant={saveTenant} saving={saving} saved={saved} />
      )}

      {tab === 'Communications' && <CommunicationsTab />}


      {tab === 'Selena' && (
        <SelenaTab form={form} setForm={setForm} selenaConfig={selenaConfig} setSelenaConfig={setSelenaConfig} saveTenant={saveTenant} saveSelenaConfig={saveSelenaConfig} saving={saving} saved={saved} />
      )}

      {tab === 'Tools' && <ToolsTab />}
    </div>
  )
}
