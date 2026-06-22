// Sales pipeline stages for partner/client leads (partner_requests.status).
// The column is free-text, so we keep canonical stage strings here and
// normalize legacy values (pending/approved/rejected) on read.

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'sold',
  'onboarded',
  'lost',
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]

// Ordered pipeline (excludes the terminal "lost" stage).
export const PIPELINE_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'sold',
  'onboarded',
]

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  sold: 'Sold',
  onboarded: 'Onboarded',
  lost: 'Lost',
}

const LEGACY_MAP: Record<string, LeadStage> = {
  pending: 'new',
  approved: 'qualified',
  rejected: 'lost',
}

export function normalizeStage(raw: string | null | undefined): LeadStage {
  if (!raw) return 'new'
  if ((LEAD_STAGES as readonly string[]).includes(raw)) return raw as LeadStage
  return LEGACY_MAP[raw] ?? 'new'
}

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === 'string' && (LEAD_STAGES as readonly string[]).includes(value)
}
