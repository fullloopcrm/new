'use client'

import type { Dispatch, SetStateAction } from 'react'
import { formatPhone } from '@/lib/phone'
import AddressAutocomplete from '@/components/address-autocomplete'
import type { Tenant } from './_settings-types'

interface BusinessTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  saveTenant: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Business tab: timezone, business identity, address, industry, team size,
// hours. Extracted verbatim from settings/page.tsx (previously the
// 'Business' tab === branch).
export function BusinessTab({ form, setForm, saveTenant, saving, saved }: BusinessTabProps) {
  return (
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
  )
}
