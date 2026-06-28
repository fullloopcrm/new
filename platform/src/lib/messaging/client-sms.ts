// Per-tenant client SMS template resolver.
//
// Send paths call clientSmsTemplates(tenant) and get a brand-bound set of
// template functions. Cleaning/maid-brand tenants get the rich cleaning copy
// (arrival window, policies) in THEIR OWN name/phone/links; every other tenant
// gets the neutral shared templates with output IDENTICAL to today — so this
// change is a no-op for the 23 non-cleaning tenants.
//
// To add another maid brand, add its slug to CLEANING_SLUGS.

import { tenantBrand } from './brand'
import * as cleaning from './sms-cleaning'
import type { BookingLike } from './sms-cleaning'
import * as generic from '../sms-templates'
import { supabaseAdmin } from '../supabase'

// Config-driven (not hardcoded slugs): any tenant whose industry is "cleaning"
// gets the maid-brand copy, in its OWN brand. Keeps the platform even — a new
// cleaning tenant works with zero code change.
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

export type ClientSmsTemplates = {
  bookingReceived(booking: BookingLike): string
  bookingConfirmed(booking: BookingLike): string
  confirmationReminder(booking: BookingLike): string
  bookingConfirmation(booking: BookingLike, portalUrl?: string): string
  reminder(booking: BookingLike, timeframe: string): string
  cancellation(booking: BookingLike, portalUrl?: string): string
  reschedule(booking: BookingLike, portalUrl?: string): string
  thankYou(clientName: string): string
  ratingQ1(): string
  bookingConfirmationES(booking: BookingLike): string
  reminderES(booking: BookingLike, timeframe: string): string
  cancellationES(booking: BookingLike): string
  rescheduleES(booking: BookingLike): string
}

export function isCleaningTenant(tenant: TenantLike): boolean {
  return (tenant.industry || '').toLowerCase() === 'cleaning'
}

// Brand fields the resolver needs; selected when a route only has a tenant id.
const BRAND_COLUMNS = 'slug, industry, name, phone, website_url, domain, domain_name, google_place_id'

/**
 * Load a tenant's brand row by id and return its client SMS templates. Use from
 * send paths that only have a tenant id in scope (crons, booking routes). One
 * lightweight read per call — fine for these low-frequency send paths. Falls
 * back to the neutral set if the tenant can't be loaded.
 */
export async function clientSmsTemplatesFor(tenantId: string): Promise<ClientSmsTemplates> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select(BRAND_COLUMNS)
    .eq('id', tenantId)
    .single()
  return clientSmsTemplates((data as TenantLike) || {})
}

export function clientSmsTemplates(tenant: TenantLike): ClientSmsTemplates {
  if (isCleaningTenant(tenant)) {
    const brand = tenantBrand(tenant)
    return {
      bookingReceived: b => cleaning.bookingReceived(brand, b),
      bookingConfirmed: b => cleaning.bookingConfirmed(brand, b),
      confirmationReminder: b => cleaning.confirmationReminder(brand, b),
      bookingConfirmation: b => cleaning.bookingConfirmation(brand, b),
      reminder: (b, tf) => cleaning.reminder(brand, b, tf),
      cancellation: b => cleaning.cancellation(brand, b),
      reschedule: b => cleaning.reschedule(brand, b),
      thankYou: n => cleaning.thankYou(brand, n),
      ratingQ1: () => cleaning.ratingQ1(brand),
      bookingConfirmationES: b => cleaning.bookingConfirmationES(brand, b),
      reminderES: (b, tf) => cleaning.reminderES(brand, b, tf),
      cancellationES: b => cleaning.cancellationES(brand, b),
      rescheduleES: b => cleaning.rescheduleES(brand, b),
    }
  }

  // Neutral shared templates, bound to this tenant's display name. Output is
  // identical to the pre-resolver behavior. The confirm-reply flow
  // (bookingConfirmed / confirmationReminder) is cleaning-specific; for neutral
  // tenants we fall back to the standard confirmation copy.
  const name = tenant.name || 'Your service'
  return {
    bookingReceived: b => generic.smsBookingReceived(name, b),
    bookingConfirmed: b => generic.smsBookingConfirmation(name, b),
    confirmationReminder: b => generic.smsBookingConfirmation(name, b),
    bookingConfirmation: (b, portalUrl) => generic.smsBookingConfirmation(name, b, portalUrl),
    reminder: (b, tf) => generic.smsReminder(name, b, tf),
    cancellation: (b, portalUrl) => generic.smsCancellation(name, b, portalUrl),
    reschedule: (b, portalUrl) => generic.smsReschedule(name, b, portalUrl),
    thankYou: n => generic.smsThankYou(name, n),
    ratingQ1: () => cleaning.ratingQ1(tenantBrand(tenant)),
    bookingConfirmationES: b => generic.smsBookingConfirmationES(name, b),
    reminderES: (b, tf) => generic.smsReminderES(name, b, tf),
    cancellationES: b => generic.smsCancellationES(name, b),
    rescheduleES: b => generic.smsRescheduleES(name, b),
  }
}
