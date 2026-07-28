'use client'

import type { Dispatch, SetStateAction } from 'react'
import { BUSINESS_HOURS_START_OPTIONS, BUSINESS_HOURS_END_OPTIONS, PAYMENT_METHOD_OPTIONS, type Tenant } from './_settings-types'

interface SchedulingTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  saveTenant: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Scheduling tab: business hours, booking buffers, payment methods.
// Extracted verbatim from settings/page.tsx (previously the 'Scheduling' tab
// === branch). togglePaymentMethod moved in as a local closure over
// form/setForm -- it had exactly one call site (this tab) in the original file.
export function SchedulingTab({ form, setForm, saveTenant, saving, saved }: SchedulingTabProps) {
  function togglePaymentMethod(method: string) {
    const current = form.payment_methods || []
    if (current.includes(method)) {
      setForm({ ...form, payment_methods: current.filter((m) => m !== method) })
    } else {
      setForm({ ...form, payment_methods: [...current, method] })
    }
  }

  return (
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
  )
}
