// @ts-nocheck
import { supabaseAdmin } from './supabase'

export interface ServiceType {
  name: string
  default_hours: number
  active: boolean
}

export interface Settings {
  id: number
  business_name: string
  business_phone: string
  business_email: string
  business_website: string
  admin_email: string
  email_from_name: string
  email_from_address: string
  service_types: ServiceType[]
  standard_rate: number
  payment_methods: string[]
  business_hours_start: number
  business_hours_end: number
  min_days_ahead: number
  allow_same_day: boolean
  commission_rate: number
  active_client_threshold_days: number
  at_risk_threshold_days: number
  reminder_days: number[]
  daily_summary_enabled: boolean
  client_reminder_email: boolean
  updated_at: string
}

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updated_at'> = {
  business_name: 'The NYC Interior Designer',
  business_phone: '(917) 473-2013',
  business_email: 'hello@thenycinteriordesigner.com',
  business_website: 'https://www.thenycinteriordesigner.com',
  admin_email: 'jeff@consortiumnyc.com',
  email_from_name: 'The NYC Interior Designer',
  email_from_address: 'hello@thenycinteriordesigner.com',
  service_types: [
    { name: 'Full-Home Interior Design', default_hours: 40, active: true },
    { name: 'Kitchen Design', default_hours: 20, active: true },
    { name: 'Bathroom Design', default_hours: 15, active: true },
    { name: 'Living Room Design', default_hours: 15, active: true },
    { name: 'Commercial Interior Design', default_hours: 60, active: true },
    { name: 'Space Planning & Layout', default_hours: 10, active: true },
    { name: 'Color Consultation', default_hours: 4, active: true },
    { name: 'Staging & Styling', default_hours: 8, active: true },
    { name: 'Renovation Management', default_hours: 80, active: true },
  ],
  standard_rate: 200,
  payment_methods: ['zelle', 'check', 'credit_card', 'wire'],
  business_hours_start: 9,
  business_hours_end: 18,
  min_days_ahead: 2,
  allow_same_day: false,
  commission_rate: 10,
  active_client_threshold_days: 90,
  at_risk_threshold_days: 180,
  reminder_days: [7, 3, 1],
  daily_summary_enabled: true,
  client_reminder_email: true,
}

let cachedSettings: Settings | null = null
let cacheTime = 0
const CACHE_TTL = 60_000

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
