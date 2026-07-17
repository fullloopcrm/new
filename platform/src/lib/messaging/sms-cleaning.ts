// Cleaning / maid-brand client SMS templates.
//
// Ported line-for-line from the CURRENT standalone nycmaid build
// (~/Desktop/nycmaid/src/lib/sms-templates.ts) — arrival-window phrasing,
// current wording, policies — with brand strings (name, phone, links) injected
// from TenantBrand so nycmaid AND the-florida-maid share one source of truth in
// their own voice. Adapted for FullLoop schema: nycmaid's `booking.cleaners`
// relation is `booking.team_members` here.
//
// Selected by clientSmsTemplates(tenant) for cleaning-slug tenants only.

import { clientArrivalWindow, ARRIVAL_WINDOW_NOTE_SMS, ARRIVAL_WINDOW_NOTE_ES } from '../time-window'
import type { TenantBrand } from './brand'

const STOP_TEXT = '\nReply STOP to opt out.'
const STOP_TEXT_ES = '\nResponde STOP para cancelar.'

export type BookingLike = {
  start_time: string
  hourly_rate?: number | null
  max_hours?: number | null
  team_size?: number | null
  recurring_type?: string | null
  client_confirm_token?: string | null
  team_members?: { name?: string | null } | null
  cleaners?: { name?: string | null } | null
  is_emergency?: boolean | null
}

const etDate = (t: string) =>
  new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })

function proFirst(b: BookingLike, fallback: string): string {
  const name = b.team_members?.name || b.cleaners?.name || ''
  return name.split(' ')[0] || fallback
}

function rateOf(b: BookingLike): number {
  return b.hourly_rate || 69
}

export function bookingReceived(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  const time = clientArrivalWindow(booking.start_time)
  const rate = rateOf(booking)
  const maxLine = booking.max_hours ? ` (max ${booking.max_hours} hours, capped per your request)` : ''
  const teamLine = (booking.team_size || 1) > 1 ? ` for our team of ${booking.team_size} cleaners` : ''
  const minLine = (booking.team_size || 1) > 1 ? ' This is a 2+ cleaner booking — 4-hour minimum, and no discounts apply.' : ' A 2-hour minimum applies (first-time cleanings included).'
  const tapLink = booking.client_confirm_token && brand.site ? `\n\nTap to confirm: https://${brand.site}/c/${booking.client_confirm_token}` : ''
  const phoneLine = brand.phone ? `\n\nQuestions? ${brand.phone}` : ''
  return `${brand.name}: We received your booking request — please review and reply CONFIRM (or use the link below) to lock it in.\n\nTo recap: we are scheduling you${teamLine} for ${date}, arrival window ${time} (${ARRIVAL_WINDOW_NOTE_SMS} The cleaning itself runs the booked hours.) at the rate of $${rate}/hr${maxLine} paid via the secure payment link we text you (Apple Pay, card, or Cash App) 30 minutes before service completion.${minLine} You will receive a text from the system when 30 minutes out from completion. We have a no cancellation policy for the first service so I want to make sure all is correct :)${tapLink}${phoneLine}${STOP_TEXT}`
}

export function bookingConfirmed(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  const time = clientArrivalWindow(booking.start_time)
  const rate = rateOf(booking)
  const teamLine = (booking.team_size || 1) > 1 ? ` for our team of ${booking.team_size} cleaners` : ''
  const minLine = (booking.team_size || 1) > 1 ? ' (2+ cleaners: 4-hour minimum, no discounts.)' : ' (2-hour minimum applies.)'
  const phoneLine = brand.phone ? ` Questions? ${brand.phone}` : ''
  return `${brand.name}: Your booking request${teamLine} for ${date}, arrival window ${time}, at $${rate}/hr is IN REVIEW.${minLine} ${ARRIVAL_WINDOW_NOTE_SMS} The owner confirms within the hour, then you'll get a second text from us locking in the date/time/cleaner. NOT FINALIZED until that confirmation lands — please don't plan around this slot until then.${phoneLine}${STOP_TEXT}`
}

export function confirmationReminder(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  const time = clientArrivalWindow(booking.start_time)
  const phoneLine = brand.phone ? ` Questions? ${brand.phone}` : ''
  return `${brand.name}: We still need a CONFIRM reply for your booking on ${date}, arrival window ${time}. If we don't receive your confirmation, we'll have to cancel the request and offer the time slot to another client.\n\n${ARRIVAL_WINDOW_NOTE_SMS}\n\nReply CONFIRM to lock it in.${phoneLine}${STOP_TEXT}`
}

export function bookingConfirmation(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  const time = clientArrivalWindow(booking.start_time)
  const cleanerName = proFirst(booking, 'Your cleaner')
  const isRecurring = !!booking.recurring_type
  const cancelPolicy = isRecurring
    ? '⚠️ POLICY: Recurring service — 7 DAYS notice required to reschedule or cancel. No exceptions.'
    : '⚠️ POLICY: First-time/one-time bookings CANNOT be cancelled or rescheduled. No exceptions.'
  const teamSize = booking.team_size || 1
  const cleanerLine = teamSize > 1
    ? `with a team of ${teamSize} cleaners (${cleanerName} leading)`
    : `with ${cleanerName}`
  return `${brand.name}: Confirmed — ${date}, arrival window ${time}, ${cleanerLine}.\n\n${ARRIVAL_WINDOW_NOTE_SMS}\n\n${cancelPolicy} We hold your spot, turn other clients away, and our team plans around it.\n\nPayment: a secure link (Apple Pay, card, or Cash App) we text you ~30 min before end. If payment isn't received the cleaner waits — billable time. Billed in 30-min increments.\n\nPortal: ${brand.bookUrl}${STOP_TEXT}`
}

export function reminder(brand: TenantBrand, booking: BookingLike, timeframe: string): string {
  const time = clientArrivalWindow(booking.start_time)
  const cleanerName = proFirst(booking, 'Your cleaner')
  const teamSize = booking.team_size || 1
  const subject = teamSize > 1 ? `your team of ${teamSize} (${cleanerName} leading)` : cleanerName
  const isRecurring = !!booking.recurring_type
  const policy = isRecurring
    ? 'Recurring services require 7 days notice to reschedule. No cancellations unless discontinuing with 7 days notice.'
    : 'This service cannot be cancelled or rescheduled.'
  if (timeframe === 'in 2 hours') {
    return `${brand.name}: Reminder — ${subject} ${teamSize > 1 ? 'arrive' : 'arrives'} within your ${time} window. Almost time!\n\n${ARRIVAL_WINDOW_NOTE_SMS}\n\n${policy}${STOP_TEXT}`
  }
  return `${brand.name}: Reminder — cleaning ${timeframe}, arrival window ${time}, with ${subject}.\n\n${ARRIVAL_WINDOW_NOTE_SMS}\n\n${policy}${STOP_TEXT}`
}

export function cancellation(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  return `${brand.name}: Your ${date} cleaning has been cancelled. Rebook: ${brand.bookUrl}${STOP_TEXT}`
}

export function reschedule(brand: TenantBrand, booking: BookingLike): string {
  const newDate = etDate(booking.start_time)
  const newTime = clientArrivalWindow(booking.start_time)
  const urgentLine = booking.is_emergency ? ' This is now a same-day/emergency booking — our emergency rate applies.' : ''
  return `${brand.name}: Your cleaning has been rescheduled to ${newDate}, arrival window ${newTime}.${urgentLine} ${ARRIVAL_WINDOW_NOTE_SMS} Details: ${brand.bookUrl}${STOP_TEXT}`
}

export function thankYou(brand: TenantBrand, clientName: string): string {
  const firstName = clientName?.split(' ')[0] || 'there'
  return `${brand.name}: Thanks ${firstName}! Enjoy 10% off your next booking. Book: ${brand.bookUrl}${STOP_TEXT}`
}

// Post-service rating ask (Q1). Industry-neutral wording — safe for any brand.
export function ratingQ1(brand: TenantBrand): string {
  return `${brand.name}: How was your service today? Reply 1-5 (5 = perfect).${STOP_TEXT}`
}

// ---- Spanish ----

export function bookingConfirmationES(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  const time = clientArrivalWindow(booking.start_time)
  const cleanerName = proFirst(booking, 'Tu limpiador/a')
  return `${brand.name}: Tu limpieza está confirmada para ${date}, ventana de llegada ${time}, con ${cleanerName}. ${ARRIVAL_WINDOW_NOTE_ES} Detalles: ${brand.bookUrl}${STOP_TEXT_ES}`
}

export function reminderES(brand: TenantBrand, booking: BookingLike, timeframe: string): string {
  const time = clientArrivalWindow(booking.start_time)
  const cleanerName = proFirst(booking, 'Tu limpiador/a')
  const tfMap: Record<string, string> = { 'in 2 hours': 'en 2 horas', 'tomorrow': 'mañana', 'in 1 hour': 'en 1 hora' }
  const tfES = tfMap[timeframe] || timeframe
  if (timeframe === 'in 2 hours') {
    return `${brand.name}: Recordatorio — ${cleanerName} llega dentro de tu ventana de ${time}. ¡Ya casi!\n\n${ARRIVAL_WINDOW_NOTE_ES}${STOP_TEXT_ES}`
  }
  return `${brand.name}: Recordatorio — limpieza ${tfES}, ventana de llegada ${time}, con ${cleanerName}.\n\n${ARRIVAL_WINDOW_NOTE_ES}${STOP_TEXT_ES}`
}

export function cancellationES(brand: TenantBrand, booking: BookingLike): string {
  const date = etDate(booking.start_time)
  return `${brand.name}: Tu limpieza del ${date} ha sido cancelada. Reservar de nuevo: ${brand.bookUrl}${STOP_TEXT_ES}`
}

export function rescheduleES(brand: TenantBrand, booking: BookingLike): string {
  const newDate = etDate(booking.start_time)
  const newTime = clientArrivalWindow(booking.start_time)
  const urgentLine = booking.is_emergency ? ' Esta reserva ahora es de emergencia el mismo día — aplica nuestra tarifa de emergencia.' : ''
  return `${brand.name}: Tu limpieza ha sido reprogramada para ${newDate}, ventana de llegada ${newTime}.${urgentLine} ${ARRIVAL_WINDOW_NOTE_ES} Detalles: ${brand.bookUrl}${STOP_TEXT_ES}`
}
