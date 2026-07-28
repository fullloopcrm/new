'use client'

import type { Dispatch, SetStateAction } from 'react'

interface SalesTabProps {
  selenaConfig: Record<string, unknown>
  setSelenaConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  saveSelenaConfig: () => Promise<void>
  saving: boolean
  saved: boolean
}

// Sales tab: proposal defaults (tax rate, valid-for window, deposit, terms).
// Extracted verbatim from settings/page.tsx (previously the 'Sales' tab ===
// branch). selenaConfig/setSelenaConfig/saveSelenaConfig stay lifted in
// page.tsx (unlike Services/Tools) because SelenaTab.tsx reads/writes the
// same state.
export function SalesTab({ selenaConfig, setSelenaConfig, saveSelenaConfig, saving, saved }: SalesTabProps) {
  return (
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
  )
}
