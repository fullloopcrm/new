/**
 * Canonical tenant profile — Stage 0 of the onboarding redesign, now the real
 * write path (2026-07-30) via `/api/tenant-profile` (see routeProfileWrite).
 *
 * ONE model over the four real stores where profile data lives today:
 *   - tenants columns
 *   - the default `entities` row (legal/accounting identity)
 *   - tenants.selena_config jsonb (persona, policies, pricing knobs, social)
 *   - tenants.compliance jsonb (license + insurance)
 *
 * It exists so readiness (tenant-readiness.ts), the audit script, the public
 * onboarding link, and (progressively) Settings all read/write the SAME
 * shape instead of hand-mapping fragments. The field registry (PROFILE_FIELDS)
 * is the single source of truth for "what data a launched tenant needs" —
 * grounded in the §2 feature audit.
 *
 * Not every related table fits this single-tenant-scalar model — multi-row
 * data (`tenant_locations`, `tenant_notes`) is intentionally NOT modeled as
 * FieldDefs here; it gets its own small CRUD API instead of being forced into
 * a 1:1 field shape. See src/app/api/admin/tenants/[id]/locations and /notes.
 */
import { supabaseAdmin } from './supabase'

export type FunnelMode = 'booking' | 'pipeline' | 'lead_only'

export type ProfileSection =
  | 'identity' | 'contact' | 'brand' | 'services' | 'scheduling'
  | 'payments' | 'comms' | 'reviews' | 'referrals' | 'proposals'
  | 'team' | 'compliance' | 'seo' | 'ai' | 'account'

type Store = 'tenant' | 'entity' | 'selena' | 'compliance'

export type FieldTier = 'critical' | 'recommended' | 'optional'
export type FieldInput = 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array' | 'custom'
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
  /** UI hint for the form renderer. Default 'text'. 'custom' = the renderer
   *  special-cases this key with a bespoke component (e.g. ServiceAreaEditor)
   *  instead of a generic control. */
  input?: FieldInput
  /** Options for select inputs. */
  options?: readonly FieldOption[]
  /** critical = blocks launch (delta 2) · recommended/optional = collected but non-blocking. */
  tier: FieldTier
  /** Derived/computed — surfaced in readiness but NOT writable via the profile PATCH. */
  readonly?: boolean
  /**
   * Who this field is for. 'tenant' (default, omit to mean this) = shown and
   * writable in the tenant-facing onboarding wizard/questionnaire.
   * 'admin' = internal-only (account ownership, contract terms, cancellation) —
   * hidden from the public /onboard/[token] link entirely, and the write API
   * rejects it from a token-authenticated request even if a client forges the
   * key (see api/tenant-profile). Only writable via an authenticated FL-admin
   * session on admin/tenants/[id].
   */
  audience?: 'tenant' | 'admin'
  /**
   * Real question with a real value the tenant DOES own (unlike `audience:
   * 'admin'`, which hides a field entirely) -- but not something a typical
   * home-service business owner has on hand or should be typing into a
   * signup form: vendor API keys/secrets and internal
   * SEO/analytics config Full Loop provisions on their behalf. The public
   * /onboard/[token] link and dashboard wizard show these locked/grayed
   * with a "Full Loop sets this up" note instead of a live input. The admin
   * Profile Form ignores this flag and renders them normally -- an admin IS
   * the one who fills these in.
   */
  platformManaged?: boolean
  /**
   * Real, tenant-owned, fully editable field -- just not worth asking during
   * first-time onboarding (e.g. 22 of the 23 AI-persona fields: a business
   * owner filling out a signup form isn't going to write preferred sign-offs
   * and banned phrases before they've even seen their AI agent work). Hidden
   * from ProfileWizard (the public /onboard/[token] link + dashboard
   * onboarding) specifically; still fully visible/editable later in Settings
   * (AdditionalDetailsTab.tsx), which reads this same registry without this
   * filter. Distinct from `audience: 'admin'` (never tenant-visible at all)
   * and `readonly` (no editor anywhere, "set elsewhere").
   */
  onboardingHidden?: boolean
  /** If set, the field only applies to these funnels (delta 1 funnel-awareness). */
  funnels?: FunnelMode[]
  /**
   * Plain-language explanation shown under the field on the tenant-facing
   * wizard/onboarding link — for anyone who doesn't already know what "EIN"
   * or "fiscal year start" means. Omit when the label is self-explanatory.
   */
  help?: string
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
  /** Count of non-primary rows in tenant_locations. Readiness signal only. */
  secondaryLocationCount: number
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
const MONTH_OPTIONS: FieldOption[] = [
  { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
  { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
  { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 },
]
const PAYMENT_OPTIONS: FieldOption[] = [
  { label: 'Stripe (card)', value: 'stripe' },
  { label: 'Zelle', value: 'zelle' },
  { label: 'Venmo', value: 'venmo' },
  { label: 'Apple Cash', value: 'apple_cash' },
  { label: 'Cash', value: 'cash' },
  { label: 'Check', value: 'check' },
]
const TONE_OPTIONS = ['warm_friendly', 'professional', 'casual', 'luxury'] as const
const LANGUAGE_OPTIONS: FieldOption[] = [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }]
const EMOJI_OPTIONS = ['none', 'one_per_message', 'frequent'] as const
const DEPOSIT_OPTIONS = ['none', 'percent', 'flat'] as const
const SCOPE_OPTIONS = ['local', 'regional', 'national'] as const
const PAYOUT_METHOD_OPTIONS = ['stripe', 'check', 'other'] as const
const ACQUISITION_CHANNEL_OPTIONS = ['referral', 'inbound_form', 'cold_outbound', 'partner', 'other'] as const

/**
 * The field registry — the audited, comprehensive set of data a launched tenant
 * needs, mapped to the store each field truly lives in (grounded in settings.ts,
 * SiteConfig, service_types). Tier drives launch-blocking (critical) vs collected-
 * but-optional. The write API + form + readiness all read this one source.
 */
export const PROFILE_FIELDS: FieldDef[] = [
  // ── Identity ──────────────────────────────────────────────────────
  { key: 'businessName', label: 'Business name', section: 'identity', store: 'tenant', col: 'name', tier: 'critical', read: (x) => t(x, 'name'), help: 'What customers call you — this is what shows on your website and in texts/emails they get.' },
  { key: 'legalName', label: 'Legal entity name', section: 'identity', store: 'entity', col: 'legal_name', tier: 'recommended', read: (x) => e(x, 'legal_name'), help: 'The official name on your business registration/tax paperwork — often the same as your business name, but not always (e.g. "Smith Cleaning LLC" vs. "Sparkle Clean"). Leave blank if you\'re not sure; we can fix it later.' },
  { key: 'entityType', label: 'Entity type', section: 'identity', store: 'entity', col: 'entity_type', input: 'select', options: ENTITY_TYPE_OPTIONS, tier: 'recommended', read: (x) => e(x, 'entity_type'), help: 'How your business is legally structured. Check a past tax filing or ask your accountant if you\'re unsure — it\'s fine to skip for now.' },
  { key: 'ein', label: 'EIN / Tax ID', section: 'identity', store: 'entity', col: 'ein', tier: 'recommended', read: (x) => e(x, 'ein'), help: 'Your business\'s federal tax ID (like a Social Security number, but for the business) — the 9-digit number on your IRS confirmation letter. Not the same as your Social Security number. Skip if you don\'t have one yet.' },
  { key: 'fiscalYearStart', label: 'Fiscal year start (month)', section: 'identity', store: 'entity', col: 'fiscal_year_start', kind: 'number', input: 'select', options: MONTH_OPTIONS, tier: 'optional', read: (x) => e(x, 'fiscal_year_start'), help: 'The month your business "year" starts for accounting purposes. Most businesses use January — leave this blank unless you know yours is different.' },

  // ── Contact & location ────────────────────────────────────────────
  { key: 'phone', label: 'Business phone', section: 'contact', store: 'tenant', col: 'phone', tier: 'critical', read: (x) => t(x, 'phone') },
  { key: 'email', label: 'Business email', section: 'contact', store: 'tenant', col: 'email', tier: 'critical', read: (x) => t(x, 'email') },
  { key: 'address', label: 'Street address', section: 'contact', store: 'tenant', col: 'address', tier: 'critical', read: (x) => t(x, 'address') },
  { key: 'city', label: 'City', section: 'contact', store: 'entity', col: 'city', tier: 'recommended', read: (x) => e(x, 'city') },
  { key: 'state', label: 'State', section: 'contact', store: 'entity', col: 'state', tier: 'recommended', read: (x) => e(x, 'state') },
  { key: 'zip', label: 'ZIP', section: 'contact', store: 'entity', col: 'zip', tier: 'recommended', read: (x) => e(x, 'zip') },
  { key: 'websiteUrl', label: 'Website', section: 'contact', store: 'tenant', col: 'website_url', tier: 'recommended', read: (x) => t(x, 'website_url') },
  { key: 'ownerEmail', label: 'Owner / admin email', section: 'contact', store: 'tenant', col: 'owner_email', tier: 'recommended', read: (x) => t(x, 'owner_email') },
  { key: 'leadNotificationEmail', label: 'Lead alert email', section: 'contact', store: 'tenant', col: 'lead_notification_email', tier: 'recommended', help: 'Where WE send you an alert the moment a new lead comes in from your website or booking form — usually the same as your business email, but can be different if you want leads routed to someone else.', read: (x) => t(x, 'lead_notification_email') },

  // ── Secondary contact ── kept with the rest of primary contact info,
  // not buried near the service-area settings below.
  { key: 'secondaryContactName', label: 'Secondary contact name', section: 'contact', store: 'tenant', col: 'secondary_contact_name', tier: 'optional', help: 'A backup person we can reach if you\'re unavailable — a partner, manager, or office admin. Optional.', read: (x) => t(x, 'secondary_contact_name') },
  { key: 'secondaryContactEmail', label: 'Secondary contact email', section: 'contact', store: 'tenant', col: 'secondary_contact_email', tier: 'optional', read: (x) => t(x, 'secondary_contact_email') },
  { key: 'secondaryContactPhone', label: 'Secondary contact phone', section: 'contact', store: 'tenant', col: 'secondary_contact_phone', tier: 'optional', read: (x) => t(x, 'secondary_contact_phone') },

  // ── Service area ─── scope/states/zones owned by ServiceAreaEditor (selena_config.service_area).
  // `serviceScope` stays readonly (unchanged, still drives readiness). `serviceArea`
  // is the new WRITABLE field: the whole {scope, states, zones} object, written
  // atomically as one selena_config key so it round-trips through the same
  // ServiceAreaEditor component the self-serve /onboarding signup already uses —
  // no duplicate service-area UI, no risk of clobbering states/zones by writing
  // just the scope.
  { key: 'serviceScope', label: 'Service scope', section: 'contact', store: 'selena', readonly: true, input: 'select', options: SCOPE_OPTIONS, tier: 'critical', read: (x) => (s(x, 'service_area') as Record<string, unknown> | undefined)?.scope },
  { key: 'serviceArea', label: 'Service area', section: 'contact', store: 'selena', col: 'service_area', input: 'custom', tier: 'critical', read: (x) => s(x, 'service_area') },
  { key: 'serviceRadius', label: 'Service radius (mi)', section: 'contact', store: 'tenant', col: 'service_radius_miles', kind: 'number', input: 'number', tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'service_radius_miles') },
  { key: 'serviceLat', label: 'Geocoded center', section: 'contact', store: 'tenant', readonly: true, tier: 'optional', read: (x) => t(x, 'service_area_lat') },
  { key: 'timezone', label: 'Timezone', section: 'scheduling', store: 'tenant', col: 'timezone', tier: 'critical', read: (x) => t(x, 'timezone') },

  // Locations beyond the primary are a 1:N relationship (tenant_locations) —
  // not a scalar field. This is a readonly readiness signal only; the actual
  // add/edit/remove UI is its own small component + API (see file header).
  { key: 'hasSecondaryLocations', label: 'Additional locations', section: 'contact', store: 'tenant', readonly: true, tier: 'optional', read: (x) => x.secondaryLocationCount > 0 },

  // ── Brand & site ──────────────────────────────────────────────────
  { key: 'logoUrl', label: 'Logo', section: 'brand', store: 'tenant', col: 'logo_url', tier: 'recommended', read: (x) => t(x, 'logo_url') },
  { key: 'primaryColor', label: 'Primary color', section: 'brand', store: 'tenant', col: 'primary_color', input: 'color', tier: 'recommended', read: (x) => t(x, 'primary_color') },
  { key: 'secondaryColor', label: 'Secondary color', section: 'brand', store: 'tenant', col: 'secondary_color', input: 'color', tier: 'optional', read: (x) => t(x, 'secondary_color') },
  { key: 'tagline', label: 'Tagline', section: 'brand', store: 'tenant', col: 'tagline', tier: 'recommended', read: (x) => t(x, 'tagline') },
  { key: 'businessDescription', label: 'What the business does', section: 'brand', store: 'selena', col: 'business_description', input: 'textarea', tier: 'critical', read: (x) => s(x, 'business_description') },
  { key: 'businessStory', label: 'Your story', section: 'brand', store: 'selena', col: 'business_story', input: 'textarea', tier: 'optional', read: (x) => s(x, 'business_story') },
  { key: 'targetCustomer', label: 'Target customer', section: 'brand', store: 'selena', col: 'target_customer', input: 'textarea', tier: 'optional', read: (x) => s(x, 'target_customer') },
  { key: 'competitors', label: 'Competitors', section: 'brand', store: 'selena', col: 'competitors', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'competitors') },
  { key: 'differentiators', label: 'What makes you different', section: 'brand', store: 'selena', col: 'differentiators', input: 'textarea', tier: 'optional', read: (x) => s(x, 'differentiators') },
  // Whole {facebook, instagram, tiktok, linkedin, youtube, x} object, written
  // atomically as one selena_config.social key — same reasoning as serviceArea:
  // preserves the existing nested storage shape other readers (site footer,
  // schema.org) already expect, and a custom renderer handles the sub-fields.
  { key: 'socialLinks', label: 'Social links', section: 'brand', store: 'selena', col: 'social', input: 'custom', tier: 'optional', read: (x) => x.social },

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
  // Array of {date, label, recurring} — same free-form jsonb-array pattern as
  // defaultWorkingDays/teamRoles below; the form renders its own small
  // date-list editor for this key rather than a generic array input.
  { key: 'holidayDates', label: 'Holidays / blackout dates', section: 'scheduling', store: 'selena', col: 'holiday_dates', input: 'custom', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'holiday_dates') },

  // ── Payments (booking/pipeline) ───────────────────────────────────
  { key: 'paymentMethods', label: 'Payment methods', section: 'payments', store: 'tenant', col: 'payment_methods', kind: 'array', input: 'array', options: PAYMENT_OPTIONS, tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'payment_methods') },
  { key: 'stripeKey', label: 'Stripe secret key', section: 'payments', store: 'tenant', col: 'stripe_api_key', tier: 'recommended', platformManaged: true, funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_api_key') },
  { key: 'stripeAccountId', label: 'Stripe account ID', section: 'payments', store: 'tenant', col: 'stripe_account_id', tier: 'optional', platformManaged: true, funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_account_id') },
  { key: 'zelleEmail', label: 'Zelle email', section: 'payments', store: 'tenant', col: 'zelle_email', tier: 'optional', help: 'The email address tied to your business\'s Zelle account — this is what we show clients so they know where to send a Zelle payment.', read: (x) => t(x, 'zelle_email') },
  { key: 'venmoHandle', label: 'Venmo @handle', section: 'payments', store: 'tenant', col: 'venmo_handle', tier: 'optional', help: 'Your business\'s Venmo username (the "@name" clients search for to pay you) — shown to clients as a payment option.', read: (x) => t(x, 'venmo_handle') },
  { key: 'appleCashPhone', label: 'Apple Cash phone number', section: 'payments', store: 'tenant', col: 'apple_cash_phone', tier: 'optional', help: 'Apple Cash lets iPhone users send money straight from Messages, like Venmo but built into iMessage. If you accept it, this is the phone number clients send payment to. Skip if you don\'t use it.', read: (x) => t(x, 'apple_cash_phone') },

  // ── Comms & integrations ──────────────────────────────────────────
  { key: 'resendKey', label: 'Sending email key (Resend)', section: 'comms', store: 'tenant', col: 'resend_api_key', tier: 'critical', platformManaged: true, read: (x) => t(x, 'resend_api_key') },
  { key: 'resendDomain', label: 'Sending domain', section: 'comms', store: 'tenant', col: 'resend_domain', tier: 'recommended', platformManaged: true, read: (x) => t(x, 'resend_domain') },
  { key: 'emailFrom', label: 'Sender email address', section: 'comms', store: 'tenant', col: 'email_from', tier: 'recommended', help: 'The email address clients see as the sender when we email them on your behalf — invoices, booking confirmations, receipts. Usually something like hello@yourbusiness.com.', read: (x) => t(x, 'email_from') },
  { key: 'telnyxKey', label: 'SMS key (Telnyx)', section: 'comms', store: 'tenant', col: 'telnyx_api_key', tier: 'recommended', platformManaged: true, read: (x) => t(x, 'telnyx_api_key') },
  { key: 'telnyxPhone', label: 'SMS number', section: 'comms', store: 'tenant', col: 'telnyx_phone', tier: 'recommended', platformManaged: true, read: (x) => t(x, 'telnyx_phone') },
  { key: 'telegramBotToken', label: 'Telegram bot token', section: 'comms', store: 'tenant', col: 'telegram_bot_token', tier: 'optional', platformManaged: true, read: (x) => t(x, 'telegram_bot_token') },
  { key: 'telegramChatId', label: 'Telegram chat ID', section: 'comms', store: 'tenant', col: 'telegram_chat_id', tier: 'optional', platformManaged: true, read: (x) => t(x, 'telegram_chat_id') },
  { key: 'anthropicKey', label: 'Anthropic key (AI)', section: 'comms', store: 'tenant', col: 'anthropic_api_key', tier: 'optional', platformManaged: true, read: (x) => t(x, 'anthropic_api_key') },

  // ── Reviews (booking/pipeline) ────────────────────────────────────
  { key: 'reviewTarget', label: 'Google Place ID', section: 'reviews', store: 'tenant', col: 'google_place_id', tier: 'recommended', platformManaged: true, funnels: ['booking', 'pipeline'], read: (x) => t(x, 'google_place_id') || s(x, 'google_review_link') },
  { key: 'reviewLink', label: 'Review link', section: 'reviews', store: 'selena', col: 'google_review_link', tier: 'optional', funnels: ['booking', 'pipeline'], help: 'Where a customer lands when we ask them to leave you a review (e.g. your Google Business Profile review link). You can add more than one.', read: (x) => s(x, 'google_review_link') },
  // Auto Review Follow-up removed from onboarding (2026-08-01) -- an
  // adjust-later setting, not a decision to force during first-time setup.
  // No dedicated Reviews-settings page has this toggle yet either; the
  // underlying tenants.selena_config.review_followup_enabled column and
  // its behavior are untouched, just no editor anywhere right now.

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
  { key: 'aiName', label: 'What would you like to name your agent?', section: 'ai', store: 'selena', col: 'ai_name', tier: 'recommended', help: 'This is your digital AI administrator — it answers client questions, books jobs, and follows up, all under whatever name you give it. You can fine-tune how it talks and its policies anytime later in Settings.', read: (x) => s(x, 'ai_name') },
  { key: 'tone', label: 'Voice / tone', section: 'ai', onboardingHidden: true, store: 'selena', col: 'tone', input: 'select', options: TONE_OPTIONS, tier: 'recommended', read: (x) => s(x, 'tone') },
  { key: 'language', label: 'Primary language', section: 'ai', onboardingHidden: true, store: 'selena', col: 'language', input: 'select', options: LANGUAGE_OPTIONS, tier: 'recommended', read: (x) => s(x, 'language') },
  { key: 'greeting', label: 'Chat greeting', section: 'ai', onboardingHidden: true, store: 'selena', col: 'greeting', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'greeting') },
  { key: 'emojiUsage', label: 'Emoji usage', section: 'ai', onboardingHidden: true, store: 'selena', col: 'emoji_usage', input: 'select', options: EMOJI_OPTIONS, tier: 'optional', read: (x) => s(x, 'emoji_usage') },

  // ── AI persona: voice & personality (2026-07-30) ───────────────────
  // openingLines/signOff/phrasesToAvoid/neverDo all round-trip through
  // persona-file.ts's Persona keys of the SAME name (opening_lines, sign_off,
  // banned_phrases, never_do) — already folded into the assembled prompt,
  // just previously had no onboarding UI field to populate them from.
  { key: 'openingLines', label: 'Preferred opening lines', section: 'ai', onboardingHidden: true, store: 'selena', col: 'opening_lines', kind: 'array', input: 'array', tier: 'recommended', read: (x) => s(x, 'opening_lines') },
  { key: 'signOff', label: 'Preferred sign-offs', section: 'ai', onboardingHidden: true, store: 'selena', col: 'sign_off', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'sign_off') },
  { key: 'phrasesToUse', label: 'Phrases to use', section: 'ai', onboardingHidden: true, store: 'selena', col: 'phrases_to_use', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'phrases_to_use') },
  { key: 'phrasesToAvoid', label: 'Phrases / words to never say', section: 'ai', onboardingHidden: true, store: 'selena', col: 'banned_phrases', kind: 'array', input: 'array', tier: 'recommended', read: (x) => s(x, 'banned_phrases') },
  { key: 'neverDo', label: 'Things the agent must never do or promise (e.g. "never say guaranteed", "never discuss competitors by name")', section: 'ai', onboardingHidden: true, store: 'selena', col: 'never_do', kind: 'array', input: 'array', tier: 'recommended', read: (x) => s(x, 'never_do') },

  // ── AI persona: policies the agent needs to know, not guess (2026-07-30) ──
  // Blank/not-applicable is a real, supported answer: buildPlaybook/persona-file
  // render an explicit "no policy on file — escalate to a human" line instead
  // of guessing, so leaving these blank never causes a hallucinated policy.
  { key: 'cancellationPolicy', label: 'Cancellation policy (blank = agent defers to a human)', section: 'ai', onboardingHidden: true, store: 'selena', col: 'cancellation_policy', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'cancellation_policy') },
  { key: 'reschedulePolicy', label: 'Rescheduling policy (blank = agent defers to a human)', section: 'ai', onboardingHidden: true, store: 'selena', col: 'reschedule_policy', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'reschedule_policy') },
  { key: 'refundPolicy', label: 'Refund policy', section: 'ai', onboardingHidden: true, store: 'selena', col: 'refund_policy', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'refund_policy') },
  { key: 'latePaymentPolicy', label: 'Late-payment / overdue-invoice handling (blank = agent defers to a human)', section: 'ai', onboardingHidden: true, store: 'selena', col: 'late_payment_policy', input: 'textarea', tier: 'recommended', read: (x) => s(x, 'late_payment_policy') },
  { key: 'outOfScope', label: 'Explicitly out of scope (what you do NOT do)', section: 'ai', onboardingHidden: true, store: 'selena', col: 'out_of_scope', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'out_of_scope') },

  // ── AI persona: real FAQ (2026-07-30) ──────────────────────────────
  // Structured {question, answer} pairs, in the tenant's own words — distinct
  // from objectionHandlers below (a customer QUESTION vs. a sales OBJECTION).
  { key: 'faqs', label: 'Real customer FAQ (5-10 questions customers actually ask)', section: 'ai', onboardingHidden: true, store: 'selena', col: 'faqs', input: 'custom', tier: 'recommended', read: (x) => s(x, 'faqs') },
  { key: 'objectionHandlers', label: 'Known objections & how to handle them', section: 'ai', onboardingHidden: true, store: 'selena', col: 'objection_handlers', input: 'custom', tier: 'optional', read: (x) => s(x, 'objection_handlers') },

  // ── AI persona: escalation preferences (2026-07-30) ────────────────
  { key: 'escalationTriggers', label: 'When the agent should hand off to a human', section: 'ai', onboardingHidden: true, store: 'selena', col: 'escalation_triggers', kind: 'array', input: 'array', tier: 'recommended', read: (x) => s(x, 'escalation_triggers') },
  { key: 'escalationContact', label: 'Who escalations go to (name + phone/email — not "someone")', section: 'ai', onboardingHidden: true, store: 'selena', col: 'escalation_contact', tier: 'critical', read: (x) => s(x, 'escalation_contact') },
  { key: 'escalationResponseTime', label: 'Response-time promise made to customers', section: 'ai', onboardingHidden: true, store: 'selena', col: 'escalation_response_time', tier: 'recommended', read: (x) => s(x, 'escalation_response_time') },

  // ── AI persona: upsell / cross-sell guidance (2026-07-30) ──────────
  { key: 'addons', label: 'Add-ons to proactively offer', section: 'ai', onboardingHidden: true, store: 'selena', col: 'addons', input: 'custom', tier: 'optional', read: (x) => s(x, 'addons') },
  { key: 'upsellTriggers', label: 'When to upsell', section: 'ai', onboardingHidden: true, store: 'selena', col: 'upsell_triggers', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'upsell_triggers') },
  { key: 'neverUpsell', label: 'What to never push', section: 'ai', onboardingHidden: true, store: 'selena', col: 'never_upsell', kind: 'array', input: 'array', tier: 'optional', read: (x) => s(x, 'never_upsell') },

  // ── AI persona: operational context (2026-07-30) ───────────────────
  // Business hours already exist (businessHoursStart/End, scheduling section)
  // and are now surfaced to the agent automatically — no separate field here.
  { key: 'capacityNote', label: 'Current team-capacity heads-up (e.g. "fully booked through next week") — blank = agent relies on real availability tools only', section: 'ai', onboardingHidden: true, store: 'selena', col: 'capacity_note', input: 'textarea', tier: 'optional', read: (x) => s(x, 'capacity_note') },

  // ── Finance display ───────────────────────────────────────────────
  { key: 'taxRate', label: 'Tax rate %', section: 'identity', store: 'selena', col: 'tax_rate', kind: 'number', input: 'number', tier: 'optional', read: (x) => s(x, 'tax_rate') },
  { key: 'expenseCategories', label: 'Expense categories', section: 'identity', store: 'tenant', col: 'expense_categories', kind: 'array', input: 'array', tier: 'optional', read: (x) => t(x, 'expense_categories') },

  // ── Compliance ────────────────────────────────────────────────────
  { key: 'license', label: 'Trade license #', section: 'compliance', store: 'compliance', col: 'license_number', tier: 'recommended', read: (x) => c(x, 'license_number') },
  { key: 'licenseState', label: 'License state', section: 'compliance', store: 'compliance', col: 'license_state', tier: 'optional', read: (x) => c(x, 'license_state') },
  { key: 'licenseExpiry', label: 'License expiry', section: 'compliance', store: 'compliance', col: 'license_expiry', tier: 'optional', read: (x) => c(x, 'license_expiry') },
  { key: 'insuranceCarrier', label: 'Insurance carrier', section: 'compliance', store: 'compliance', col: 'insurance_carrier', tier: 'recommended', read: (x) => c(x, 'insurance_carrier') },
  { key: 'insurancePolicy', label: 'Policy #', section: 'compliance', store: 'compliance', col: 'insurance_policy', tier: 'optional', read: (x) => c(x, 'insurance_policy') },
  { key: 'insuranceCoverage', label: 'Coverage amount', section: 'compliance', store: 'compliance', col: 'insurance_coverage', tier: 'optional', read: (x) => c(x, 'insurance_coverage') },
  { key: 'bonded', label: 'Bonded', section: 'compliance', store: 'compliance', col: 'bonded', kind: 'bool', input: 'toggle', tier: 'optional', read: (x) => c(x, 'bonded') },
  // Doc URLs — the form reuses whatever upload widget the job-photo flow
  // already has, POSTs to storage, and writes the resulting URL through this
  // same text field. No new upload plumbing.
  { key: 'insuranceCertUrl', label: 'Certificate of insurance', section: 'compliance', store: 'compliance', col: 'insurance_cert_url', tier: 'recommended', read: (x) => c(x, 'insurance_cert_url') },
  { key: 'licenseDocUrl', label: 'Business license (scan)', section: 'compliance', store: 'compliance', col: 'license_doc_url', tier: 'optional', read: (x) => c(x, 'license_doc_url') },
  { key: 'w9Url', label: 'W-9', section: 'compliance', store: 'compliance', col: 'w9_url', tier: 'optional', read: (x) => c(x, 'w9_url') },

  // ── Lead handling / SEO ───────────────────────────────────────────
  { key: 'autoRespondLeads', label: 'Auto-respond to leads', section: 'seo', store: 'selena', col: 'auto_respond_leads', kind: 'bool', input: 'toggle', tier: 'optional', read: (x) => s(x, 'auto_respond_leads') },
  { key: 'attributionWindow', label: 'Attribution window (hrs)', section: 'seo', store: 'tenant', col: 'attribution_window_hours', kind: 'number', input: 'number', tier: 'optional', platformManaged: true, read: (x) => t(x, 'attribution_window_hours') },
  { key: 'indexnow', label: 'IndexNow key', section: 'seo', store: 'tenant', col: 'indexnow_key', tier: 'optional', platformManaged: true, read: (x) => t(x, 'indexnow_key') },

  // ── Account (FL-internal — never shown on the public onboarding link) ──
  { key: 'accountOwner', label: 'Account owner', section: 'account', store: 'tenant', col: 'account_owner', audience: 'admin', tier: 'optional', read: (x) => t(x, 'account_owner') },
  { key: 'acquisitionChannel', label: 'Acquisition channel', section: 'account', store: 'tenant', col: 'acquisition_channel', audience: 'admin', input: 'select', options: ACQUISITION_CHANNEL_OPTIONS, tier: 'optional', read: (x) => t(x, 'acquisition_channel') },
  { key: 'contractSignedAt', label: 'Contract signed', section: 'account', store: 'tenant', col: 'contract_signed_at', audience: 'admin', tier: 'optional', read: (x) => t(x, 'contract_signed_at') },
  { key: 'contractTermMonths', label: 'Contract term (months)', section: 'account', store: 'tenant', col: 'contract_term_months', kind: 'number', input: 'number', audience: 'admin', tier: 'optional', read: (x) => t(x, 'contract_term_months') },
  { key: 'trialEndsAt', label: 'Trial ends', section: 'account', store: 'tenant', col: 'trial_ends_at', audience: 'admin', tier: 'optional', read: (x) => t(x, 'trial_ends_at') },
  { key: 'cancelledAt', label: 'Cancelled at', section: 'account', store: 'tenant', col: 'cancelled_at', audience: 'admin', tier: 'optional', read: (x) => t(x, 'cancelled_at') },
  { key: 'cancellationReason', label: 'Cancellation reason', section: 'account', store: 'tenant', col: 'cancellation_reason', input: 'textarea', audience: 'admin', tier: 'optional', read: (x) => t(x, 'cancellation_reason') },
  // Preference only — actual money movement stays on Stripe Connect via the
  // existing `stripeAccountId` field above. Never store bank account/routing
  // numbers here.
  { key: 'payoutMethod', label: 'Payout method', section: 'account', store: 'tenant', col: 'payout_method', input: 'select', options: PAYOUT_METHOD_OPTIONS, audience: 'admin', tier: 'optional', read: (x) => t(x, 'payout_method') },
]

/** Fast lookup by field key. */
export const PROFILE_FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  PROFILE_FIELDS.map((f) => [f.key, f]),
)

/**
 * Section order + display copy — the SINGLE source of truth for every
 * surface that groups PROFILE_FIELDS into sections (the public
 * /onboard/[token] link, the in-dashboard onboarding wizard, and the admin
 * Profile Form all import this instead of keeping their own copy). Previously
 * each of those kept its own hand-written order/title list and they drifted
 * out of sync with each other (e.g. AI Persona was step 14 on one and step
 * 12 on another) -- fixed 2026-08-01 by deleting the duplicates in favor of
 * this one array.
 */
export const PROFILE_SECTION_META: Record<ProfileSection, { title: string; blurb: string }> = {
  identity: { title: 'Business Identity', blurb: 'Legal details for invoices, taxes, and 1099/W-2 filing.' },
  contact: { title: 'Address & Contact', blurb: 'Where you operate and how customers reach you.' },
  brand: { title: 'Brand', blurb: 'How your business looks and sounds across your site and AI.' },
  services: { title: 'Services & Pricing', blurb: 'What you charge — the rest is set per-service.' },
  scheduling: { title: 'Scheduling', blurb: 'Hours, booking rules, and holidays.' },
  payments: { title: 'Payments', blurb: 'How clients pay you.' },
  comms: { title: 'Communications', blurb: 'How you send email, text, and AI replies.' },
  reviews: { title: 'Reviews', blurb: 'Where review requests point.' },
  referrals: { title: 'Referrals', blurb: 'Commission and payout rules for your referral program.' },
  proposals: { title: 'Proposals', blurb: 'Terms and deposit rules for pipeline-funnel quotes.' },
  team: { title: 'Team Defaults', blurb: 'Defaults applied to new team members.' },
  compliance: { title: 'Licensing & Insurance', blurb: 'Trade credentials that build trust and meet compliance.' },
  seo: { title: 'Lead Handling & SEO', blurb: 'How leads are captured and attributed.' },
  ai: { title: 'AI Persona', blurb: 'How your AI agent sounds and behaves.' },
  account: { title: 'Account', blurb: 'Internal account details.' },
}

export const PROFILE_SECTION_ORDER: ProfileSection[] = [
  'identity', 'contact', 'brand', 'services', 'scheduling',
  'payments', 'comms', 'reviews', 'referrals', 'proposals',
  'team', 'compliance', 'seo', 'ai',
]

/**
 * Stable "6.3"-style display number for every non-readonly field — section
 * index . position within section, both computed purely from PROFILE_FIELDS'
 * own declaration order. Dot-notation instead of letters (6A, 6B) because
 * some sections (ai) run past 20 fields.
 *
 * Every surface that shows a field to a person (the public /onboard/[token]
 * link, the in-dashboard wizard, the admin Profile Form) imports this instead
 * of computing its own -- that's what makes "field 6.3" mean the exact same
 * field everywhere, structurally, not by coincidence. Readonly/derived
 * fields (serviceScope, servicePricing, …) are excluded: they're
 * supplementary "(set elsewhere)" context on the admin form, not a numbered
 * question, and the tenant-facing wizard never shows them at all -- giving
 * them a number would make the two surfaces' counts disagree.
 */
export const PROFILE_FIELD_NUMBER: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  PROFILE_SECTION_ORDER.forEach((section, sectionIdx) => {
    let n = 0
    for (const f of PROFILE_FIELDS) {
      if (f.section !== section || f.readonly) continue
      n += 1
      out[f.key] = `${sectionIdx + 1}.${n}`
    }
  })
  return out
})()

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
  const [{ data: tenant }, { data: entity }, { data: svcRows }, { count: locationCount }] = await Promise.all([
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
    supabaseAdmin
      .from('tenant_locations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_primary', false)
      .eq('active', true),
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
    secondaryLocationCount: locationCount || 0,
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

/**
 * Is this field visible/writable from the tenant-facing surface (the public
 * /onboard/[token] link and the in-dashboard onboarding wizard)? Fields
 * without an explicit `audience` default to 'tenant'. Admin-only fields
 * (account ownership, contract terms, cancellation, payout method) are
 * filtered out of GET responses and rejected on write when the caller is
 * token-authenticated — see api/tenant-profile/route.ts.
 */
export function isTenantVisible(f: FieldDef): boolean {
  return (f.audience ?? 'tenant') === 'tenant'
}
