// Pure pricing-copy formatter — the rate line an agent may quote.
//
// Extracted from agent-config-loader so per-tenant authored configs
// (tenants/*.ts) can carry their REAL service rates through the same formatter
// the base engine uses, without importing agent-config-loader (which pulls in
// supabase/getSettings and would create an import cycle: loader → tenants/index
// → tenant config → loader). This module is a leaf: type-only imports, no
// runtime dependencies.

import type { ServiceType } from '@/lib/settings'
import type { PricingModel } from './agent-config'

/**
 * Build the pricing copy the agent may quote for a booking/flat tenant. Carries
 * each active service's REAL configured rate into the prompt. Previously only
 * service NAMES survived here (the per-service dollar rate was dropped upstream
 * in the settings mapping), so a booking tenant's agent literally had no number
 * to quote and could only say "quote your configured rates" — with none present.
 * quote_only tenants quote nothing, so the copy is empty by design.
 */
export function buildPriceCopy(activeServices: ServiceType[], pricingModel: PricingModel): string {
  if (pricingModel === 'quote_only') return ''
  if (!activeServices.length) return 'Quote only your configured rates — never invent a number.'
  const unit = pricingModel === 'hourly' ? '/hr' : ''
  const list = activeServices
    .map((s) => (s.rate > 0 ? `${s.name} — $${s.rate}${unit}` : s.name))
    .join(', ')
  return `Services and rates: ${list}. Quote ONLY these configured rates — never invent a total you were not given.`
}
