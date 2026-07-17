// Per-tenant client EMAIL resolver — mirror of client-sms.ts.
//
// Cleaning/maid-brand tenants get nycmaid's rich email templates; everyone else
// gets the neutral shared templates (already tenant-branded via TemplateData).
// Scoped to nycmaid ONLY for now: the nycmaid email templates hardcode nycmaid's
// own Stripe link / phone / review URL, so sending them for another tenant would
// be a real bug. Florida-maid rich email is a follow-up (needs its own Stripe
// link threaded). Every function returns { subject, html }.

import * as nycmaidEmail from '../nycmaid/email-templates'
import { clientBookingReceivedEmail as sharedBookingReceived, bookingConfirmationEmail as sharedConfirmation } from '../email-templates'
import { supabaseAdmin } from '../supabase'

const EMAIL_CLEANING_SLUGS = new Set<string>(['nycmaid'])

type TenantLike = {
  slug?: string | null
  name?: string | null
  primary_color?: string | null
  logo_url?: string | null
}

type EmailOut = { subject: string; html: string }

function isNycmaid(tenant: TenantLike): boolean {
  return !!tenant.slug && EMAIL_CLEANING_SLUGS.has(tenant.slug)
}

function flatDateTime(startTime: string): string {
  const d = new Date(startTime)
  const date = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  return `${date} ${time}`
}

function td(tenant: TenantLike) {
  return {
    tenantName: tenant.name || 'Your Business',
    primaryColor: tenant.primary_color || '#111827',
    logoUrl: tenant.logo_url || undefined,
  }
}

export function bookingReceivedEmail(tenant: TenantLike, booking: any): EmailOut {
  if (isNycmaid(tenant)) return nycmaidEmail.clientBookingReceivedEmail(booking)
  const html = sharedBookingReceived({
    ...td(tenant),
    clientName: booking.clients?.name || 'Client',
    dateTime: flatDateTime(booking.start_time),
    serviceName: booking.service_type || 'Appointment',
    isEmergency: !!booking.is_emergency,
  })
  return { subject: `Booking received — ${tenant.name || 'Your booking'}`, html }
}

export function confirmationEmail(tenant: TenantLike, booking: any): EmailOut {
  if (isNycmaid(tenant)) return nycmaidEmail.clientConfirmationEmail(booking)
  const html = sharedConfirmation({
    ...td(tenant),
    clientName: booking.clients?.name || 'Client',
    serviceName: booking.service_type || 'Appointment',
    dateTime: flatDateTime(booking.start_time),
    teamMemberName: booking.team_members?.name || booking.cleaners?.name || 'Your pro',
    address: booking.clients?.address || undefined,
    // bookingConfirmationEmail has always supported a price row (email-templates.ts
    // TemplateData `price?: string`) but this non-nycmaid wiring never passed it --
    // booking.price (cents) is present on every row this is called with (see
    // client/recurring/route.ts's insert), so every non-nycmaid tenant's confirmed
    // booking email silently omitted price even though the template already renders
    // it when given one. Same price-transparency gap flagged against the
    // booking-*received* email in EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION, but
    // that one's still an open product call (price may not be final pre-confirmation);
    // this is a confirmed booking, so the price is definite and safe to show.
    price: typeof booking.price === 'number' ? `$${(booking.price / 100).toFixed(2)}` : undefined,
  })
  return { subject: `Booking confirmed — ${tenant.name || 'Your booking'}`, html }
}

async function loadTenant(tenantId: string): Promise<TenantLike> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('slug, name, primary_color, logo_url')
    .eq('id', tenantId)
    .single()
  return (data as TenantLike) || {}
}

export async function confirmationEmailFor(tenantId: string, booking: any): Promise<EmailOut> {
  return confirmationEmail(await loadTenant(tenantId), booking)
}
