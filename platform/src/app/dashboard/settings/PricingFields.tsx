'use client'

import { INPUT_CLS, PRICING_MODELS, type PricingModel, type ServiceFormState } from './_settings-types'

// Shared pricing-model editor used by both the add and edit service forms.
// Extracted verbatim from settings/page.tsx.
export function PricingFields({ f, set }: { f: ServiceFormState; set: (patch: Partial<ServiceFormState>) => void }) {
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
      {f.pricing_model !== 'hourly' && (
        <input placeholder="Minimum charge ($) — optional" type="number" value={f.min_charge} onChange={(e) => set({ min_charge: e.target.value })} className={INPUT_CLS} />
      )}
    </>
  )
}
