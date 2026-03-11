'use client'

import { useState, useEffect, useCallback } from 'react'

interface SettingEntry {
  key: string
  value: string
}

interface TenantOption {
  id: string
  name: string
}

export default function AdminSettingsPage() {
  useEffect(() => { document.title = 'Settings | Admin' }, [])

  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')

  // Platform settings
  const [platformSettings, setPlatformSettings] = useState<SettingEntry[]>([])
  const [platformLoading, setPlatformLoading] = useState(true)
  const [platformSaving, setPlatformSaving] = useState(false)
  const [platformSaved, setPlatformSaved] = useState(false)

  // Tenant settings
  const [tenantSettings, setTenantSettings] = useState<SettingEntry[]>([])
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantSaving, setTenantSaving] = useState(false)
  const [tenantSaved, setTenantSaved] = useState(false)

  useEffect(() => {
    loadTenants()
    loadPlatformSettings()
  }, [])

  useEffect(() => {
    if (selectedTenant) {
      loadTenantSettings(selectedTenant)
    } else {
      setTenantSettings([])
    }
  }, [selectedTenant])

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.ok) setTenants(await res.json())
    } catch (err) {
      console.error('Failed to load tenants:', err)
    }
  }

  const loadPlatformSettings = async () => {
    setPlatformLoading(true)
    try {
      const res = await fetch('/api/admin/settings?scope=platform')
      if (res.ok) {
        const data = await res.json()
        setPlatformSettings(data.settings || [])
      }
    } catch (err) {
      console.error('Failed to load platform settings:', err)
    }
    setPlatformLoading(false)
  }

  const loadTenantSettings = async (tenantId: string) => {
    setTenantLoading(true)
    try {
      const res = await fetch(`/api/admin/settings?scope=tenant&tenant_id=${tenantId}`)
      if (res.ok) {
        const data = await res.json()
        setTenantSettings(data.settings || [])
      }
    } catch (err) {
      console.error('Failed to load tenant settings:', err)
    }
    setTenantLoading(false)
  }

  const savePlatformSettings = async () => {
    setPlatformSaving(true)
    setPlatformSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'platform', settings: platformSettings })
      })
      if (res.ok) {
        setPlatformSaved(true)
        setTimeout(() => setPlatformSaved(false), 3000)
      } else {
        const err = await res.json()
        alert('Failed to save: ' + (err.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to save platform settings')
    }
    setPlatformSaving(false)
  }

  const saveTenantSettings = async () => {
    if (!selectedTenant) return
    setTenantSaving(true)
    setTenantSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'tenant', tenant_id: selectedTenant, settings: tenantSettings })
      })
      if (res.ok) {
        setTenantSaved(true)
        setTimeout(() => setTenantSaved(false), 3000)
      } else {
        const err = await res.json()
        alert('Failed to save: ' + (err.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to save tenant settings')
    }
    setTenantSaving(false)
  }

  const updatePlatformSetting = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setPlatformSettings(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: val }
      return updated
    })
  }, [])

  const updateTenantSetting = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setTenantSettings(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: val }
      return updated
    })
  }, [])

  const addPlatformSetting = () => {
    setPlatformSettings(prev => [...prev, { key: '', value: '' }])
  }

  const removePlatformSetting = (index: number) => {
    setPlatformSettings(prev => prev.filter((_, i) => i !== index))
  }

  const addTenantSetting = () => {
    setTenantSettings(prev => [...prev, { key: '', value: '' }])
  }

  const removeTenantSetting = (index: number) => {
    setTenantSettings(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <main className="p-3 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage platform-wide and per-tenant configuration</p>
      </div>

      {/* Platform Settings */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Platform Settings</h3>
            <p className="text-sm text-gray-500 mt-0.5">These settings apply across all tenants</p>
          </div>
          <button
            onClick={addPlatformSetting}
            className="px-3 py-1.5 text-sm font-medium text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition"
          >
            + Add Setting
          </button>
        </div>
        <div className="p-5">
          {platformLoading ? (
            <div className="text-center py-8 text-gray-400">Loading settings...</div>
          ) : platformSettings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No platform settings configured.
              <button onClick={addPlatformSetting} className="text-teal-600 hover:underline ml-1">Add one</button>
            </div>
          ) : (
            <div className="space-y-3">
              {platformSettings.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <input
                    type="text"
                    placeholder="Setting key"
                    value={s.key}
                    onChange={(e) => updatePlatformSetting(i, 'key', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 font-mono bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => updatePlatformSetting(i, 'value', e.target.value)}
                    className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                  <button
                    onClick={() => removePlatformSetting(i)}
                    className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
                    title="Remove setting"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {platformSettings.length > 0 && (
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={savePlatformSettings}
                disabled={platformSaving}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition"
              >
                {platformSaving ? 'Saving...' : 'Save Platform Settings'}
              </button>
              {platformSaved && (
                <span className="text-sm text-green-600 font-medium">Saved successfully</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tenant Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Tenant Settings</h3>
              <p className="text-sm text-gray-500 mt-0.5">Per-tenant configuration overrides</p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white"
              >
                <option value="">Select a tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTenant && (
                <button
                  onClick={addTenantSetting}
                  className="px-3 py-1.5 text-sm font-medium text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition"
                >
                  + Add Setting
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-5">
          {!selectedTenant ? (
            <div className="text-center py-8 text-gray-400">Select a tenant to view and edit its settings</div>
          ) : tenantLoading ? (
            <div className="text-center py-8 text-gray-400">Loading tenant settings...</div>
          ) : tenantSettings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No settings configured for this tenant.
              <button onClick={addTenantSetting} className="text-teal-600 hover:underline ml-1">Add one</button>
            </div>
          ) : (
            <div className="space-y-3">
              {tenantSettings.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <input
                    type="text"
                    placeholder="Setting key"
                    value={s.key}
                    onChange={(e) => updateTenantSetting(i, 'key', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 font-mono bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => updateTenantSetting(i, 'value', e.target.value)}
                    className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                  <button
                    onClick={() => removeTenantSetting(i)}
                    className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
                    title="Remove setting"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedTenant && tenantSettings.length > 0 && (
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={saveTenantSettings}
                disabled={tenantSaving}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition"
              >
                {tenantSaving ? 'Saving...' : 'Save Tenant Settings'}
              </button>
              {tenantSaved && (
                <span className="text-sm text-green-600 font-medium">Saved successfully</span>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
