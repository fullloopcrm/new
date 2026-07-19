/**
 * Sales partner commission tier auto-progression.
 *
 * nycmaid (072ceed0) only ever *displayed* a tier progress bar — the `tier`
 * column itself stayed 100% admin-set (PUT /api/sales-partners), so a
 * partner could hit the client-count threshold and the UI would say "you
 * unlocked Tier 2" while their actual commission_rate silently stayed at
 * 10% until an admin noticed and flipped it by hand. This module makes the
 * progression real: once a partner's direct-client count crosses a
 * threshold, autoPromoteSalesPartnerTier() writes the new tier (and, unless
 * an admin has already customized the rate away from the tier default,
 * the new commission_rate) server-side.
 *
 * Thresholds/rates match the admin dashboard's existing TIER_LABEL map
 * (dashboard/sales-partners/page.tsx) and the tier CHECK constraint in
 * 2026_07_18_sales_partners.sql — not invented here.
 */
import { supabaseAdmin } from './supabase'

export interface TierDef {
  key: 'standard' | 'tier2' | 'tier3'
  label: string
  rate: number       // fraction, e.g. 0.10 = 10%
  threshold: number  // direct clients required to reach this tier
}

export const SALES_PARTNER_TIERS: TierDef[] = [
  { key: 'standard', label: 'Standard', rate: 0.10, threshold: 0 },
  { key: 'tier2', label: 'Tier 2', rate: 0.12, threshold: 50 },
  { key: 'tier3', label: 'Tier 3', rate: 0.15, threshold: 100 },
]

export function tierIndex(key: string): number {
  return SALES_PARTNER_TIERS.findIndex((t) => t.key === key)
}

export function tierForDirectClientCount(count: number): TierDef {
  let current = SALES_PARTNER_TIERS[0]
  for (const t of SALES_PARTNER_TIERS) {
    if (count >= t.threshold) current = t
  }
  return current
}

export interface TierProgressInfo {
  current: TierDef
  next: TierDef | null
  directClientCount: number
  remainingToNext: number | null
  progressPct: number
}

export function computeTierProgress(tierKey: string, directClientCount: number): TierProgressInfo {
  const idx = Math.max(0, tierIndex(tierKey))
  const current = SALES_PARTNER_TIERS[idx] || SALES_PARTNER_TIERS[0]
  const next = SALES_PARTNER_TIERS[idx + 1] || null
  if (!next) {
    return { current, next: null, directClientCount, remainingToNext: null, progressPct: 100 }
  }
  const remainingToNext = Math.max(0, next.threshold - directClientCount)
  const progressPct = Math.min(100, Math.round((directClientCount / next.threshold) * 100))
  return { current, next, directClientCount, remainingToNext, progressPct }
}

/**
 * Counts this partner's direct (sticky-attributed) clients and promotes —
 * never demotes — tier/commission_rate to match. Safe to call on every
 * portal load and after every direct-source commission; a no-op once the
 * partner is already at or above the tier their count earns.
 *
 * Leaves commission_rate untouched if it no longer matches the partner's
 * current tier's default (i.e. an admin already customized it by hand) —
 * only the `tier` label still advances so the portal reflects real
 * standing, but a negotiated custom rate is never silently overwritten.
 */
export async function autoPromoteSalesPartnerTier(
  tenantId: string,
  partnerId: string,
): Promise<{ promoted: boolean; tier: string; directClientCount: number }> {
  const { count } = await supabaseAdmin
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('sales_partner_id', partnerId)
  const directClientCount = count || 0

  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('tier, commission_rate, name')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!partner) return { promoted: false, tier: 'standard', directClientCount }

  const currentIdx = Math.max(0, tierIndex(partner.tier as string))
  const earned = tierForDirectClientCount(directClientCount)
  const earnedIdx = tierIndex(earned.key)

  if (earnedIdx <= currentIdx) {
    return { promoted: false, tier: partner.tier as string, directClientCount }
  }

  const oldTierDef = SALES_PARTNER_TIERS[currentIdx]
  const rateIsCustomized = Math.abs(Number(partner.commission_rate) - oldTierDef.rate) > 0.0001
  const updates: Record<string, unknown> = { tier: earned.key }
  if (!rateIsCustomized) updates.commission_rate = earned.rate

  const { error } = await supabaseAdmin
    .from('sales_partners')
    .update(updates)
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
  if (error) {
    console.error(`[sales-partner-tier] auto-promote failed partner=${partnerId} tenant=${tenantId}: ${error.message}`)
    return { promoted: false, tier: partner.tier as string, directClientCount }
  }

  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'sales_partner_tier_promotion',
    title: 'Sales partner tier upgrade',
    message: `${(partner as { name?: string | null }).name || 'A sales partner'} reached ${directClientCount} direct clients and was auto-promoted to ${earned.label} (${Math.round(earned.rate * 100)}%).`,
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return { promoted: true, tier: earned.key, directClientCount }
}
