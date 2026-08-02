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
import { INDUSTRY_OPTIONS } from './industry-presets'
import { US_STATES } from './service-area'

export type FunnelMode = 'booking' | 'pipeline' | 'lead_only'

export type ProfileSection =
  | 'identity' | 'contact' | 'brand' | 'services' | 'scheduling'
  | 'payments' | 'comms' | 'reviews' | 'referrals' | 'proposals'
  | 'team' | 'compliance' | 'seo' | 'ai' | 'account'

type Store = 'tenant' | 'entity' | 'selena' | 'compliance'

export type FieldTier = 'critical' | 'recommended' | 'optional'
export type FieldInput = 'text' | 'textarea' | 'number' | 'select' | 'color' | 'toggle' | 'array' | 'custom' | 'date'
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
  /**
   * Only shown/writable when another field in the SAME form currently has
   * this exact value (e.g. the referral commission/payout fields only
   * appear once "Do you want to run a referral program?" is answered yes)
   * -- keeps a section from front-loading detail fields nobody needs yet
   * instead of asking a simple yes/no first. Checked against live in-form
   * state, not the saved value, so toggling updates visibility immediately.
   */
  dependsOn?: { key: string; value: unknown }
  /** If set, the field only applies to these funnels (delta 1 funnel-awareness). */
  funnels?: FunnelMode[]
  /**
   * Plain-language explanation shown under the field on the tenant-facing
   * wizard/onboarding link — for anyone who doesn't already know what "EIN"
   * or "fiscal year start" means. Omit when the label is self-explanatory.
   */
  help?: string
  /**
   * Real-shape check beyond "non-empty" — e.g. an EIN must look like an EIN,
   * not just have one character in it. Declarative (not a function) so it can
   * cross the API boundary to the client for inline feedback instead of only
   * failing silently server-side at the readiness/activate gate. A field that
   * fails validation does NOT count as `filled` for readiness purposes, same
   * as if it were blank — see passesValidation/isFilled usage in
   * getTenantProfile below.
   */
  validation?: FieldValidation
  /** Pull the raw value from the loaded context. */
  read: (ctx: ProfileContext) => unknown
}

export interface FieldValidation {
  kind: 'regex' | 'minLength'
  /** Required when kind === 'regex'. Source text of the RegExp (no flags). */
  pattern?: string
  /** Required when kind === 'minLength'. Digits-only length for phone-shaped fields when digitsOnly is set. */
  minLength?: number
  /** minLength only: strip everything but digits before measuring length (phone numbers with formatting punctuation). */
  digitsOnly?: boolean
  /** Shown under the field when the current value is non-empty but fails this check. */
  message: string
}

/** Non-empty AND (no validation rule, or the rule passes). Mirrors isFilled's null-safety. */
export function passesValidation(value: unknown, validation: FieldValidation | undefined): boolean {
  if (!validation) return true
  const s = typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
  if (!s) return true // emptiness is isFilled's job, not validation's
  if (validation.kind === 'regex') return new RegExp(validation.pattern || '').test(s)
  if (validation.kind === 'minLength') {
    const measured = validation.digitsOnly ? s.replace(/\D/g, '') : s
    return measured.length >= (validation.minLength ?? 0)
  }
  return true
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
  { label: 'Stripe (card, Apple Pay, Cash App)', value: 'stripe' },
]
const TONE_OPTIONS = ['warm_friendly', 'professional', 'casual', 'luxury'] as const
const LANGUAGE_OPTIONS: FieldOption[] = [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }]
const EMOJI_OPTIONS = ['none', 'one_per_message', 'frequent'] as const
const DEPOSIT_OPTIONS = ['none', 'percent', 'flat'] as const
const SCOPE_OPTIONS = ['local', 'regional', 'national'] as const
const PAYOUT_METHOD_OPTIONS = ['stripe', 'check', 'other'] as const
const ACQUISITION_CHANNEL_OPTIONS = ['referral', 'inbound_form', 'cold_outbound', 'partner', 'other'] as const
const STATE_OPTIONS: FieldOption[] = US_STATES.map((s) => ({ label: s.name, value: s.code }))

// Common US IANA zones -- tap/select instead of free-typing a zone name.
const TIMEZONE_OPTIONS: FieldOption[] = [
  { label: 'Eastern Time', value: 'America/New_York' },
  { label: 'Central Time', value: 'America/Chicago' },
  { label: 'Mountain Time', value: 'America/Denver' },
  { label: 'Mountain Time — Arizona (no DST)', value: 'America/Phoenix' },
  { label: 'Pacific Time', value: 'America/Los_Angeles' },
  { label: 'Alaska Time', value: 'America/Anchorage' },
  { label: 'Hawaii Time', value: 'Pacific/Honolulu' },
]

// Hourly options for business open/close time selects. Stored as "HH:00"
// (24hr) -- parseHour() in settings.ts already reads the leading integer
// off whatever string is stored, so this stays compatible with the
// existing "09:00"-style TEXT column without a format change.
export const HOUR_OPTIONS: { label: string; value: string }[] = Array.from({ length: 24 }, (_, h) => {
  const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
  return { label, value: `${String(h).padStart(2, '0')}:00` }
})

const BUFFER_OPTIONS: FieldOption[] = [
  { label: 'No buffer', value: 0 }, { label: '15 min', value: 15 }, { label: '30 min', value: 30 },
  { label: '45 min', value: 45 }, { label: '1 hour', value: 60 },
]

export const MIN_DAYS_OPTIONS: { label: string; value: number }[] = [
  { label: 'Same day', value: 0 }, { label: '1 day', value: 1 }, { label: '2 days', value: 2 },
  { label: '3 days', value: 3 }, { label: '1 week', value: 7 },
]

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const WEEKDAY_LABELS: Record<(typeof WEEKDAY_KEYS)[number], string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

// Common small-business expense categories, checkbox-selected against this
// fixed list instead of free-typed comma-separated text — see
// EXPENSE_CATEGORY_PRESETS' ProfileWizard custom renderer. No "other" escape
// hatch by design (Jeff's call, 2026-08-02): if this list is missing a real
// category a tenant needs, that's a signal to add it here for everyone, not
// a one-off free-text field that drifts.
export const EXPENSE_CATEGORY_PRESETS: string[] = [
  'Vehicle & Fuel', 'Supplies & Materials', 'Equipment', 'Insurance', 'Payroll',
  'Marketing & Advertising', 'Software & Subscriptions', 'Rent & Utilities',
  'Professional Services', 'Travel', 'Meals & Entertainment', 'Licenses & Permits',
  'Repairs & Maintenance', 'Bank & Processing Fees', 'Other',
]

// Published state base sales tax rates (state-level only — most
// counties/cities add their own on top, sometimes several points higher,
// e.g. NYC's combined rate is well above New York's own 4% base). Offered as
// a starting-point dropdown once the tenant's state is known, not a claim of
// their exact combined rate — see the taxRate ProfileWizard custom renderer,
// which always lets them override with their real number. States with no
// sales tax (AK/DE/MT/NH/OR) are 0.
export const STATE_BASE_SALES_TAX: Record<string, number> = {
  AL: 4, AK: 0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35, DE: 0, FL: 6,
  GA: 4, HI: 4, ID: 6, IL: 6.25, IN: 7, IA: 6, KS: 6.5, KY: 6, LA: 4.45,
  ME: 5.5, MD: 6, MA: 6.25, MI: 6, MN: 6.875, MS: 7, MO: 4.225, MT: 0,
  NE: 5.5, NV: 6.85, NH: 0, NJ: 6.625, NM: 4.875, NY: 4, NC: 4.75, ND: 5,
  OH: 5.75, OK: 4.5, OR: 0, PA: 6, RI: 7, SC: 6, SD: 4.2, TN: 7, TX: 6.25,
  UT: 6.1, VT: 6, VA: 5.3, WA: 6.5, WV: 6, WI: 5, WY: 4, DC: 6,
}

/**
 * The field registry — the audited, comprehensive set of data a launched tenant
 * needs, mapped to the store each field truly lives in (grounded in settings.ts,
 * SiteConfig, service_types). Tier drives launch-blocking (critical) vs collected-
 * but-optional. The write API + form + readiness all read this one source.
 */
export const PROFILE_FIELDS: FieldDef[] = [
  // ── Identity ──────────────────────────────────────────────────────
  { key: 'businessName', label: 'Business name', section: 'identity', store: 'tenant', col: 'name', tier: 'critical', read: (x) => t(x, 'name'), help: 'What customers call you — this is what shows on your website and in texts/emails they get.' },
  { key: 'industry', label: 'Industry / trade', section: 'identity', store: 'tenant', col: 'industry', input: 'select', options: INDUSTRY_OPTIONS, tier: 'critical', read: (x) => t(x, 'industry'), help: 'What kind of work you do — this decides your starting service list, pricing style, and the questions your AI agent asks customers. Wrong or missing means we guess with generic defaults; you can always add/edit services later either way.' },
  { key: 'legalName', label: 'Legal entity name', section: 'identity', store: 'entity', col: 'legal_name', tier: 'critical', validation: { kind: 'minLength', minLength: 3, message: 'Enter the real name on your business paperwork, not a placeholder.' }, read: (x) => e(x, 'legal_name'), help: 'The official name on your business registration/tax paperwork — often the same as your business name, but not always (e.g. "Smith Cleaning LLC" vs. "Sparkle Clean"). We use this to set up your real Stripe and Telnyx accounts, so it needs to match your paperwork, not just be close.' },
  { key: 'entityType', label: 'Entity type', section: 'identity', store: 'entity', col: 'entity_type', input: 'select', options: ENTITY_TYPE_OPTIONS, tier: 'critical', read: (x) => e(x, 'entity_type'), help: 'How your business is legally structured. Check a past tax filing or ask your accountant if you\'re unsure — this is required by Stripe to verify your account for real payments.' },
  { key: 'ein', label: 'EIN / Tax ID', section: 'identity', store: 'entity', col: 'ein', tier: 'critical', validation: { kind: 'regex', pattern: '^\\d{2}-?\\d{7}$', message: 'Enter your real 9-digit EIN (XX-XXXXXXX) — this has to match what\'s on file with the IRS for Stripe and Telnyx to accept it.' }, read: (x) => e(x, 'ein'), help: 'Your business\'s federal tax ID (like a Social Security number, but for the business) — the 9-digit number on your IRS confirmation letter. Not the same as your Social Security number. Required to register your business texting number with Telnyx (federal SMS compliance) and to verify your Stripe account — without it, payments and texting can\'t go live.' },
  { key: 'fiscalYearStart', label: 'Fiscal year start (month)', section: 'identity', store: 'entity', col: 'fiscal_year_start', kind: 'number', input: 'select', options: MONTH_OPTIONS, tier: 'optional', read: (x) => e(x, 'fiscal_year_start'), help: 'The month your business "year" starts for accounting purposes. Most businesses use January — leave this blank unless you know yours is different.' },

  // ── Contact & location ────────────────────────────────────────────
  { key: 'phone', label: 'Business phone', section: 'contact', store: 'tenant', col: 'phone', tier: 'critical', help: 'The number customers call or text — shows on your site and booking confirmations.', validation: { kind: 'minLength', minLength: 10, digitsOnly: true, message: 'Enter a real 10-digit phone number.' }, read: (x) => t(x, 'phone') },
  { key: 'email', label: 'Business email', section: 'contact', store: 'tenant', col: 'email', tier: 'critical', help: 'Your business inbox — shows on your site and on invoices/receipts.', read: (x) => t(x, 'email') },
  { key: 'address', label: 'Street address', section: 'contact', store: 'tenant', col: 'address', input: 'custom', tier: 'critical', help: 'Your primary business address — verified via Radar, used to build your service area below and shown on invoices.', read: (x) => t(x, 'address') },
  { key: 'city', label: 'City', section: 'contact', store: 'entity', col: 'city', tier: 'recommended', help: 'Auto-fills when you pick your address above — edit if it\'s not quite right.', read: (x) => e(x, 'city') },
  { key: 'state', label: 'State', section: 'contact', store: 'entity', col: 'state', input: 'select', options: STATE_OPTIONS, tier: 'recommended', help: 'Auto-fills when you pick your address above.', read: (x) => e(x, 'state') },
  { key: 'zip', label: 'ZIP', section: 'contact', store: 'entity', col: 'zip', tier: 'recommended', help: 'Auto-fills when you pick your address above.', read: (x) => e(x, 'zip') },
  { key: 'websiteUrl', label: 'Website', section: 'contact', store: 'tenant', col: 'website_url', tier: 'recommended', help: 'Your existing website, if you have one — leave blank if you don\'t yet.', read: (x) => t(x, 'website_url') },
  { key: 'ownerEmail', label: 'Owner / admin email', section: 'contact', store: 'tenant', col: 'owner_email', tier: 'recommended', help: 'The owner\'s own login/notification email — separate from the public business email above.', read: (x) => t(x, 'owner_email') },
  { key: 'leadNotificationEmail', label: 'Lead alert email', section: 'contact', store: 'tenant', col: 'lead_notification_email', tier: 'recommended', help: 'Where WE send you an alert the moment a new lead comes in from your website or booking form — usually the same as your business email, but can be different if you want leads routed to someone else.', read: (x) => t(x, 'lead_notification_email') },

  // Was 3 separate scalar fields (name/email/phone), capped at exactly one
  // contact. Converted 2026-08-02 to a real repeatable list -- confirmed via
  // grep that nothing else in the codebase read the old secondary_contact_*
  // tenant columns, so no other consumer to update. Stored in selena_config
  // (jsonb) like faqs/teamRoleRates/addons -- no migration needed for a new
  // key. Each row: {name, email, phone, isPrimary}. NOTE: no `kind` set
  // (array-of-objects) -- do NOT set kind:'array', that coercion path
  // flattens to strings and corrupts the objects (caught live 2026-08-02).
  { key: 'secondaryContacts', label: 'Additional contacts', section: 'contact', store: 'selena', col: 'secondary_contacts', input: 'custom', tier: 'optional', help: 'Backup people we can reach — partners, managers, office admin. Add as many as you need; mark one as Primary if you have several.', read: (x) => s(x, 'secondary_contacts') },

  // ── Service area ─── scope/states/zones owned by ServiceAreaEditor (selena_config.service_area).
  // `serviceScope` stays readonly (unchanged, still drives readiness). `serviceArea`
  // is the new WRITABLE field: the whole {scope, states, zones} object, written
  // atomically as one selena_config key so it round-trips through the same
  // ServiceAreaEditor component the self-serve /onboarding signup already uses —
  // no duplicate service-area UI, no risk of clobbering states/zones by writing
  // just the scope.
  { key: 'serviceScope', label: 'Service scope', section: 'contact', store: 'selena', readonly: true, input: 'select', options: SCOPE_OPTIONS, tier: 'critical', read: (x) => (s(x, 'service_area') as Record<string, unknown> | undefined)?.scope },
  { key: 'serviceArea', label: 'Service area', section: 'contact', store: 'selena', col: 'service_area', input: 'custom', tier: 'critical', help: 'This is for SEO — it decides where we target you to attract leads and job applicants from.', read: (x) => s(x, 'service_area') },
  { key: 'serviceRadius', label: 'Service radius (mi)', section: 'contact', store: 'tenant', col: 'service_radius_miles', kind: 'number', input: 'number', tier: 'critical', help: 'How far from your address you\'ll travel for a job — drives the auto-filled coverage area above.', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'service_radius_miles') },
  { key: 'serviceLat', label: 'Geocoded center', section: 'contact', store: 'tenant', readonly: true, tier: 'optional', read: (x) => t(x, 'service_area_lat') },
  { key: 'timezone', label: 'Timezone', section: 'scheduling', store: 'tenant', col: 'timezone', input: 'select', options: TIMEZONE_OPTIONS, help: "Which timezone your business operates in — controls when texts, emails, and booking times are shown to customers.", tier: 'critical', read: (x) => t(x, 'timezone') },

  // Locations beyond the primary are a 1:N relationship (tenant_locations) —
  // not a scalar field. This is a readonly readiness signal only; the actual
  // add/edit/remove UI is its own small component + API (see file header).
  { key: 'hasSecondaryLocations', label: 'Additional locations', section: 'contact', store: 'tenant', readonly: true, tier: 'optional', read: (x) => x.secondaryLocationCount > 0 },

  // ── Brand & site ──────────────────────────────────────────────────
  { key: 'logoUrl', label: 'Logo', section: 'brand', store: 'tenant', col: 'logo_url', tier: 'recommended', help: 'A link to your logo image — upload it to Google Drive/Dropbox first, then paste a shareable link here.', read: (x) => t(x, 'logo_url') },
  { key: 'primaryColor', label: 'Primary color', section: 'brand', store: 'tenant', col: 'primary_color', input: 'color', tier: 'recommended', help: 'Your main brand color — used across your site and client emails.', read: (x) => t(x, 'primary_color') },
  { key: 'secondaryColor', label: 'Secondary color', section: 'brand', store: 'tenant', col: 'secondary_color', input: 'color', tier: 'optional', help: 'An accent color that pairs with your primary color.', read: (x) => t(x, 'secondary_color') },
  { key: 'tagline', label: 'Tagline', section: 'brand', store: 'tenant', col: 'tagline', tier: 'recommended', help: 'A short line under your business name — e.g. "Trusted cleaning since 2015."', read: (x) => t(x, 'tagline') },
  { key: 'businessDescription', label: 'What the business does', section: 'brand', store: 'selena', col: 'business_description', input: 'custom', tier: 'critical', help: 'Tap what applies to start, then edit or add to it — type or talk.', read: (x) => s(x, 'business_description') },
  { key: 'differentiators', label: 'What makes you different', section: 'brand', store: 'selena', col: 'differentiators', kind: 'array', input: 'custom', tier: 'optional', help: 'The real reasons a customer picks you over the next search result — tap what applies, add your own if it\'s not listed.', read: (x) => s(x, 'differentiators') },

  // Three short, voice-first identity questions (2026-08-02, Jeff's call) --
  // tags capture facts, these capture identity. Each is answerable in one
  // spoken sentence, on purpose -- real depth without turning into an
  // interview. Plain textarea (gets voice-to-text for free, see
  // FieldRenderer's textarea case in ProfileWizard.tsx), all optional.
  { key: 'brandKeyTakeaway', label: 'The one thing to remember', section: 'brand', store: 'selena', col: 'brand_key_takeaway', input: 'textarea', tier: 'optional', help: 'If a customer only remembers one thing about working with you, what should it be? One sentence is plenty.', read: (x) => s(x, 'brand_key_takeaway') },
  { key: 'brandProudMoment', label: 'Something you\'re proud of', section: 'brand', store: 'selena', col: 'brand_proud_moment', input: 'textarea', tier: 'optional', help: 'What\'s something a customer has actually said about you that you\'re genuinely proud of? Real words, not marketing-speak.', read: (x) => s(x, 'brand_proud_moment') },
  { key: 'brandNeverDo', label: 'What you\'d never do', section: 'brand', store: 'selena', col: 'brand_never_do', input: 'textarea', tier: 'optional', help: 'What would you never do, even if a customer asked? This is the kind of thing that makes your "why trust us" copy actually yours.', read: (x) => s(x, 'brand_never_do') },

  // ── Marketing (section key stays 'seo' -- see PROFILE_SECTION_META) ──
  // input:'custom' -- was 'textarea' on both, which meant the TapAppendChips
  // case already written for 'targetCustomer' in FieldRenderer was DEAD CODE
  // (that branch only runs when field.input === 'custom'). Real latent bug,
  // fixed 2026-08-02 alongside adding the same treatment to businessStory.
  { key: 'businessStory', label: 'Your story', section: 'seo', store: 'selena', col: 'business_story', input: 'custom', tier: 'optional', help: 'How the business started, in a sentence or two — tap a starting point or talk it through.', read: (x) => s(x, 'business_story') },
  { key: 'targetCustomer', label: 'Target customer', section: 'seo', store: 'selena', col: 'target_customer', input: 'custom', tier: 'optional', help: 'Who you\'re trying to reach — e.g. "busy families in North Jersey" or "property managers with 5+ units." Helps your site and AI speak to the right person.', read: (x) => s(x, 'target_customer') },
  { key: 'competitors', label: 'Competitors', section: 'seo', store: 'selena', col: 'competitors', kind: 'array', input: 'array', tier: 'optional', help: 'Other businesses customers compare you to. Optional, but helps us position you well in your marketing.', read: (x) => s(x, 'competitors') },
  // Auto-suggested from real data (catalog services + service area), not
  // invented from scratch -- see TargetKeywordsEditor in ProfileWizard.tsx,
  // which fetches /api/catalog itself (catalog items live in service_types,
  // not the onboarding form state) and reads serviceArea/city off
  // formSnapshot to build suggestions.
  { key: 'targetKeywords', label: 'Target keywords/services', section: 'seo', store: 'selena', col: 'target_keywords', kind: 'array', input: 'custom', tier: 'recommended', help: 'What you want to show up on Google for. Tap the suggestions below (built from your services + service area) or add your own.', read: (x) => s(x, 'target_keywords') },
  { key: 'googleBusinessProfileUrl', label: 'Google Business Profile link', section: 'seo', store: 'selena', col: 'google_business_profile_url', tier: 'optional', help: 'Paste the link to your Google Business Profile if you have one — connects your reviews and local search presence directly. Skip if you don\'t have one yet.', read: (x) => s(x, 'google_business_profile_url') },
  // Whole {facebook, instagram, tiktok, linkedin, youtube, x} object, written
  // atomically as one selena_config.social key — same reasoning as serviceArea:
  // preserves the existing nested storage shape other readers (site footer,
  // schema.org) already expect, and a custom renderer handles the sub-fields.
  { key: 'socialLinks', label: 'Social links', section: 'seo', store: 'selena', col: 'social', input: 'custom', help: "Your business profiles — shown in your site footer and used for schema markup that helps Google understand your business.", tier: 'optional', read: (x) => x.social },

  // ── Services & pricing ─── pricing lives in service_types (own editor); readonly here.
  { key: 'servicePricing', label: 'Per-service pricing', section: 'services', store: 'tenant', readonly: true, tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => x.services.some((sv) => sv.active && (sv.rate ?? 0) > 0) },

  // ── Scheduling (booking/pipeline) ─────────────────────────────────
  // businessHoursStart is the anchor field for the whole hours block --
  // renders the same-daily-vs-per-day toggle and either the single
  // start/end select pair or a 7-row day grid (see FieldRenderer's
  // 'businessHoursStart' custom case). businessHoursEnd/Sameuse/PerDay are
  // real fields (real cols, still readable/writable everywhere else) but
  // excluded from the normal per-field render loop so they don't ALSO
  // render their own default control -- same pattern as serviceRadius.
  { key: 'businessHoursStart', label: 'Opening hour', section: 'scheduling', store: 'tenant', col: 'business_hours_start', input: 'custom', help: "When you open for business — drives your booking calendar and what your AI agent tells customers about availability.", tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'business_hours_start') },
  { key: 'businessHoursEnd', label: 'Closing hour', section: 'scheduling', store: 'tenant', col: 'business_hours_end', input: 'select', options: HOUR_OPTIONS, tier: 'critical', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'business_hours_end') },
  { key: 'businessHoursSameDaily', label: 'Same hours every day', section: 'scheduling', store: 'selena', col: 'business_hours_same_daily', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'business_hours_same_daily') },
  { key: 'businessHoursPerDay', label: 'Hours per day', section: 'scheduling', store: 'selena', col: 'business_hours_per_day', input: 'custom', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'business_hours_per_day') },
  { key: 'defaultDuration', label: 'Default job length (hrs)', section: 'scheduling', store: 'tenant', col: 'default_duration_hours', kind: 'number', input: 'number', help: "How long a typical job takes, used as the default when scheduling a new booking. You can override it per service.", tier: 'recommended', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'default_duration_hours') },
  { key: 'bookingBuffer', label: 'Buffer between jobs (min)', section: 'scheduling', store: 'tenant', col: 'booking_buffer_minutes', kind: 'number', input: 'select', options: BUFFER_OPTIONS, help: "Gap time held between back-to-back jobs — for driving, loading, or a breather. Applied automatically when booking.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'booking_buffer_minutes') },
  // minDaysAhead is the anchor for the same-day/lead-time pair -- its
  // custom renderer also shows the allowSameDay toggle so the two can't
  // contradict each other (same-day on forces min-days to 0, and vice
  // versa). allowSameDay stays a real field/col, just excluded from the
  // normal render loop.
  { key: 'minDaysAhead', label: 'Min days ahead to book', section: 'scheduling', store: 'tenant', col: 'min_days_ahead', kind: 'number', input: 'custom', help: "How much lead time you need before a booking — drives what appears as available on your booking calendar.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'min_days_ahead') },
  { key: 'allowSameDay', label: 'Allow same-day booking', section: 'scheduling', store: 'tenant', col: 'allow_same_day', kind: 'bool', input: 'toggle', tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => t(x, 'allow_same_day') },
  { key: 'open365', label: 'Open 365 days (no holidays)', section: 'scheduling', store: 'selena', col: 'open_365', kind: 'bool', input: 'toggle', help: "Turn on if you never close for holidays — skips the holiday/blackout-date list below entirely.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'open_365') },
  { key: 'requireTeamMember', label: 'Require assigned worker', section: 'scheduling', store: 'selena', col: 'require_team_member', kind: 'bool', input: 'toggle', help: "If on, a booking can't be confirmed until a real team member is assigned to it.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'require_team_member') },
  { key: 'autoConfirm', label: 'Auto-confirm bookings', section: 'scheduling', store: 'selena', col: 'auto_confirm_bookings', kind: 'bool', input: 'toggle', help: "If on, new bookings are confirmed automatically. If off, you approve each one before it's locked in.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'auto_confirm_bookings') },
  // Array of {date, label, recurring} — same free-form jsonb-array pattern as
  // defaultWorkingDays/teamRoles below; the form renders its own small
  // date-list editor for this key rather than a generic array input.
  { key: 'holidayDates', label: 'Holidays / blackout dates', section: 'scheduling', store: 'selena', col: 'holiday_dates', input: 'custom', help: "Days you're closed — blocks these dates from your booking calendar automatically.", tier: 'optional', funnels: ['booking', 'pipeline'], read: (x) => s(x, 'holiday_dates') },

  // ── Payments (booking/pipeline) ───────────────────────────────────
  { key: 'paymentMethods', label: 'Payment methods', section: 'payments', store: 'tenant', col: 'payment_methods', kind: 'array', input: 'array', options: PAYMENT_OPTIONS, tier: 'critical', funnels: ['booking', 'pipeline'], help: 'We process everything through Stripe — card, Apple Pay, and Cash App are all handled through the same Stripe checkout, nothing separate to set up for each.', read: (x) => t(x, 'payment_methods') },
  { key: 'stripeKey', label: 'Stripe secret key', section: 'payments', store: 'tenant', col: 'stripe_api_key', tier: 'recommended', platformManaged: true, funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_api_key') },
  { key: 'stripeAccountId', label: 'Stripe account ID', section: 'payments', store: 'tenant', col: 'stripe_account_id', tier: 'optional', platformManaged: true, funnels: ['booking', 'pipeline'], read: (x) => t(x, 'stripe_account_id') },

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
  { key: 'reviewLink', label: 'Primary review link', section: 'reviews', store: 'selena', col: 'google_review_link', tier: 'optional', funnels: ['booking', 'pipeline'], help: 'This is the link actually sent in review-request texts and emails — your Google Business Profile review link. Add other platforms below; this one stays the one customers get asked for first.', read: (x) => s(x, 'google_review_link') },
  // Extra platform links (Yelp, Facebook, Angi, etc.) captured for display/
  // future use -- NOT read by the live review-request send path
  // (post-job-followup cron, review-engine.ts both read google_review_link
  // directly as a plain string). Keep it that way: don't wire this into
  // the send flow without updating those two files' string-based reads.
  { key: 'additionalReviewLinks', label: 'Other review platforms', section: 'reviews', store: 'selena', col: 'additional_review_links', input: 'custom', tier: 'optional', funnels: ['booking', 'pipeline'], help: 'Other places customers can find and review you — shown on your site, not sent in review-request texts (those always use the primary link above).', read: (x) => s(x, 'additional_review_links') },
  // Auto Review Follow-up removed from onboarding (2026-08-01) -- an
  // adjust-later setting, not a decision to force during first-time setup.
  // No dedicated Reviews-settings page has this toggle yet either; the
  // underlying tenants.selena_config.review_followup_enabled column and
  // its behavior are untouched, just no editor anywhere right now.

  // ── Referrals ─────────────────────────────────────────────────────
  { key: 'runReferralProgram', label: 'Do you want to run a referral program?', section: 'referrals', store: 'selena', col: 'run_referral_program', kind: 'bool', input: 'toggle', tier: 'optional', help: 'Pay people (clients, partners, anyone) a commission for sending you new business. This is already built in — every referrer gets their own portal to track who they sent you and what they\'re owed, no extra setup on your end. We\'ve seen referral programs consistently bring in real business for other Full Loop tenants — worth turning on even if you start small. Skip this if you don\'t want one — nothing below applies unless you turn this on.', read: (x) => s(x, 'run_referral_program') },
  { key: 'commissionRate', label: 'Referral commission %', section: 'referrals', store: 'tenant', col: 'commission_rate', kind: 'number', input: 'number', tier: 'recommended', dependsOn: { key: 'runReferralProgram', value: true }, help: 'What percentage of the job\'s price you pay out as a referral commission — e.g. 10 means 10% of what the referred client pays.', read: (x) => t(x, 'commission_rate') },
  { key: 'autoPayReferrals', label: 'Auto-pay referrals', section: 'referrals', store: 'selena', col: 'auto_pay_referrals', kind: 'bool', input: 'toggle', tier: 'optional', dependsOn: { key: 'runReferralProgram', value: true }, help: 'Pay the commission automatically once the referred job is paid, instead of you approving each payout by hand.', read: (x) => s(x, 'auto_pay_referrals') },
  { key: 'referralMinPayout', label: 'Min referral payout ($)', section: 'referrals', store: 'selena', col: 'referral_min_payout', kind: 'number', input: 'number', tier: 'optional', dependsOn: { key: 'runReferralProgram', value: true }, help: 'Don\'t send a payout below this dollar amount — instead it accumulates until it crosses the threshold. Leave blank to pay out every time.', read: (x) => s(x, 'referral_min_payout') },

  // ── Agreements & Legal (section key stays 'proposals' -- see PROFILE_SECTION_META) ──
  { key: 'proposalTerms', label: 'Proposal terms', section: 'proposals', store: 'selena', col: 'proposal_terms', input: 'textarea', tier: 'critical', funnels: ['pipeline'], help: 'The terms you attach to every quote/proposal you send — scope of work, what\'s included, payment schedule.', read: (x) => s(x, 'proposal_terms') },
  { key: 'proposalDepositType', label: 'Deposit type', section: 'proposals', store: 'selena', col: 'proposal_deposit_type', input: 'select', options: DEPOSIT_OPTIONS, tier: 'recommended', funnels: ['pipeline'], help: 'Do you require a deposit before starting a job? None, a flat dollar amount, or a percentage of the total.', read: (x) => s(x, 'proposal_deposit_type') },
  { key: 'proposalDepositValue', label: 'Deposit amount', section: 'proposals', store: 'selena', col: 'proposal_deposit_value', kind: 'number', input: 'number', tier: 'recommended', funnels: ['pipeline'], help: 'The dollar amount, or percentage (0-100) if Deposit type is "percent."', read: (x) => s(x, 'proposal_deposit_value') },
  { key: 'proposalValidDays', label: 'Proposal valid (days)', section: 'proposals', store: 'selena', col: 'proposal_valid_days', kind: 'number', input: 'select', options: [{ label: '7 days', value: 7 }, { label: '14 days', value: 14 }, { label: '30 days', value: 30 }, { label: '60 days', value: 60 }], tier: 'optional', funnels: ['pipeline'], help: 'How many days a quote stays valid before it expires and needs to be re-sent.', read: (x) => s(x, 'proposal_valid_days') },
  // refund/cancellation/reschedule/late-payment: input:'custom' -- tap-select
  // presets first (these are highly patterned across trades, Jeff's call
  // 2026-08-02), text/voice still available for anything custom. See
  // FieldRenderer's matching cases + *_POLICY_PRESETS in ProfileWizard.tsx.
  { key: 'refundPolicy', label: 'Refund policy', section: 'proposals', store: 'selena', col: 'refund_policy', input: 'custom', tier: 'recommended', help: 'Under what conditions do you give a refund? This governs what your AI agent tells clients — leave blank and it will always hand refund questions to a human instead of guessing.', read: (x) => s(x, 'refund_policy') },
  { key: 'cancellationPolicy', label: 'Cancellation policy', section: 'proposals', store: 'selena', col: 'cancellation_policy', input: 'custom', tier: 'recommended', help: 'What happens if a client cancels — notice required, any fee. Blank means your AI agent defers to a human instead of guessing.', read: (x) => s(x, 'cancellation_policy') },
  { key: 'reschedulePolicy', label: 'Rescheduling policy', section: 'proposals', store: 'selena', col: 'reschedule_policy', input: 'custom', tier: 'recommended', help: 'Your rules for rescheduling a booking — how much notice, any fee. Blank means your AI agent defers to a human.', read: (x) => s(x, 'reschedule_policy') },
  { key: 'latePaymentPolicy', label: 'Late-payment policy', section: 'proposals', store: 'selena', col: 'late_payment_policy', input: 'custom', tier: 'recommended', help: 'How you handle an overdue invoice — late fee, follow-up timeline. Blank means your AI agent defers to a human.', read: (x) => s(x, 'late_payment_policy') },
  { key: 'generalTerms', label: 'General terms & conditions', section: 'proposals', store: 'selena', col: 'general_terms', input: 'textarea', tier: 'optional', help: 'Any other standing rules for doing business with you — liability limits, property access, weather delays, whatever applies to your trade. Shown on proposals/agreements alongside the terms above.', read: (x) => s(x, 'general_terms') },
  // Auto-drafted from business identity + the policy fields above (see
  // generateTermsOfService/generatePrivacyPolicy in legal-doc-templates.ts)
  // -- a real starting draft shown for edit, not a blank box. NOT legal
  // advice; the disclaimer is baked into the custom renderer, not optional.
  { key: 'termsOfService', label: 'Terms of Service', section: 'proposals', store: 'selena', col: 'terms_of_service', input: 'custom', tier: 'optional', help: 'Auto-drafted from your business info and the policies above — review and edit before using.', read: (x) => s(x, 'terms_of_service') },
  { key: 'privacyPolicy', label: 'Privacy Policy', section: 'proposals', store: 'selena', col: 'privacy_policy', input: 'custom', tier: 'optional', help: 'Auto-drafted boilerplate covering what you collect and how SMS opt-in works — review and edit before using.', read: (x) => s(x, 'privacy_policy') },

  // ── Team defaults ─────────────────────────────────────────────────
  { key: 'defaultPayRate', label: 'Default pay rate ($/hr)', section: 'team', store: 'selena', col: 'default_pay_rate', kind: 'number', input: 'number', tier: 'recommended', help: 'The fallback hourly rate for a new team member when their role doesn\'t have its own rate set below.', read: (x) => s(x, 'default_pay_rate') },
  // input:'custom' (was the generic 'array'+options checkbox case) --
  // that generic renderer always coerces option values to strings, but
  // every real consumer (settings.ts, api/settings/team, team-provisioning)
  // reads this as number[] (0=Sun..6=Sat, JS Date convention). Using the
  // generic case here would've silently saved ["1","2"] and had every
  // typeof-number filter downstream drop them. See WorkingDaysCheckboxes.
  { key: 'defaultWorkingDays', label: 'Default working days', section: 'team', store: 'selena', col: 'default_working_days', kind: 'array', input: 'custom', tier: 'optional', help: 'Which days a new team member is assumed available, until you set their own schedule.', read: (x) => s(x, 'default_working_days') },
  { key: 'teamRoles', label: 'Team roles', section: 'team', store: 'selena', col: 'team_roles', kind: 'array', input: 'custom', tier: 'optional', help: 'The job titles you\'ll assign team members to. Tap what applies, or add your own if it\'s not listed.', read: (x) => s(x, 'team_roles') },
  // {role, hourlyRate}[] -- deliberately separate from teamRoles above (a
  // plain string[] several other consumers already read/write, see
  // lib/settings.ts + api/settings/team) rather than changing that field's
  // shape and risking those. Not auto-synced with the role names above; the
  // tenant fills both. New jsonb key, no migration.
  { key: 'teamRoleRates', label: 'Pay rate by role', section: 'team', store: 'selena', col: 'team_role_rates', input: 'custom', tier: 'optional', help: 'If different roles get paid differently (e.g. a Lead Cleaner earns more than a Cleaner), set each role\'s rate here — overrides the default pay rate above for that role. Pick from the roles you added above.', read: (x) => s(x, 'team_role_rates') },
  // Capture-only: yes/skip + phone numbers. Does NOT mint invite tokens or
  // send anything -- the actual self-service invite-link/portal system
  // (mirroring onboarding-token.ts, one token per invited member) is a
  // separate, not-yet-built feature. This just records intent + numbers
  // so that feature has something real to send to once it exists.
  { key: 'inviteTeamNow', label: 'Invite your team now?', section: 'team', store: 'selena', col: 'invite_team_now', kind: 'bool', input: 'toggle', tier: 'optional', help: 'Send your team members their own self-service link to fill in their own info. Skip this and add team members yourself later in Team.', read: (x) => s(x, 'invite_team_now') },
  { key: 'teamInvitePhones', label: 'Team member phone numbers', section: 'team', store: 'selena', col: 'team_invite_phones', kind: 'array', input: 'custom', tier: 'optional', dependsOn: { key: 'inviteTeamNow', value: true }, help: 'One phone number per team member you want to invite. Add as many as you need.', read: (x) => s(x, 'team_invite_phones') },

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
  // cancellationPolicy/reschedulePolicy/refundPolicy/latePaymentPolicy moved to
  // the Agreements & Legal section (2026-08-01) -- these are real business
  // policies a tenant sets regardless of whether they even use the AI agent;
  // the agent just reads the same stored value from there.
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
  { key: 'taxRate', label: 'Tax rate %', section: 'identity', store: 'selena', col: 'tax_rate', kind: 'number', input: 'custom', tier: 'optional', help: 'Your state\'s base sales tax, picked automatically once you set your state above — pick "Custom" if your city/county adds its own on top and you know your real combined rate.', read: (x) => s(x, 'tax_rate') },
  { key: 'expenseCategories', label: 'Expense categories', section: 'identity', store: 'tenant', col: 'expense_categories', kind: 'array', input: 'custom', tier: 'optional', help: 'Pick the ones that apply to your business — you can change these anytime in Settings.', read: (x) => t(x, 'expense_categories') },

  // ── Compliance ────────────────────────────────────────────────────
  { key: 'license', label: 'Trade license #', section: 'compliance', store: 'compliance', col: 'license_number', tier: 'recommended', validation: { kind: 'minLength', minLength: 3, message: 'That\'s too short to be a real license number — enter the full number or leave it blank.' }, help: 'Your state or local trade license number (contractor, HVAC, electrical, etc. — whatever applies to your trade). We show this on your site and proposals to build trust with customers; some states require it to be displayed.', read: (x) => c(x, 'license_number') },
  { key: 'licenseState', label: 'License state', section: 'compliance', store: 'compliance', col: 'license_state', input: 'select', options: STATE_OPTIONS, tier: 'optional', help: 'Which state issued the license above.', read: (x) => c(x, 'license_state') },
  { key: 'licenseExpiry', label: 'License expiry', section: 'compliance', store: 'compliance', col: 'license_expiry', input: 'date', tier: 'optional', help: 'When your license needs to be renewed — we can remind you before it lapses.', read: (x) => c(x, 'license_expiry') },
  { key: 'insuranceCarrier', label: 'Insurance carrier', section: 'compliance', store: 'compliance', col: 'insurance_carrier', input: 'custom', tier: 'recommended', help: 'The company your business (general liability, not personal) insurance is through.', read: (x) => c(x, 'insurance_carrier') },
  { key: 'insurancePolicy', label: 'Insurance policy #', section: 'compliance', store: 'compliance', col: 'insurance_policy', tier: 'optional', help: 'The policy number for your general liability insurance (the policy that covers accidents/damage on the job — not your license number above).', read: (x) => c(x, 'insurance_policy') },
  { key: 'insuranceCoverage', label: 'Coverage amount', section: 'compliance', store: 'compliance', col: 'insurance_coverage', input: 'custom', tier: 'optional', help: 'How much your general liability policy covers — from your insurance declarations page.', read: (x) => c(x, 'insurance_coverage') },
  { key: 'bonded', label: 'Bonded', section: 'compliance', store: 'compliance', col: 'bonded', kind: 'bool', input: 'toggle', tier: 'optional', help: 'A surety bond protects a customer financially if you don\'t complete a job as agreed. Turn this on if you carry one — it\'s a trust signal on your site, not required to operate.', read: (x) => c(x, 'bonded') },
  // Doc URLs -- now backed by a real upload (see FileUploadField in
  // ProfileWizard.tsx + /api/uploads dual-auth change, 2026-08-02). The
  // stored value is still just a URL string (now a real Supabase Storage
  // URL instead of a pasted Drive/Dropbox link), so nothing downstream that
  // reads these columns needed to change.
  { key: 'insuranceCertUrl', label: 'Certificate of insurance', section: 'compliance', store: 'compliance', col: 'insurance_cert_url', input: 'custom', tier: 'recommended', help: 'The actual certificate document from your insurer proving the coverage above is real.', read: (x) => c(x, 'insurance_cert_url') },
  { key: 'licenseDocUrl', label: 'Business license (scan)', section: 'compliance', store: 'compliance', col: 'license_doc_url', input: 'custom', tier: 'optional', help: 'A photo or scan of your actual license document.', read: (x) => c(x, 'license_doc_url') },
  { key: 'w9Url', label: 'W-9', section: 'compliance', store: 'compliance', col: 'w9_url', input: 'custom', tier: 'optional', help: 'The IRS Form W-9 with your business\'s tax info — we need it on file to send you a 1099 at tax time if you\'re paid as a contractor. Fill out the form (get a blank one at irs.gov/w9), then upload it here.', read: (x) => c(x, 'w9_url') },

  // ── Lead handling / SEO ───────────────────────────────────────────
  { key: 'autoRespondLeads', label: 'Auto-respond to leads', section: 'seo', store: 'selena', col: 'auto_respond_leads', kind: 'bool', input: 'toggle', help: "If on, your AI agent replies to a new lead immediately instead of waiting for a human.", tier: 'optional', read: (x) => s(x, 'auto_respond_leads') },
  { key: 'attributionWindow', label: 'Attribution window (hrs)', section: 'seo', store: 'tenant', col: 'attribution_window_hours', kind: 'number', input: 'select', options: [{ label: '24 hours', value: 24 }, { label: '48 hours', value: 48 }, { label: '72 hours', value: 72 }, { label: '1 week', value: 168 }], tier: 'optional', help: 'How long after a customer first visits your site we still count a booking as coming from that visit — matters for judging which marketing actually works.', read: (x) => t(x, 'attribution_window_hours') },

  // ── Paid ads + overall marketing spend (2026-08-02) — the real gap:
  // nothing on this page asked whether a tenant already runs ads. Two
  // purposes: (1) whether to pitch optimization vs. a fresh strategy on
  // their existing ads, (2) interestedInAds is the actual market-research
  // signal on whether an ads product is worth building. adAccountAccess is
  // INTENT CAPTURE ONLY -- a real OAuth connection to Google/Meta ad
  // accounts is a separate, unbuilt feature (new app registration, OAuth
  // callback flow, token storage) -- this just records that the tenant said
  // yes, so outreach has something real to act on.
  { key: 'totalMarketingSpend', label: 'Monthly marketing spend (all channels)', section: 'seo', store: 'selena', col: 'total_marketing_spend', input: 'select', options: ['$0–500', '$500–1,500', '$1,500–5,000', '$5,000–10,000', '$10,000+'], tier: 'optional', help: 'Roughly, across everything — ads, SEO, referral fees, directories. We use this to compare Full Loop\'s results against what you\'re already spending.', read: (x) => s(x, 'total_marketing_spend') },
  { key: 'marketingSpendPctRevenue', label: '...roughly what % of revenue is that?', section: 'seo', store: 'selena', col: 'marketing_spend_pct_revenue', input: 'select', options: ['Under 2%', '2–5%', '5–10%', '10–15%', '15%+', 'Not sure'], help: "Doesn't need to be exact — a rough range is enough for us to gauge where you stand.", tier: 'optional', read: (x) => s(x, 'marketing_spend_pct_revenue') },
  { key: 'runningAds', label: 'Are you currently running paid ads?', section: 'seo', store: 'selena', col: 'running_ads', kind: 'bool', input: 'toggle', help: "Tells us whether to focus on optimizing what you already run or building a strategy from scratch.", tier: 'optional', read: (x) => s(x, 'running_ads') },
  { key: 'adPlatforms', label: 'Which platforms', section: 'seo', store: 'selena', col: 'ad_platforms', kind: 'array', input: 'custom', help: "Where your ad spend is currently going — tap all that apply.", tier: 'optional', dependsOn: { key: 'runningAds', value: true }, read: (x) => s(x, 'ad_platforms') },
  { key: 'monthlyAdSpend', label: 'Monthly ad spend', section: 'seo', store: 'selena', col: 'monthly_ad_spend', input: 'select', options: ['$0–500', '$500–1,500', '$1,500–5,000', '$5,000+'], help: "A rough range is fine — most owners don't know the exact number off the top of their head.", tier: 'optional', dependsOn: { key: 'runningAds', value: true }, read: (x) => s(x, 'monthly_ad_spend') },
  { key: 'adPerformance', label: 'How\'s it going?', section: 'seo', store: 'selena', col: 'ad_performance', kind: 'array', input: 'custom', tier: 'optional', dependsOn: { key: 'runningAds', value: true }, help: 'Tap what applies — tells us whether you need optimization advice or a fresh strategy.', read: (x) => s(x, 'ad_performance') },
  { key: 'wantsAdAccountAccess', label: 'Want to give us access to your Google/Meta ad accounts?', section: 'seo', store: 'selena', col: 'wants_ad_account_access', kind: 'bool', input: 'toggle', tier: 'optional', dependsOn: { key: 'runningAds', value: true }, help: 'We\'ll reach out to connect it properly — this just tells us you\'re open to it.', read: (x) => s(x, 'wants_ad_account_access') },
  { key: 'interestedInAds', label: 'Interested in running ads through Full Loop?', section: 'seo', store: 'selena', col: 'interested_in_ads', input: 'select', options: ['Yes', 'No', 'Maybe'], help: "Not a commitment — just tells us whether it's worth a conversation down the line.", tier: 'optional', dependsOn: { key: 'runningAds', value: false }, read: (x) => s(x, 'interested_in_ads') },

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
  referrals: { title: 'Referrals', blurb: 'Optional — pay people who send you new business. Full Loop\'s referral program is already built in, with a real tracking portal for each referrer, and it\'s one of the most effective growth levers we\'ve seen across tenants.' },
  proposals: { title: 'Agreements & Legal', blurb: 'The terms, policies, and fine print that protect your business.' },
  team: { title: 'Team Defaults', blurb: 'Defaults applied to new team members.' },
  compliance: { title: 'Licensing & Insurance', blurb: 'We show these on your site and proposals — customers trust a business that\'s licensed and insured, and some states legally require you to display them. Nothing here is required to use Full Loop.' },
  seo: { title: 'Marketing', blurb: 'Who you\'re for, how you stand out, and where customers find you. (Your existing website, if you have one, is captured back in Address & Contact — used for redirect/migration planning, not asked twice here.)' },
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
    return { ...f, value, filled: isFilled(value) && passesValidation(value, f.validation) }
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
