// Cleaning / maid-brand team (cleaner) + admin SMS templates.
//
// Ported line-for-line from the CURRENT standalone nycmaid build
// (~/Desktop/nycmaid/src/lib/sms-templates.ts) — PIN, supplies note, ET
// timezone, bilingual body — with brand strings (name, portal link) injected
// from TenantBrand so nycmaid AND the-florida-maid share one source of truth
// in their own voice. Adapted for FullLoop schema: nycmaid's `booking.cleaners`
// relation is `booking.team_members` here.
//
// Selected by teamSmsTemplates(tenant) for cleaning-slug tenants only.

import type { TenantBrand } from './brand'

const STOP_TEXT = '\nReply STOP to opt out.'

export type TeamBookingLike = {
  start_time: string
  hourly_rate?: number | null
  pay_rate?: number | null
  is_emergency?: boolean | null
  clients?: { name?: string | null; phone?: string | null; address?: string | null } | null
  team_members?: { name?: string | null; pin?: string | null } | null
}

const etDate = (t: string) =>
  new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })

const etTime = (t: string) =>
  new Date(t).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })

function suppliesLine(booking: TeamBookingLike): string {
  return booking.hourly_rate === 49
    ? ' (Labor only - client has supplies / Solo mano de obra - cliente tiene suministros)'
    : ' (Bring supplies / Trae suministros)'
}

// Item (7)/P11.22 push-half fix: booking.is_emergency/pay_rate were never in
// this signature at all, so an assigned tech had no way to learn the job was
// urgent or that a pay premium applied. Both fields optional so every
// existing caller keeps working unchanged.
export function jobAssignment(brand: TenantBrand, booking: TeamBookingLike): string {
  const date = etDate(booking.start_time)
  const time = etTime(booking.start_time)
  const pin = booking.team_members?.pin || ''
  const supplies = suppliesLine(booking)
  const portal = `${brand.site}/team`
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  const prefixEs = booking.is_emergency ? 'URGENTE — ' : ''
  const rateLine = booking.is_emergency && booking.pay_rate ? ` Pay: $${booking.pay_rate}/hr.` : ''
  return `${brand.name}: ${prefix}New job ${date} ${time} - ${booking.clients?.name || 'Client'}.${rateLine}${supplies} Portal: ${portal} PIN: ${pin}\n${prefixEs}Nuevo trabajo ${date} ${time}.${rateLine}${supplies} Portal: ${portal} PIN: ${pin}${STOP_TEXT}`
}

export function dailySummary(brand: TenantBrand, cleanerName: string, count: number, pin?: string, bookings?: TeamBookingLike[]): string {
  const firstName = cleanerName.split(' ')[0]
  const portal = `${brand.site}/team`
  const pinText = pin ? ` PIN: ${pin}` : ''

  let jobLines = ''
  if (bookings && bookings.length > 0) {
    jobLines = '\n' + bookings.map(b => {
      const date = etDate(b.start_time)
      const time = etTime(b.start_time)
      const client = b.clients?.name || 'Client'
      const addr = b.clients?.address || ''
      const phone = b.clients?.phone || ''
      const supplies = b.hourly_rate === 49 ? ' [Labor only / Solo mano de obra]' : ''
      return `\n${date} ${time}${supplies}\n${client}${phone ? ' ' + phone : ''}${addr ? '\n' + addr : ''}`
    }).join('\n')
  }

  return `${brand.name}: Hi ${firstName}, ${count} job${count === 1 ? '' : 's'} next 3 days:${jobLines}\n\nPortal: ${portal}${pinText}\n\nHola ${firstName}, ${count} trabajo${count === 1 ? '' : 's'} en los próximos 3 días. Portal: ${portal}${pinText}${STOP_TEXT}`
}

export function lateCheckInCleaner(brand: TenantBrand, booking: TeamBookingLike): string {
  const time = etTime(booking.start_time)
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.team_members?.pin || ''
  const portal = `${brand.site}/team`
  return `${brand.name}: You're late for your ${time} job (${clientName}). Please check in ASAP: ${portal} PIN: ${pin}\nEstás tarde para tu trabajo de las ${time} (${clientName}). Regístrate ahora: ${portal} PIN: ${pin}${STOP_TEXT}`
}

export function lateCheckInAdmin(brand: TenantBrand, booking: TeamBookingLike): string {
  const time = etTime(booking.start_time)
  const cleanerName = booking.team_members?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  return `${brand.name}: ${prefix}Late check-in — ${cleanerName} hasn't checked in for ${time} job (${clientName}). 10+ min overdue.`
}

export function lateCheckOutCleaner(brand: TenantBrand, booking: TeamBookingLike): string {
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.team_members?.pin || ''
  const portal = `${brand.site}/team`
  return `${brand.name}: Please check out for your ${clientName} job. 30-min alert was sent 30+ min ago. Check out now: ${portal} PIN: ${pin}\nPor favor regístrate de salida para tu trabajo con ${clientName}. Salir ahora: ${portal} PIN: ${pin}${STOP_TEXT}`
}

export function lateCheckOutAdmin(brand: TenantBrand, booking: TeamBookingLike): string {
  const cleanerName = booking.team_members?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  return `${brand.name}: ${prefix}Late check-out — ${cleanerName} hasn't checked out for ${clientName}. 30+ min since 30-min alert.`
}
