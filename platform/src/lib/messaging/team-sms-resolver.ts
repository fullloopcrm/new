// Per-tenant team (cleaner/admin) SMS template resolver.
//
// Mirrors client-sms.ts: cleaning-industry tenants (nycmaid, the-florida-maid)
// get the rich cleaning copy (PIN, supplies note, portal link, bilingual body)
// in THEIR OWN brand name/site; every other tenant keeps the existing generic
// templates — output IDENTICAL to today, so this is a no-op for non-cleaning
// tenants.

import { tenantBrand } from './brand'
import { isCleaningTenant } from './client-sms'
import * as cleaningTeam from './team-sms'
import type { TeamBookingLike } from './team-sms'
import * as generic from '../sms-templates'
import { supabaseAdmin } from '../supabase'

type TenantLike = {
  slug?: string | null
  industry?: string | null
  name?: string | null
  phone?: string | null
  website_url?: string | null
  domain?: string | null
  domain_name?: string | null
  google_place_id?: string | null
}

export type TeamSmsTemplates = {
  jobAssignment(booking: TeamBookingLike): string
  dailySummary(memberName: string, count: number, pin?: string, bookings?: TeamBookingLike[]): string
  lateCheckInCleaner(booking: TeamBookingLike): string
  lateCheckInAdmin(booking: TeamBookingLike): string
  lateCheckOutCleaner(booking: TeamBookingLike): string
  lateCheckOutAdmin(booking: TeamBookingLike): string
}

const BRAND_COLUMNS = 'slug, industry, name, phone, website_url, domain, domain_name, google_place_id'

/**
 * Load a tenant's brand row by id and return its team SMS templates. Use from
 * send paths that only have a tenant id in scope (crons, booking routes).
 */
export async function teamSmsTemplatesFor(tenantId: string): Promise<TeamSmsTemplates> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select(BRAND_COLUMNS)
    .eq('id', tenantId)
    .single()
  return teamSmsTemplates((data as TenantLike) || {})
}

export function teamSmsTemplates(tenant: TenantLike): TeamSmsTemplates {
  if (isCleaningTenant(tenant)) {
    const brand = tenantBrand(tenant)
    return {
      jobAssignment: b => cleaningTeam.jobAssignment(brand, b),
      dailySummary: (memberName, count, pin, bookings) => cleaningTeam.dailySummary(brand, memberName, count, pin, bookings),
      lateCheckInCleaner: b => cleaningTeam.lateCheckInCleaner(brand, b),
      lateCheckInAdmin: b => cleaningTeam.lateCheckInAdmin(brand, b),
      lateCheckOutCleaner: b => cleaningTeam.lateCheckOutCleaner(brand, b),
      lateCheckOutAdmin: b => cleaningTeam.lateCheckOutAdmin(brand, b),
    }
  }

  // Neutral shared templates, bound to this tenant's display name. Output is
  // identical to the pre-resolver behavior for the ~23 non-cleaning tenants.
  const name = tenant.name || 'Your Business'
  return {
    jobAssignment: b => generic.smsJobAssignment(name, b as any),
    dailySummary: (memberName, count) => generic.smsDailySummary(name, memberName, count),
    lateCheckInCleaner: b => generic.smsLateCheckInTeam(name, b as any),
    lateCheckInAdmin: b => generic.smsLateCheckInAdmin(name, b as any),
    lateCheckOutCleaner: b => generic.smsLateCheckOutTeam(name, b as any),
    lateCheckOutAdmin: b => generic.smsLateCheckOutAdmin(name, b as any),
  }
}
