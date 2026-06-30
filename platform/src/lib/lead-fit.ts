/**
 * Lead FIT scoring — qualify on INTENT (growth + automation appetite), never size.
 *
 * The /qualify form answers are all structured (dropdown/checkbox) so they can be
 * scored deterministically. The score SURFACES and SORTS leads — it never
 * auto-rejects. Price-shopper signals flag the bucket for a human's eyes only.
 *
 * Single source of truth for: scoring weights, bucket thresholds, and the
 * dropdown option lists the form renders + the Leads view labels.
 */

export type FitBucket = 'hot' | 'good' | 'watch' | 'shopper'

export interface FitAnswers {
  automation_comfort?: string | null // excited | open | cautious | skeptical
  growth_goal?: string | null // scale_2x | steady | maintain | none
  revenue_trajectory?: string | null // up | flat | down
  timeline?: string | null // asap | 30 | 90 | exploring
  current_system?: string | null // nothing | spreadsheets | basic_crm | shopping
  lead_gen_spend?: string | null // none | lt500 | 500_2k | 2k_5k | 5k_plus
  wants_automation?: boolean | null
  wants_growth?: boolean | null
  comparing_prices?: boolean | null
}

export function computeFit(a: FitAnswers): { score: number; bucket: FitBucket } {
  let s = 0

  s += { excited: 30, open: 15, cautious: 0, skeptical: -20 }[a.automation_comfort ?? ''] ?? 0
  s += { scale_2x: 25, steady: 15, maintain: 0, none: -20 }[a.growth_goal ?? ''] ?? 0
  s += { up: 15, flat: 0, down: -10 }[a.revenue_trajectory ?? ''] ?? 0
  s += { asap: 15, '30': 10, '90': 5, exploring: -10 }[a.timeline ?? ''] ?? 0
  s += { nothing: 0, spreadsheets: 5, basic_crm: 0, shopping: -15 }[a.current_system ?? ''] ?? 0
  s += { none: 0, lt500: 0, '500_2k': 5, '2k_5k': 10, '5k_plus': 15 }[a.lead_gen_spend ?? ''] ?? 0

  if (a.wants_automation) s += 10
  if (a.wants_growth) s += 10
  if (a.comparing_prices) s -= 20

  // Explicit price-shopper tells flag the bucket regardless of score.
  const shopperFlag = !!a.comparing_prices || a.current_system === 'shopping'

  let bucket: FitBucket
  if (shopperFlag) bucket = 'shopper'
  else if (s >= 60) bucket = 'hot'
  else if (s >= 35) bucket = 'good'
  else if (s >= 10) bucket = 'watch'
  else bucket = 'shopper'

  return { score: s, bucket }
}

export const FIT_BUCKET_META: Record<FitBucket, { label: string; emoji: string; cls: string }> = {
  hot: { label: 'Hot fit', emoji: '🔥', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  good: { label: 'Good', emoji: '✅', cls: 'bg-green-50 text-green-700 border-green-200' },
  watch: { label: 'Watch', emoji: '👀', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  shopper: { label: 'Likely shopper', emoji: '🛒', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export function fitBucket(raw: string | null | undefined): FitBucket {
  return raw === 'hot' || raw === 'good' || raw === 'watch' || raw === 'shopper' ? raw : 'watch'
}

// ── Dropdown option lists (form renders these; Leads view labels off them) ──
type Opt = { v: string; l: string }

export const QUALIFY_OPTIONS = {
  trade: [
    'cleaning', 'landscaping', 'hvac', 'plumbing', 'handyman', 'electrical',
    'pest_control', 'roofing', 'painting', 'tree_service', 'moving', 'junk_removal', 'other',
  ],
  annual_revenue: [
    { v: 'under_250k', l: 'Under $250k' },
    { v: '250k_1m', l: '$250k – $1M' },
    { v: '1m_3m', l: '$1M – $3M' },
    { v: '3m_plus', l: '$3M+' },
  ] as Opt[],
  revenue_trajectory: [
    { v: 'up', l: 'Growing' },
    { v: 'flat', l: 'Flat' },
    { v: 'down', l: 'Declining' },
  ] as Opt[],
  growth_goal: [
    { v: 'scale_2x', l: 'Double+ / scale aggressively' },
    { v: 'steady', l: 'Steady growth' },
    { v: 'maintain', l: 'Maintain where I am' },
    { v: 'none', l: 'Not focused on growth' },
  ] as Opt[],
  automation_comfort: [
    { v: 'excited', l: 'Excited — automate as much as possible' },
    { v: 'open', l: 'Open to it' },
    { v: 'cautious', l: 'Cautious' },
    { v: 'skeptical', l: 'Skeptical of AI' },
  ] as Opt[],
  lead_gen_spend: [
    { v: 'none', l: '$0 — none' },
    { v: 'lt500', l: 'Under $500/mo' },
    { v: '500_2k', l: '$500 – $2k/mo' },
    { v: '2k_5k', l: '$2k – $5k/mo' },
    { v: '5k_plus', l: '$5k+/mo' },
  ] as Opt[],
  pain_point: [
    { v: 'admin', l: 'Too much admin / paperwork' },
    { v: 'missing_leads', l: 'Missing / losing leads' },
    { v: 'cant_scale', l: "Can't scale operations" },
    { v: 'no_followup', l: 'No follow-up with customers' },
    { v: 'booking_chaos', l: 'Scheduling / booking chaos' },
    { v: 'other', l: 'Something else' },
  ] as Opt[],
  timeline: [
    { v: 'asap', l: 'ASAP' },
    { v: '30', l: 'Within 30 days' },
    { v: '90', l: '30–90 days' },
    { v: 'exploring', l: 'Just exploring' },
  ] as Opt[],
  current_system: [
    { v: 'nothing', l: 'Nothing / pen & paper' },
    { v: 'spreadsheets', l: 'Spreadsheets' },
    { v: 'basic_crm', l: 'A basic CRM' },
    { v: 'shopping', l: 'Shopping several CRMs right now' },
  ] as Opt[],
} as const

// value → label lookup for any of the above option lists, for Leads display.
export function optLabel(list: readonly Opt[], v: string | null | undefined): string {
  if (!v) return '—'
  return list.find(o => o.v === v)?.l ?? v
}
