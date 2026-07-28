'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Tenant } from './_settings-types'

interface ReferralsPoliciesTabProps {
  form: Partial<Tenant>
  setForm: Dispatch<SetStateAction<Partial<Tenant>>>
  saveTenant: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Referrals & Policies tab: referral program, client lifecycle thresholds,
// cancellation/rescheduling notice. Extracted verbatim from
// settings/page.tsx (previously the 'Referrals & Policies' tab === branch).
export function ReferralsPoliciesTab({ form, setForm, saveTenant, saving, saved }: ReferralsPoliciesTabProps) {
  return (
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
  )
}
