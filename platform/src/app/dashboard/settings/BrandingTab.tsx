'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Tenant } from './_settings-types'

interface BrandingTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  saveTenant: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Branding tab: primary/secondary color, logo, tagline, website URL, live
// preview. Extracted verbatim from settings/page.tsx (previously the
// 'Branding' tab === branch).
export function BrandingTab({ form, setForm, saveTenant, saving, saved }: BrandingTabProps) {
  return (
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
  )
}
