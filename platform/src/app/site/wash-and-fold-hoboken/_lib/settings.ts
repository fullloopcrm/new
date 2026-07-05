import { supabaseAdmin } from './supabase'

// --- Types ---

export interface ServiceType {
  name: string
  default_hours: number
  active: boolean
}

export interface Settings {
  id: number
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
  budget_rate: number
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
  attribution_window_hours: number
  active_client_threshold_days: number
  at_risk_threshold_days: number
  reschedule_notice_recurring_days: number
  reschedule_notice_onetime_hours: number
  // Notifications
  reminder_days: number[]       // e.g. [7, 3, 1]
  reminder_hours_before: number[]
  daily_summary_enabled: boolean
  client_reminder_email: boolean
  client_reminder_sms: boolean
  // Team Guidelines
  cleaner_guidelines: { en: string; es: string } | null
  guidelines_updated_at: string | null
  // Timestamps
  updated_at: string
}

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updated_at'> = {
  business_name: 'The NYC Maid',
  business_phone: '(212) 202-8400',
  business_email: 'hi@thenycmaid.com',
  business_website: 'https://www.thenycmaid.com',
  admin_email: 'thenycmaid@gmail.com',
  email_from_name: 'The NYC Maid',
  email_from_address: 'hi@thenycmaid.com',
  service_types: [
    { name: 'Standard Cleaning', default_hours: 2, active: true },
    { name: 'Deep Cleaning', default_hours: 4, active: true },
    { name: 'Move In/Out', default_hours: 5, active: true },
    { name: 'Post Construction', default_hours: 2, active: true },
  ],
  standard_rate: 75,
  budget_rate: 49,
  payment_methods: ['zelle', 'apple_pay'],
  business_hours_start: 9,
  business_hours_end: 16,
  booking_buffer_minutes: 60,
  default_duration_hours: 2,
  min_days_ahead: 1,
  allow_same_day: false,
  commission_rate: 10,
  attribution_window_hours: 48,
  active_client_threshold_days: 45,
  at_risk_threshold_days: 90,
  reschedule_notice_recurring_days: 7,
  reschedule_notice_onetime_hours: 48,
  reminder_days: [7, 3, 1],
  reminder_hours_before: [2],
  daily_summary_enabled: true,
  client_reminder_email: true,
  client_reminder_sms: true,
  cleaner_guidelines: null,
  guidelines_updated_at: null,
}

// --- Cache ---

let cachedSettings: Settings | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 60 seconds

export function clearSettingsCache() {
  cachedSettings = null
  cacheTime = 0
}

export async function getSettings(): Promise<Settings> {
  const now = Date.now()
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings
  }

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    // Return defaults with fake id/timestamp if table is empty
    return {
      id: 0,
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    } as Settings
  }

  cachedSettings = data as Settings
  cacheTime = now
  return cachedSettings
}
