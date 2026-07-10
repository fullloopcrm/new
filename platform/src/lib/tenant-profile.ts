/**
 * Canonical tenant profile — Stage 0 of the onboarding redesign.
 *
 * ONE read model over the four real stores where profile data lives today:
 *   - tenants columns
 *   - the default `entities` row (legal/accounting identity)
 *   - tenants.selena_config jsonb (persona, policies, pricing knobs, social)
 *   - tenants.compliance jsonb (license + insurance)
 *
 * This file is READ-ONLY and additive: it introduces no schema change and no
 * write path. It exists so readiness (tenant-readiness.ts), the audit script,
 * and the future one-form UI all read the SAME shape instead of hand-mapping
 * fragments. The field registry (PROFILE_FIELDS) is the single source of truth
 * for "what data a launched tenant needs" — grounded in the §2 feature audit.
 */
import { supabaseAdmin } from './supabase'

export type FunnelMode = 'booking' | 'pipeline' | 'lead_only'

export type ProfileSection =
  | 'identity' | 'contact' | 'brand' | 'services' | 'scheduling'
  | 'payments' | 'comms' | 'reviews' | 'referrals' | 'proposals'
  | 'team' | 'compliance' | 'seo' | 'ai'

type Store = 'tenant' | 'entity' | 'selena' | 'compliance'

export type FieldTier = 'critical' | 'recommended' | 'optional'
export type FieldInput = 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array'
export type FieldOption = string | { label: string; value: string | number }

/** Where a profile field reads from + how important it is to a live launch. */
export interface FieldDef {
  key: string
  label: string
  section: ProfileSection
  store: Store
  /**
   * Storage location the write path persists to:
   *  - tenant / entity  → the column name
   *  - selena / compliance → the jsonb key (merged, never clobbering siblings)
   * Omit for read-only/derived fields.
   */
  col?: string
  /** Value coercion on write. Default 'text'. */
  kind?: 'text' | 'number' | 'array' | 'bool'
  /** UI hint for the form renderer. Default 'text'. */
  input?: FieldInput
  /** Options for select inputs. */
  options?: readonly FieldOption[]
  /** critical = blocks launch (delta 2) · recommended/optional = collected but non-blocking. */
  tier: FieldTier
  /** Derived/computed — surfaced in readiness but NOT writable via the profile PATCH. */
  readonly?: boolean
  /** If set, the field only applies to these funnels (delta 1 funnel-awareness). */
  funnels?: FunnelMode[]
  /** Pull the raw value from the loaded context. */
  read: (ctx: ProfileContext) => unknown
}

/** Raw rows loaded once, shared by every field's read(). */
export interface ProfileContext {
  tenant: Record<string, unknown>
  entity: Record<string, unknown> | null
  selena: Record<string, unknown>
  social: Record<string, unknown>
  compliance: Record<string, unknown>
  /** Active/priced state of the tenant's service_types — the real home of pricing. */
  services: Array<{ active: boolean; rate: number | null }>
}

// entity_type is CHECK-constrained lowercase in migration 034. The owner wizard
// historically wrote 'LLC'/'S-Corp', which VIOLATES the constraint and silently
// drops the identity row. Normalize on the way in so the profile reads clean and
// the future write path can round-trip a valid value.
const ENTITY_TYPE_MAP: Record<string, string> = {
  'llc': 'llc', 'l.l.c.': 'llc',
  's-corp': 's_corp', 's corp': 's_corp', 'scorp': 's_corp', 's_corp': 's_corp',
  'c-corp': 'c_corp', 'c corp': 'c_corp', 'ccorp': 'c_corp', 'c_corp': 'c_corp',
  'sole proprietor': 'sole_prop', 'sole prop': 'sole_prop', 'sole_prop': 'sole_prop',
  'partnership': 'partnership', 'nonprofit': 'other', 'other': 'other',
}
export function normalizeEntityType(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (!s) return null
  return ENTITY_TYPE_MAP[s] || 'other'
}

const t = (ctx: ProfileContext, k: string) => ctx.tenant[k]
const e = (ctx: ProfileContext, k: string) => (ctx.entity ? ctx.entity[k] : undefined)
const s = (ctx: ProfileContext, k: string) => ctx.selena[k]
const soc = (ctx: ProfileContext, k: string) => ctx.social[k]
const c = (ctx: ProfileContext, k: string) => ctx.compliance[k]

/**
 * The field registry — the audited set of data a launched tenant needs.
 * Stage-0 coverage: every section represented, all launch-critical fields
 * flagged. Extend field-by-field as the form is built; readiness already
 * respects `critical` + `funnels`, so adding a field wires it end-to-end.
 */
const ENTITY_TYPE_OPTIONS = ['LLC', 'S-Corp', 'C-Corp', 'Sole Proprietor', 'Partnership', 'Nonprofit'] as const
const PAYMENT_OPTIONS = ['stripe', 'zelle', 'venmo', 'apple_cash', 'cash', 'check'] as const
const TONE_OPTIONS = ['warm_friendly', 'professional', 'casual', 'luxury'] as const
const LANGUAGE_OPTIONS: FieldOption[] = [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }]
const EMOJI_OPTIONS = ['none', 'one_per_message', 'frequent'] as const
const DEPOSIT_OPTIONS = ['none', 'percent', 'flat'] as const
const SCOPE_OPTIONS = ['local', 'regional', 'national'] as const

/**
 * The field registry — the audited, comprehensive set of data a launched tenant
 * needs, mapped to the store each field truly lives in (grounded in settings.ts,
 * SiteConfig, service_types). Tier drives launch-blocking (critical) vs collected-
 * but-optional. The write API + form + readiness all read this one source.
 */
export const PROFILE_FIELDS: FieldDef[] = [
  // ── Identity ──────────────────────────────────────────────────────
  { key: 'businessName', label: 'Business name', section: 'identity', store: 'tenant', col: 'name', tier: 'critical', read: (x) => t(x, 'name') },
  { key: 'legalName', label: 'Legal entity name', section: 'identity', store: 'entity', col: 'legal_name', tier: 'recommended', read: (x) => e(x, 'legal_name') },
  { key: 'entityType', label: 'Entity type', section: 'identity', store: 'entity', col: 'entity_type', input: 'select', options: ENTITY_TYPE_OPTIONS, tier: 'recommended', read: (x) => e(x, 'entity_type') },
  { key: 'ein', label: 'EIN / Tax ID', section: 'identity', store: 'entity', col: 'ein', tier: 'recommended', read: (x) => e(x, 'ein') },
  { key: 'fiscalYearStart', label: 'Fiscal year start (month)', section: 'identity', store: 'entity', col: 'fiscal_year_start', kind: 'number', input: 'number', tier: 'optional', read: (x) => e(x, 'fiscal_year_start') },

  // ── Contact & location ────────────────────────────────────────────
  { key: 'phone', label: 'Business phone', section: 'contact', store: 'tenant', col: 'phone', tier: 'critical', read: (x) => t(x, 'phone') },
  { key: 'email', label: 'Business email', section: 'contact', store: 'tenant', col: 'email', tier: 'critical', read: (x) => t(x, 'email') },
  { key: 'address', label: 'Street address', section: 'contact', store: 'tenant', col: 'address', tier: 'critical', read: (x) => t(x, 'address') },
  { key: 'websiteUrl', label: 'Website', section: 'contact', store: 'tenant', col: 'website_url', tier: 'recommended', read: (x) => t(x, 'website_url') },
  { key: 'ownerEmail', label: 'Owner / admin email', section: 'contact', store: 'tenant', col: 'owner_email', tier: 'recommended', read: (x) => t(x, 'owner_email') },
  { key: 'leadNotificationEmail', label: 'Lead alert email', section: 'contact', store: 'tenant', col: 'lead_notification_email', tier: 'recommended', read: (x) => t(x, 'lead_notification_email') },

  // ── Service area ─── scope/states/zones owned by ServiceAreaEditor (selena_config.service_area); readonly here for readiness.
  { key: 'serviceScope', label: 'Service scope', section: 'contact', store: 'selena', readonly: true, input: 'select', options: SCOPE_OPTIONS, tier: 'critical', read: (x) => (s(x, 'service_area') as Record<string, unknown> | undefined)?.scope },
  { key: 'serviceRadius', label: 'Service radius (mi)', section: 'contact', store: 'tenant', col: 'service_radius_miles', kind: 'number', input: 'number', tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'service_radius_miles') },
  { key: 'serviceLat', label: 'Geocoded center', section: 'contact', store: 'tenant', readonly: true, tier: 'optional', read: (x) => t(x, 'service_area_lat') },

  // ── Brand & site ──────────────────────────────────────────────────
  { key: 'logoUrl', label: 'Logo', section: 'brand', store: 'tenant', col: 'logo_url', tier: 'recommended', read: (x) => t(x, 'logo_url') },
  { key: 'primaryColor', label: 'Primary color', section: 'brand', store: 'tenant', col: 'primary_color', input: 'color', tier: 'recommended', read: (x) => t(x, 'primary_color') },
  { key: 'secondaryColor', label: 'Secondary color', section: 'brand', store: 'tenant', col: 'secondary_color', input: 'color', tier: 'optional', read: (x) => t(x, 'secondary_color') },
  { key: 'tagline', label: 'Tagline', section: 'brand', store: 'tenant', col: 'tagline', tier: 'recommended', read: (x) => t(x, 'tagline') },
  { key: 'businessDescription', label: 'What the business does', section: 'brand', store: 'selena', col: 'business_description', input: 'textarea', tier: 'critical', read: (x) => s(x, 'business_description') },
  { key: 'businessStory', label: 'Your story', section: 'brand', store: 'selena', col: 'business_story', input: 'textarea', tier: 'optional', read: (x) => s(x, 'business_story') },

  // ── Services & pricing ─── pricing lives in service_types (own editor); readonly here.
  { key: 'servicePricing', label: 'Per-service pricing', section: 'services', store: 'tenant', readonly: true, tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => x.services.some((sv) => sv.active && (sv.rate ?? 0) > 0) },

  // ── Scheduling (booking/pipeline) ─────────────────────────────────
  { key: 'businessHoursStart', label: 'Opening hour', section: 'scheduling', store: 'tenant', col: 'business_hours_start', tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'business_hours_start') },
  { key: 'businessHoursEnd', label: 'Closing hour', section: 'scheduling', store: 'tenant', col: 'business_hours_end', tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'business_hours_end') },
  { key: 'defaultDuration', label: 'Default job length (hrs)', section: 'scheduling', store: 'tenant', col: 'default_duration_hours', kind: 'number', input: 'number', tier: 'recommended', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'default_duration_hours') },
  { key: 'bookingBuffer', label: 'Buffer between jobs (min)', section: 'scheduling', store: 'tenant', col: 'booking_buffer_minutes', kind: 'number', input: 'number', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'booking_buffer_minutes') },
  { key: 'minDaysAhead', label: 'Min days ahead to book', section: 'scheduling', store: 'tenant', col: 'min_days_ahead', kind: 'number', input: 'number', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'min_days_ahead') },
  { key: 'allowSameDay', label: 'Allow same-day booking', section: 'scheduling', store: 'tenant', col: 'allow_same_day', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'allow_same_day') },
  { key: 'open365', label: 'Open 365 days (no holidays)', section: 'scheduling', store: 'selena', col: 'open_365', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'open_365') },
  { key: 'requireTeamMember', label: 'Require assigned worker', section: 'scheduling', store: 'selena', col: 'require_team_member', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'require_team_member') },
  { key: 'autoConfirm', label: 'Auto-confirm bookings', section: 'scheduling', store: 'selena', col: 'auto_confirm_bookings', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'auto_confirm_bookings') },

  // ── Payments (booking/pipeline) ───────────────────────────────────
  { key: 'paymentMethods', label: 'Payment methods', section: 'payments', store: 'tenant', col: 'payment_methods', kind: 'array', input: 'array', options: PAYMENT_OPTIONS, tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'payment_methods') },
  { key: 'stripeKey', label: 'Stripe secret key', section: 'payments', store: 'tenant', col: 'stripe_api_key', tier: 'recommended', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_api_key') },
  { key: 'stripeAccountId', label: 'Stripe account ID', section: 'payments', store: 'tenant', col: 'stripe_account_id', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_account_id') },
  { key: 'zelleEmail', label: 'Zelle email', section: 'payments', store: 'tenant', col: 'zelle_email', tier: 'optional', read: (x) => t(x, 'zelle_email') },
  { key: 'appleCashPhone', label: 'Apple Cash phone', section: 'payments', store: 'tenant', col: 'apple_cash_phone', tier: 'optional', read: (x) => t(x, 'apple_cash_phone') },

  // ── Comms & integrations ──────────────────────────────────────────
  { key: 'resendKey', label: 'Sending email key (Resend)', section: 'comms', store: 'tenant', col: 'resend_api_key', tier: 'critical', read: (x) => t(x, 'resend_api_key') },
  { key: 'resendDomain', label: 'Sending domain', section: 'comms', store: 'tenant', col: 'resend_domain', tier: 'recommended', read: (x) => t(x, 'resend_domain') },
  { key: 'emailFrom', label: 'From address', section: 'comms', store: 'tenant', col: 'email_from', tier: 'recommended', read: (x) => t(x, 'email_from') },
  { key: 'telnyxKey', label: 'SMS key (Telnyx)', section: 'comms', store: 'tenant', col: 'telnyx_api_key', tier: 'recommended', read: (x) => t(x, 'telnyx_api_key') },
  { key: 'telnyxPhone', label: 'SMS number', section: 'comms', store: 'tenant', col: 'telnyx_phone', tier: 'recommended', read: (x) => t(x, 'telnyx_phone') },
  { key: 'telegramBotToken', label: 'Telegram bot token', section: 'comms', store: 'tenant', col: 'telegram_bot_token', tier: 'optional', read: (x) => t(x, 'telegram_bot_token') },
  { key: 'telegramChatId', label: 'Telegram chat ID', section: 'comms', store: 'tenant', col: 'telegram_chat_id', tier: 'optional', read: (x) => t(x, 'telegram_chat_id') },
  { key: 'anthropicKey', label: 'Anthropic key (AI)', section: 'comms', store: 'tenant', col: 'anthropic_api_key', tier: 'optional', read: (x) => t(x, 'anthropic_api_key') },

  // ── Reviews (booking/pipeline) ────────────────────────────────────
  { key: 'reviewTarget', label: 'Google Place ID', section: 'reviews', store: 'tenant', col: 'google_place_id', tier: 'recommended', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'google_place_id') || s(x, 'google_review_link') },
  { key: 'reviewLink', label: 'Review link', section: 'reviews', store: 'selena', col: 'google_review_link', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'google_review_link') },
  { key: 'reviewFollowupEnabled', label: 'Auto review follow-up', section: 'reviews', store: 'selena', col: 'review_followup_enabled', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'review_followup_enabled') },

  // ── Referrals ─────────────────────────────────────────────────────
  { key: 'commissionRate', label: 'Referral commission %', section: 'referrals', store: 'tenant', col: 'commission_rate', kind: 'number', input: 'number', tier: 'recommended', read: (x) => t(x, 'commission_rate') },
  { key: 'autoPayReferrals', label: 'Auto-pay referrals', section: 'referrals', store: 'selena', col: 'auto_pay_referrals', kind: 'bool', input: 'toggle', tier: 'optional', read: (x) => s(x, 'auto_pay_referrals') },
  { key: 'referralMinPayout', label: 'Min referral payout ($)', section: 'referrals', store: 'selena', col: 'referral_min_payout', kind: 'number', input: 'number', tier: 'optional', read: (x) => s(x, 'referral_min_payout') },

  // ── Proposals (pipeline) ──────────────────────────────────────────
  { key: 'proposalTerms', label: 'Proposal terms', section: 'proposals', store: 'selena', col: 'proposal_terms', input: 'textarea', tier: 'critical', funnels: ['pipeline'], read: (x) => s(x, 'proposal_terms') },
  { key: 'proposalDepositType', label: 'Deposit type', section: 'proposals', store: 'selena', col: 'proposal_deposit_type', input: 'select', options: DEPOSIT_OPTIONS, tier: 'recommended', funnels: ['pipeline'], read: (x) => s(x, 'proposal_deposit_type') },
  { key: 'proposalDepositValue', label: 'Deposit amount', section: 'proposals', store: 'selena', col: 'proposal_deposit_value', kind: 'number', input: 'number', tier: 'recommended', funnels: ['pipeline'], read: (x) => s(x, 'proposal_deposit_value') },
  { key: 'proposalValidDays', label: 'Proposal valid (days)', section: 'proposals', store: 'selena', col: 'proposal_valid_days', kind: 'number', input: 'number', tier: 'optional', funnels: ['pipeline'], read: (x) => s(x, 'proposal_valid_days') },

  // ── Team defaults ─────────────────────────────────────────────────
  { key: 'defaultPayRate', label: 'Default pay rate ($/hr)', section: 'team', store: 'selena', col: 'default_pay_rate', kind: 'number', input: 'number', tier: 'recommended', read: (x) => s(x, 'default_pay_rate') },
  { key: 'defaultWorkingDays', label: 'Default working days', section: 'team', store: 'selena', col: 'default_working_days', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'default_working_days') },
  { key: 'teamRoles', label: 'Team roles', section: 'team', store: 'selena', col: 'team_roles', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'team_roles') },

  // ── AI persona ────────────────────────────────────────────────────
  { key: 'aiName', label: 'Agent name', section: 'ai', store: 'selena', col: 'ai_name', tier: 'recommended', read: (x) => s(x, 'ai_name') },
  { key: 'tone', label: 'Voice / tone', section: 'ai', store: 'selena', col: 'tone', input: 'select', options: TONE_OPTIONS, tier: 'recommended', read: (x) => s(x, 'tone') },
  { key: 'language', label: 'Primary language', section: 'ai', store: 'selena', col: 'language', input: 'select', options: LANGUAGE_OPTIONS, tier: 'recommended', read: (x) => s(x, 'language') },
  { key: 'greeting', label: 'Chat greeting', section: 'ai', store: 'selena', col: 'greeting', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'greeting') },
  { key: 'emojiUsage', label: 'Emoji usage', section: 'ai', store: 'selena', col: 'emoji_usage', input: 'select', options: EMOJI_OPTIONS, tier: 'optional', read: (x) => s(x, 'emoji_usage') },

  // ── Finance display ───────────────────────────────────────────────
  { key: 'taxRate', label: 'Tax rate %', section: 'referrals', store: 'selena', col: 'tax_rate', kind: 'number', input: 'number', tier: 'optional', read: (x) => s(x, 'tax_rate') },
  { key: 'expenseCategories', label: 'Expense categories', section: 'referrals', store: 'tenant', col: 'expense_categories', kind: 'array', input: 'array', tier: 'optional', read: (x) => t(x, 'expense_categories') },

  // ── Compliance ────────────────────────────────────────────────────
  { key: 'license', label: 'Trade license #', section: 'compliance', store: 'compliance', col: 'license_number', tier: 'recommended', read: (x) => c(x, 'license_number') },
  { key: 'licenseState', label: 'License state', section: 'compliance', store: 'compliance', col: 'license_state', tier: 'optional', read: (x) => c(x, 'license_state') },
  { key: 'licenseExpiry', label: 'License expiry', section: 'compliance', store: 'compliance', col: 'license_expiry', tier: 'optional', read: (x) => c(x, 'license_expiry') },
  { key: 'insuranceCarrier', label: 'Insurance carrier', section: 'compliance', store: 'compliance', col: 'insurance_carrier', tier: 'recommended', read: (x) => c(x, 'insurance_carrier') },
  { key: 'insurancePolicy', label: 'Policy #', section: 'compliance', store: 'compliance', col: 'insurance_policy', tier: 'optional', read: (x) => c(x, 'insurance_policy') },
  { key: 'insuranceCoverage', label: 'Coverage amount', section: 'compliance', store: 'compliance', col: 'insurance_coverage', tier: 'optional', read: (x) => c(x, 'insurance_coverage') },
  { key: 'bonded', label: 'Bonded', section: 'compliance', store: 'compliance', col: 'bonded', kind: 'bool', input: 'toggle', tier: 'optional', read: (x) => c(x, 'bonded') },

  // ── Lead handling / SEO ───────────────────────────────────────────
  { key: 'autoRespondLeads', label: 'Auto-respond to leads', section: 'seo', store: 'selena', col: 'auto_respond_leads', kind: 'bool', input: 'toggle', tier: 'optional', read: (x) => s(x, 'auto_respond_leads') },
  { key: 'attributionWindow', label: 'Attribution window (hrs)', section: 'seo', store: 'tenant', col: 'attribution_window_hours', kind: 'number', input: 'number', tier: 'optional', read: (x) => t(x, 'attribution_window_hours') },
  { key: 'indexnow', label: 'IndexNow key', section: 'seo', store: 'tenant', col: 'indexnow_key', tier: 'optional', read: (x) => t(x, 'indexnow_key') },
]

/** Fast lookup by field key. */
export const PROFILE_FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  PROFILE_FIELDS.map((f) => [f.key, f]),
)

/** Coerce an incoming value to a field's storage kind. Empty → null (clear). */
export function coerceFieldValue(f: FieldDef, raw: unknown): unknown {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null
  switch (f.kind) {
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    case 'array':
      if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
      return String(raw).split(',').map((x) => x.trim()).filter(Boolean)
    case 'bool':
      return !!raw
    default:
      return typeof raw === 'string' ? raw.trim() : raw
  }
}

export interface RoutedWrite {
  tenantCols: Record<string, unknown>
  entityCols: Record<string, unknown>
  selenaKeys: Record<string, unknown>
  complianceKeys: Record<string, unknown>
  ignored: string[]
}

/**
 * Pure router: turn an incoming { key: value } map into per-store update objects,
 * coercing each value and dropping unknown/read-only keys. No DB, no encryption —
 * the API route applies these and handles secrets + jsonb merge. Shared with tests
 * so the field→store mapping can't drift.
 */
export function routeProfileWrite(incoming: Record<string, unknown>): RoutedWrite {
  const out: RoutedWrite = { tenantCols: {}, entityCols: {}, selenaKeys: {}, complianceKeys: {}, ignored: [] }
  for (const [key, raw] of Object.entries(incoming)) {
    const f = PROFILE_FIELD_BY_KEY[key]
    if (!f || f.readonly || !f.col) { out.ignored.push(key); continue }
    const v = key === 'entityType' ? normalizeEntityType(raw) : coerceFieldValue(f, raw)
    switch (f.store) {
      case 'tenant': out.tenantCols[f.col] = v; break
      case 'entity': out.entityCols[f.col] = v; break
      case 'selena': out.selenaKeys[f.col] = v; break
      case 'compliance': out.complianceKeys[f.col] = v; break
    }
  }
  return out
}

export interface LoadedField extends FieldDef {
  value: unknown
  filled: boolean
}

export interface TenantProfile {
  tenantId: string
  funnel: FunnelMode
  name: string
  slug: string
  status: string
  fields: LoadedField[]
}

/** True when a value counts as "provided" (non-empty). */
export function isFilled(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return true
  if (typeof v === 'boolean') return v
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

/** Load the full canonical profile for one tenant. Read-only. */
export async function getTenantProfile(tenantId: string): Promise<TenantProfile | null> {
  const [{ data: tenant }, { data: entity }, { data: svcRows }] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', tenantId).single(),
    supabaseAdmin
      .from('entities')
      .select('name, legal_name, ein, entity_type, address, city, state, zip, currency, fiscal_year_start')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .maybeSingle(),
    supabaseAdmin
      .from('service_types')
      .select('active, default_hourly_rate')
      .eq('tenant_id', tenantId),
  ])
  if (!tenant) return null

  const selena = (tenant.selena_config as Record<string, unknown>) || {}
  const ctx: ProfileContext = {
    tenant: tenant as Record<string, unknown>,
    entity: (entity as Record<string, unknown> | null) || null,
    selena,
    social: (selena.social as Record<string, unknown>) || {},
    compliance: (tenant.compliance as Record<string, unknown>) || {},
    services: (svcRows || []).map((r) => ({
      active: (r as Record<string, unknown>).active !== false,
      rate: (r as Record<string, unknown>).default_hourly_rate as number | null,
    })),
  }

  const funnel: FunnelMode =
    selena.funnel_mode === 'pipeline' ? 'pipeline'
    : selena.funnel_mode === 'lead_only' ? 'lead_only'
    : 'booking'

  const fields: LoadedField[] = PROFILE_FIELDS.map((f) => {
    const value = f.read(ctx)
    return { ...f, value, filled: isFilled(value) }
  })

  return {
    tenantId,
    funnel,
    name: (tenant.name as string) || '',
    slug: (tenant.slug as string) || '',
    status: (tenant.status as string) || 'unknown',
    fields,
  }
}

/** Does a field apply to this tenant's funnel? */
export function appliesToFunnel(f: FieldDef, funnel: FunnelMode): boolean {
  return !f.funnels || f.funnels.includes(funnel)
}
