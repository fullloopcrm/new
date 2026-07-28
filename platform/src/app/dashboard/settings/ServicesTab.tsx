'use client'

import { useEffect, useState } from 'react'
import { PricingFields } from './PricingFields'
import {
  type ServiceType, type ServiceFormState, EMPTY_SERVICE_FORM,
  buildServicePayload, formatServicePrice,
} from './_settings-types'

// Services tab: manage service types (name, pricing model, rates).
// Extracted verbatim from settings/page.tsx (previously the 'Services' tab
// === branch) -- fully self-contained, since none of its state (service
// list, add/edit forms) is read outside this tab (same pattern as
// ToolsTab.tsx). Fetches its own service list on mount instead of relying
// on a page-level effect.
export function ServicesTab() {
  const [services, setServices] = useState<ServiceType[]>([])
  const [newService, setNewService] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [addingService, setAddingService] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editServiceForm, setEditServiceForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [savingService, setSavingService] = useState(false)

  useEffect(() => {
    fetch('/api/settings/services')
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
  }, [])

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

  return (
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
  )
}
