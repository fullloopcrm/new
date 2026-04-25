import { supabaseAdmin } from './supabase'

// --- Types ---

export interface ServiceType {
  name: string
  default_hours: number
  active: boolean
}

export interface TenantSettings {
  id: string
  tenant_id: string
  // Business
  business_name: string
  business_phone: string
  business_email: string
  business_website: string
  admin_email: string
  email_from_name: string
  email_from_address: string
  // Services & Pricing
  service_types: ServiceType[]
  standard_rate: number
  payment_methods: string[]
  // Scheduling
  business_hours_start: number  // hour 0-23
  business_hours_end: number    // hour 0-23
  booking_buffer_minutes: number
  default_duration_hours: number
  min_days_ahead: number
  allow_same_day: boolean
  // Booking flow rules
  default_booking_status: string
  require_team_member: boolean
  auto_confirm_bookings: boolean
  // Referrals & Policies
  commission_rate: number       // percentage, e.g. 10
  active_client_threshold_days: number
  at_risk_threshold_days: number
  reschedule_notice_hours: number
  // Notifications (legacy defaults — actual config in tenants.notification_preferences)
  reminder_days: number[]
  reminder_hours_before: number[]
  daily_summary_enabled: boolean
  client_reminder_email: boolean
  client_reminder_sms: boolean
  // AI Chatbot (mirrored from tenants.selena_config jsonb)
  chatbot_enabled: boolean
  chatbot_greeting: string
  // Lead handling (selena_config + tenants columns)
  auto_respond_leads: boolean
  attribution_window_hours: number
  lead_notification_email: string
  // Team Guidelines
  team_guidelines: string | null
  guidelines_updated_at: string | null
  // Timestamps
  updated_at: string
}

const DEFAULT_FALLBACKS = {
  reminder_days: [3, 1],
  reminder_hours_before: [2],
  daily_summary_enabled: true,
  client_reminder_email: true,
  client_reminder_sms: true,
  chatbot_greeting: 'Hi! Thank you for reaching out. How can we help?',
}

// Parse "09:00" / "9" / "09" → 9
function parseHour(text: string | null | undefined, fallback: number): number {
  if (!text) return fallback
  const match = String(text).match(/^(\d{1,2})/)
  if (!match) return fallback
  const h = parseInt(match[1], 10)
  return isNaN(h) ? fallback : h
}

// --- Cache (per tenant) ---

const settingsCache = new Map<string, { data: TenantSettings; time: number }>()
const CACHE_TTL = 60_000 // 60 seconds

export function clearSettingsCache(tenantId?: string) {
  if (tenantId) {
    settingsCache.delete(tenantId)
  } else {
    settingsCache.clear()
  }
}

export async function getSettings(tenantId: string): Promise<TenantSettings> {
  const now = Date.now()
  const cached = settingsCache.get(tenantId)
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data
  }

  const [tenantRes, servicesRes] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single(),
    supabaseAdmin
      .from('service_types')
      .select('name, default_duration_hours, default_hourly_rate, active')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
  ])

  const tenant = tenantRes.data as Record<string, unknown> | null
  const services = (servicesRes.data || []) as Array<{
    name: string
    default_duration_hours: number | null
    default_hourly_rate: number | null
    active: boolean
  }>

  const serviceTypes: ServiceType[] = services.map((s) => ({
    name: s.name,
    default_hours: Number(s.default_duration_hours ?? 2),
    active: s.active !== false,
  }))

  // Derive standard_rate as the average of active service rates (fallback 0)
  const activeRates = services
    .filter((s) => s.active !== false && s.default_hourly_rate != null)
    .map((s) => Number(s.default_hourly_rate))
  const standardRate =
    activeRates.length > 0
      ? Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length)
      : 0

  const selenaConfig = (tenant?.selena_config || {}) as Record<string, unknown>

  const settings: TenantSettings = {
    id: (tenant?.id as string) || tenantId,
    tenant_id: tenantId,
    business_name: (tenant?.name as string) || '',
    business_phone: (tenant?.phone as string) || '',
    business_email: (tenant?.email as string) || '',
    business_website: (tenant?.website_url as string) || '',
    admin_email: (tenant?.owner_email as string) || '',
    email_from_name: (tenant?.name as string) || '',
    email_from_address: (tenant?.email_from as string) || (tenant?.email as string) || '',
    service_types: serviceTypes,
    standard_rate: standardRate,
    payment_methods: (tenant?.payment_methods as string[]) || ['zelle', 'stripe'],
    business_hours_start: parseHour(tenant?.business_hours_start as string | null, 9),
    business_hours_end: parseHour(tenant?.business_hours_end as string | null, 17),
    booking_buffer_minutes: Number(tenant?.booking_buffer_minutes ?? 60),
    default_duration_hours: Number(tenant?.default_duration_hours ?? 2),
    min_days_ahead: Number(tenant?.min_days_ahead ?? 1),
    allow_same_day: Boolean(tenant?.allow_same_day),
    default_booking_status: (selenaConfig.default_booking_status as string) || 'scheduled',
    require_team_member: Boolean(selenaConfig.require_team_member),
    auto_confirm_bookings: Boolean(selenaConfig.auto_confirm_bookings),
    commission_rate: Number(tenant?.commission_rate ?? 10),
    active_client_threshold_days: Number(tenant?.active_client_threshold_days ?? 45),
    at_risk_threshold_days: Number(tenant?.at_risk_threshold_days ?? 90),
    reschedule_notice_hours: Number(tenant?.reschedule_notice_days ?? 2) * 24,
    reminder_days: DEFAULT_FALLBACKS.reminder_days,
    reminder_hours_before: DEFAULT_FALLBACKS.reminder_hours_before,
    daily_summary_enabled: DEFAULT_FALLBACKS.daily_summary_enabled,
    client_reminder_email: DEFAULT_FALLBACKS.client_reminder_email,
    client_reminder_sms: DEFAULT_FALLBACKS.client_reminder_sms,
    chatbot_enabled: Boolean(selenaConfig.enabled ?? selenaConfig.chatbot_enabled ?? false),
    chatbot_greeting: (selenaConfig.greeting as string) || (selenaConfig.chatbot_greeting as string) || DEFAULT_FALLBACKS.chatbot_greeting,
    auto_respond_leads: Boolean(selenaConfig.auto_respond_leads ?? true),
    attribution_window_hours: Number(tenant?.attribution_window_hours ?? 24),
    lead_notification_email: (tenant?.lead_notification_email as string) || (tenant?.owner_email as string) || '',
    team_guidelines: (tenant?.guidelines_en as string) || null,
    guidelines_updated_at: (tenant?.guidelines_updated_at as string) || null,
    updated_at: (tenant?.updated_at as string) || new Date().toISOString(),
  }

  settingsCache.set(tenantId, { data: settings, time: now })
  return settings
}
