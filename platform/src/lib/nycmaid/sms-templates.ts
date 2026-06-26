// ============================================
// SMS TEMPLATES — Short text versions of emails
// All messages end with opt-out info per TCPA
// ============================================

const STOP_TEXT = '\nReply STOP to opt out.'
const STOP_TEXT_ES = '\nResponde STOP para cancelar.'

// ============================================
// CLIENT SMS
// ============================================

export function smsBookingReceived(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const rate = booking.hourly_rate || 79
  const maxLine = booking.max_hours ? ` (max ${booking.max_hours} hours, capped per your request)` : ''
  const teamLine = (booking.team_size || 1) > 1 ? ` for our team of ${booking.team_size} cleaners` : ''
  const tapLink = booking.client_confirm_token ? `\n\nTap to confirm: https://www.thenycmaid.com/c/${booking.client_confirm_token}` : ''
  return `The NYC Maid: We received your booking request — please review and reply CONFIRM (or use the link below) to lock it in.\n\nTo recap: we are scheduling you${teamLine} for ${date} @ ${time} (allow for up to 60 additional minutes due to traffic) at the rate of $${rate}/hr${maxLine} paid via a secure Stripe link (card, Apple Pay, or Cash App) 30 minutes before service completion. You will receive a text from the system when 30 minutes out from completion. We have a no cancellation policy for the first service so I want to make sure all is correct :)${tapLink}\n\nQuestions? (646) 490-0130${STOP_TEXT}`
}

// Sent when the client already confirmed the recap on the form (no SMS CONFIRM
// reply needed). Acknowledges the lock-in and previews the cleaner-assignment
// step. Replaces the smsBookingReceived nag for form-confirmed bookings.
export function smsBookingConfirmed(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const rate = booking.hourly_rate || 79
  const teamLine = (booking.team_size || 1) > 1 ? ` for our team of ${booking.team_size} cleaners` : ''
  return `The NYC Maid: You're booked${teamLine} for ${date} @ ${time} at $${rate}/hr. We're assigning your cleaner now and will text you their name shortly. Questions? (646) 490-0130${STOP_TEXT}`
}

export function smsConfirmationReminder(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  return `The NYC Maid: We still need a CONFIRM reply for your booking on ${date} @ ${time}. If we don't receive your confirmation, we'll have to cancel the request and offer the time slot to another client.\n\nReply CONFIRM to lock it in. Questions? (646) 490-0130${STOP_TEXT}`
}

// Q1 — first ask. Keep it simple, one question. If no reply, we stop.
export function smsRatingQ1(): string {
  return `The NYC Maid: How was your service today? Reply 1-5 (5 = perfect).${STOP_TEXT}`
}

// Q2 — only sent after Q1 reply. Uses cleaner's actual first name.
export function smsRatingQ2(cleanerFirstName: string): string {
  return `Thanks! How was ${cleanerFirstName}? Reply 1-5.`
}

// Q3 — only sent after Q2 reply. Privacy note so they're honest.
export function smsRatingQ3(): string {
  return `Great, thank you! Last question — any feedback? It's private, your name is not shared with the cleaner.`
}

// Legacy single-shot, kept for back-compat with anything still referencing it.
export function smsRatingPrompt(booking: any): string {
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'your cleaner'
  return `The NYC Maid: How was your service today? Please reply with two ratings (1-5) and any feedback.\n\nFormat: SERVICE 1-5, ${cleanerName.toUpperCase()} 1-5, feedback\nExample: "5 5 Maria was amazing!"\n\nThanks for choosing us!${STOP_TEXT}`
}

export function smsRatingThanks(rating: { service_rating: number; cleaner_rating: number }): string {
  return `The NYC Maid: Thanks for the feedback — ${rating.service_rating}/5 service, ${rating.cleaner_rating}/5 cleaner. We've recorded it.${STOP_TEXT}`
}

export function smsReviewRequest(cleanerName: string): string {
  return `The NYC Maid: 5 stars — thank you! 😊 Mind leaving a public review for ${cleanerName}? We'll Zelle you $10 for a written review or $25 for a short selfie video about ${cleanerName} and the service.\n\nLeave it here: https://share.google/rZI6VgG0BYd3A2Lsn\n\nReply DONE with the link/screenshot once posted and we'll send your credit.${STOP_TEXT}`
}

export function smsBookingConfirmation(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Your cleaner'
  const isRecurring = !!booking.recurring_type
  const cancelPolicy = isRecurring
    ? 'Recurring services require 7 days notice to reschedule. No cancellations unless discontinuing service with 7 days notice.'
    : 'First-time/one-time services cannot be cancelled or rescheduled.'
  const teamSize = booking.team_size || 1
  const cleanerLine = teamSize > 1
    ? `with a team of ${teamSize} cleaners (${cleanerName} leading)`
    : `with ${cleanerName}`
  return `The NYC Maid: Confirmed — ${date} at ${time} ${cleanerLine}.\n\nPayment: secure Stripe link (card, Apple Pay, or Cash App), collected 30 min before end. If payment is not received, the cleaner will wait and the time is billable. Time billed in 30-min increments.\n\n${cancelPolicy} We hold your spot without payment upfront, turning away other clients — late changes affect our team members who depend on this income.\n\nPortal: thenycmaid.com/book${STOP_TEXT}`
}

export function smsReminder(booking: any, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Your cleaner'
  const teamSize = booking.team_size || 1
  const subject = teamSize > 1 ? `your team of ${teamSize} (${cleanerName} leading)` : cleanerName
  const isRecurring = !!booking.recurring_type
  const policy = isRecurring
    ? 'Recurring services require 7 days notice to reschedule. No cancellations unless discontinuing with 7 days notice.'
    : 'This service cannot be cancelled or rescheduled.'
  if (timeframe === 'in 2 hours') {
    return `The NYC Maid: Reminder — ${subject} ${teamSize > 1 ? 'arrive' : 'arrives'} at ${time}. Almost time!\n\n${policy}${STOP_TEXT}`
  }
  return `The NYC Maid: Reminder — cleaning ${timeframe} at ${time} with ${subject}.\n\n${policy}${STOP_TEXT}`
}

export function smsCancellation(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: Your ${date} cleaning has been cancelled. Rebook: thenycmaid.com/book${STOP_TEXT}`
}

export function smsReschedule(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  return `The NYC Maid: Your cleaning has been rescheduled to ${newDate} at ${newTime}. Details: thenycmaid.com/book${STOP_TEXT}`
}

export function smsThankYou(clientName: string): string {
  const firstName = clientName?.split(' ')[0] || 'there'
  return `The NYC Maid: Thanks ${firstName}! Enjoy 10% off your next booking. Book: thenycmaid.com/book${STOP_TEXT}`
}

export function smsVerificationCode(code: string): string {
  return `The NYC Maid: Your code is ${code}. Expires in 10 min.`
}

// ============================================
// CLIENT SMS (Spanish)
// ============================================

export function smsBookingConfirmationES(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Tu limpiador/a'
  return `The NYC Maid: Tu limpieza está confirmada para ${date} a las ${time} con ${cleanerName}. Detalles: thenycmaid.com/book${STOP_TEXT_ES}`
}

export function smsReminderES(booking: any, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Tu limpiador/a'
  const tfMap: Record<string, string> = {
    'in 2 hours': 'en 2 horas',
    'tomorrow': 'mañana',
    'in 1 hour': 'en 1 hora',
  }
  const tfES = tfMap[timeframe] || timeframe
  if (timeframe === 'in 2 hours') {
    return `The NYC Maid: Recordatorio — ${cleanerName} llega a las ${time}. ¡Ya casi!${STOP_TEXT_ES}`
  }
  return `The NYC Maid: Recordatorio — limpieza ${tfES} a las ${time} con ${cleanerName}.${STOP_TEXT_ES}`
}

export function smsCancellationES(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: Tu limpieza del ${date} ha sido cancelada. Reservar de nuevo: thenycmaid.com/book${STOP_TEXT_ES}`
}

export function smsRescheduleES(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  return `The NYC Maid: Tu limpieza ha sido reprogramada para ${newDate} a las ${newTime}. Detalles: thenycmaid.com/book${STOP_TEXT_ES}`
}

export function smsThankYouES(clientName: string): string {
  const firstName = clientName?.split(' ')[0] || ''
  return `The NYC Maid: ¡Gracias ${firstName}! Disfruta 10% de descuento en tu próxima reserva. Reservar: thenycmaid.com/book${STOP_TEXT_ES}`
}

// ============================================
// CLEANER SMS (Bilingual EN/ES)
// ============================================

export function smsJobAssignment(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const pin = booking.cleaners?.pin || ''
  const supplies = booking.hourly_rate === 49
    ? ' (Labor only - client has supplies / Solo mano de obra - cliente tiene suministros)'
    : ' (Bring supplies / Trae suministros)'
  return `The NYC Maid: New job ${date} ${time} - ${booking.clients?.name || 'Client'}.${supplies} Portal: thenycmaid.com/team PIN: ${pin}\nNuevo trabajo ${date} ${time}.${supplies} Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsDailySummary(cleanerName: string, count: number, pin?: string, bookings?: any[]): string {
  const firstName = cleanerName.split(' ')[0]
  const pinText = pin ? ` PIN: ${pin}` : ''

  let jobLines = ''
  if (bookings && bookings.length > 0) {
    jobLines = '\n' + bookings.map(b => {
      const d = new Date(b.start_time)
      const date = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
      const time = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
      const client = b.clients?.name || 'Client'
      const addr = b.clients?.address || ''
      const phone = b.clients?.phone || ''
      const supplies = b.hourly_rate === 49 ? ' [Labor only / Solo mano de obra]' : ''
      return `\n${date} ${time}${supplies}\n${client}${phone ? ' ' + phone : ''}${addr ? '\n' + addr : ''}`
    }).join('\n')
  }

  return `The NYC Maid: Hi ${firstName}, ${count} job${count === 1 ? '' : 's'} next 3 days:${jobLines}\n\nPortal: thenycmaid.com/team${pinText}\n\nHola ${firstName}, ${count} trabajo${count === 1 ? '' : 's'} en los próximos 3 días. Portal: thenycmaid.com/team${pinText}${STOP_TEXT}`
}

export function smsJobCancelled(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: Cancelled - ${date} job (${booking.clients?.name || 'Client'}). Portal: thenycmaid.com/team PIN: ${pin}\nCancelado - trabajo del ${date}. Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsJobRescheduled(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const pin = booking.cleaners?.pin || ''
  const supplies = booking.hourly_rate === 49
    ? ' (Labor only / Solo mano de obra)'
    : ' (Bring supplies / Trae suministros)'
  return `The NYC Maid: Rescheduled - ${booking.clients?.name || 'Client'} moved to ${newDate} ${newTime}.${supplies} Portal: thenycmaid.com/team PIN: ${pin}\nReprogramado al ${newDate} ${newTime}.${supplies} Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsUrgentBroadcast(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const payRate = booking.cleaner_pay_rate || 40
  return `The NYC Maid URGENT: $${payRate}/hr job available ${date} ${time}. Claim now: thenycmaid.com/team\nURGENTE: Trabajo $${payRate}/hr ${date} ${time}. Reclamar: thenycmaid.com/team${STOP_TEXT}`
}

// ============================================
// CLIENT PAYMENT SMS
// ============================================

export function smsPaymentDue(clientName: string, amount: string): string {
  const firstName = clientName?.split(' ')[0] || 'there'
  return `The NYC Maid: Hi ${firstName}, your cleaning is wrapping up soon! Payment of $${amount} is due via the secure Stripe link we text you (card, Apple Pay, or Cash App). Our team can't leave until payment is processed — thank you!${STOP_TEXT}`
}

export function smsPaymentDueES(clientName: string, amount: string): string {
  const firstName = clientName?.split(' ')[0] || ''
  return `The NYC Maid: Hola ${firstName}, tu limpieza está por terminar. El pago de $${amount} se puede hacer con el enlace seguro de Stripe que te enviamos (tarjeta, Apple Pay o Cash App). Nuestro equipo no puede irse hasta que se procese el pago — ¡gracias!${STOP_TEXT_ES}`
}

// ============================================
// ADMIN SMS
// ============================================

export function smsPaymentDueAdmin(clientName: string, cleanerName: string, amount: string): string {
  return `The NYC Maid: 30 min left — ${clientName} with ${cleanerName}. Collect $${amount} via Stripe link`
}

export function smsNewClient(name: string): string {
  return `The NYC Maid: New client — ${name} via collect form`
}

export function smsLateCheckInCleaner(booking: any): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: You're late for your ${time} job (${clientName}). Please check in ASAP: thenycmaid.com/team PIN: ${pin}\nEstás tarde para tu trabajo de las ${time} (${clientName}). Regístrate ahora: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsLateCheckInAdmin(booking: any): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  return `The NYC Maid: Late check-in — ${cleanerName} hasn't checked in for ${time} job (${clientName}). 10+ min overdue.`
}

export function smsLateCheckOutCleaner(booking: any): string {
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: Please check out for your ${clientName} job. 30-min alert was sent 30+ min ago. Check out now: thenycmaid.com/team PIN: ${pin}\nPor favor regístrate de salida para tu trabajo con ${clientName}. Salir ahora: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsLateCheckOutAdmin(booking: any): string {
  const cleanerName = booking.cleaners?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  return `The NYC Maid: Late check-out — ${cleanerName} hasn't checked out for ${clientName}. 30+ min since 30-min alert.`
}

export function smsNewBooking(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: New booking — ${booking.clients?.name || 'Unknown'} on ${date}`
}

export function smsNewApplication(name: string): string {
  return `The NYC Maid: New cleaner application — ${name}`
}

export function smsNewReferrer(name: string, code: string): string {
  return `The NYC Maid: New referrer — ${name} (${code})`
}
