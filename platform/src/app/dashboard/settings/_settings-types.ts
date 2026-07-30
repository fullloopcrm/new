// Shared types/constants for the Settings page and its extracted tab
// components. Extracted verbatim from settings/page.tsx.

export function tenantSiteUrl(tenant: { domain?: string | null; slug?: string | null } | null): string {
  if (!tenant) return ''
  if (tenant.domain) return `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  if (tenant.slug) return `https://${tenant.slug}.fullloopcrm.com`
  return ''
}

export type Tenant = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  zip_code: string | null
  team_size: string
  timezone: string
  industry: string
  business_hours: string | null
  primary_color: string
  secondary_color: string
  logo_url: string | null
  tagline: string | null
  website_url: string | null
  domain: string | null
  slug: string | null
  resend_api_key: string | null
  resend_domain: string | null
  email_from: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  stripe_api_key: string | null
  stripe_account_id: string | null
  google_place_id: string | null
  imap_host: string | null
  imap_port: number | null
  imap_user: string | null
  imap_pass: string | null
  anthropic_api_key: string | null
  deepgram_api_key: string | null
  indexnow_key: string | null

  // Scheduling fields
  booking_buffer_minutes: number | null
  default_duration_hours: number | null
  min_days_ahead: number | null
  allow_same_day: boolean | null
  business_hours_start: string | null
  business_hours_end: string | null

  // Referral & policy fields
  commission_rate: number | null
  attribution_window_hours: number | null
  active_client_threshold_days: number | null
  at_risk_threshold_days: number | null
  reschedule_notice_days: number | null

  // Guidelines

  // Payment methods
  payment_methods: string[] | null
  zelle_email: string | null
  apple_cash_phone: string | null

  // Selena AI config
  selena_config: Record<string, unknown> | null

  // Agent / bot name — single source of truth read by both agent brains
  agent_name: string | null
}

export type PricingModel = 'hourly' | 'flat' | 'quote'

export type ServiceType = {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
  pricing_model: PricingModel | null
  price_cents: number | null
  per_unit: string | null
  min_charge_cents: number | null
  sort_order: number
  active: boolean
}

// Client-side form shape — all values are strings (raw <input> values).
export type ServiceFormState = {
  name: string
  pricing_model: PricingModel
  default_duration_hours: string
  default_hourly_rate: string
  price: string
  min_charge: string
}

export const EMPTY_SERVICE_FORM: ServiceFormState = {
  name: '', pricing_model: 'hourly', default_duration_hours: '3',
  default_hourly_rate: '49', price: '', min_charge: '',
}

export const PRICING_MODELS: { value: PricingModel; label: string }[] = [
  { value: 'hourly', label: 'Hourly (duration × rate)' },
  { value: 'flat', label: 'Flat price' },
  { value: 'quote', label: 'By quote (priced per job)' },
]

// Build the API payload from a form. Non-hourly models still send safe
// duration/rate defaults so a NOT NULL column can never blow up the insert;
// dollar inputs are converted to *_cents.
export function buildServicePayload(f: ServiceFormState) {
  const model: PricingModel = f.pricing_model || 'hourly'
  return {
    name: f.name,
    pricing_model: model,
    default_duration_hours: model === 'hourly' ? Number(f.default_duration_hours) || 1 : 1,
    default_hourly_rate: model === 'hourly' ? Number(f.default_hourly_rate) || 0 : 0,
    // Only 'flat' carries a fixed price; 'quote' is priced per deal. per_unit
    // must be one of the DB enum values (hour/job/…) and is NOT NULL.
    price_cents: model === 'flat' ? Math.round(Number(f.price || 0) * 100) : null,
    per_unit: model === 'hourly' ? 'hour' : 'job',
    min_charge_cents: f.min_charge ? Math.round(Number(f.min_charge) * 100) : null,
  }
}

// Human summary of a service's price for the list row.
export function formatServicePrice(s: ServiceType): string {
  const model = s.pricing_model || 'hourly'
  const min = s.min_charge_cents ? ` (min $${(s.min_charge_cents / 100).toFixed(0)})` : ''
  if (model === 'flat') return `$${((s.price_cents || 0) / 100).toFixed(0)} flat${min}`
  if (model === 'quote') return `By quote${min}`
  return `${s.default_duration_hours}hr · $${s.default_hourly_rate}/hr${min}`
}

export const INPUT_CLS = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm'

export const TABS = ['Business', 'Service Area', 'Services', 'Sales', 'Scheduling', 'Referrals & Policies', 'Additional Details', 'Permissions', 'Integrations', 'Branding', 'Communications', 'Selena', 'Tools'] as const
export type Tab = typeof TABS[number]

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
]

export const BUSINESS_HOURS_START_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
]

export const BUSINESS_HOURS_END_OPTIONS = [
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' },
]
