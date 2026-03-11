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
  // Referrals & Policies
  commission_rate: number       // percentage, e.g. 10
  active_client_threshold_days: number
  at_risk_threshold_days: number
  reschedule_notice_hours: number
  // Notifications
  reminder_days: number[]       // e.g. [7, 3, 1]
  reminder_hours_before: number[]
  daily_summary_enabled: boolean
  client_reminder_email: boolean
  client_reminder_sms: boolean
  // AI Chatbot
  chatbot_enabled: boolean
  chatbot_greeting: string
  // Team Guidelines
  team_guidelines: string | null
  guidelines_updated_at: string | null
  // Timestamps
  updated_at: string
}

export const DEFAULT_SETTINGS: Omit<TenantSettings, 'id' | 'tenant_id' | 'updated_at'> = {
  business_name: '',
  business_phone: '',
  business_email: '',
  business_website: '',
  admin_email: '',
  email_from_name: '',
  email_from_address: '',
  service_types: [],
  standard_rate: 0,
  payment_methods: ['zelle', 'stripe'],
  business_hours_start: 9,
  business_hours_end: 17,
  booking_buffer_minutes: 60,
  default_duration_hours: 2,
  min_days_ahead: 1,
  allow_same_day: false,
  commission_rate: 10,
  active_client_threshold_days: 45,
  at_risk_threshold_days: 90,
  reschedule_notice_hours: 48,
  reminder_days: [3, 1],
  reminder_hours_before: [2],
  daily_summary_enabled: true,
  client_reminder_email: true,
  client_reminder_sms: true,
  chatbot_enabled: false,
  chatbot_greeting: 'Hola, Thank you for reaching out. How are you?',
  team_guidelines: null,
  guidelines_updated_at: null,
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

  const { data, error } = await supabaseAdmin
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()

  if (error || !data) {
    // Return defaults if no settings row exists yet
    return {
      id: '',
      tenant_id: tenantId,
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    } as TenantSettings
  }

  const settings = data as TenantSettings
  settingsCache.set(tenantId, { data: settings, time: now })
  return settings
}
