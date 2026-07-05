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
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `The NYC Maid: We received your booking request for ${date} at ${time}. We'll confirm with your cleaner's details shortly. Questions? (646) 490-0130${STOP_TEXT}`
}

export function smsBookingConfirmation(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Your cleaner'
  const isRecurring = !!booking.recurring_type
  const cancelPolicy = isRecurring
    ? 'Recurring services require 7 days notice to reschedule. No cancellations unless discontinuing service with 7 days notice.'
    : 'First-time/one-time services cannot be cancelled or rescheduled.'
  return `The NYC Maid: Confirmed — ${date} at ${time} with ${cleanerName}.\n\nPayment: Zelle (hi@thenycmaid.com) or Apple Pay, collected 15 min before end. Time billed until cleaner leaves/payment is collected.\n\n${cancelPolicy} We hold your spot without payment upfront, turning away other clients — late changes affect our team members who depend on this income.\n\nPortal: thenycmaid.com/book${STOP_TEXT}`
}

export function smsReminder(booking: any, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Your cleaner'
  const isRecurring = !!booking.recurring_type
  const policy = isRecurring
    ? 'Recurring services require 7 days notice to reschedule. No cancellations unless discontinuing with 7 days notice.'
    : 'This service cannot be cancelled or rescheduled.'
  if (timeframe === 'in 2 hours') {
    return `The NYC Maid: Reminder — ${cleanerName} arrives at ${time}. Almost time!\n\n${policy}${STOP_TEXT}`
  }
  return `The NYC Maid: Reminder — cleaning ${timeframe} at ${time} with ${cleanerName}.\n\n${policy}${STOP_TEXT}`
}

export function smsCancellation(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: Your ${date} cleaning has been cancelled. Rebook: thenycmaid.com/book${STOP_TEXT}`
}

export function smsReschedule(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Tu limpiador/a'
  return `The NYC Maid: Tu limpieza está confirmada para ${date} a las ${time} con ${cleanerName}. Detalles: thenycmaid.com/book${STOP_TEXT_ES}`
}

export function smsReminderES(booking: any, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: Tu limpieza del ${date} ha sido cancelada. Reservar de nuevo: thenycmaid.com/book${STOP_TEXT_ES}`
}

export function smsRescheduleES(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: New job ${date} ${time} - ${booking.clients?.name || 'Client'}. Portal: thenycmaid.com/team PIN: ${pin}\nNuevo trabajo ${date} ${time}. Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsDailySummary(cleanerName: string, count: number, pin?: string, bookings?: any[]): string {
  const firstName = cleanerName.split(' ')[0]
  const pinText = pin ? ` PIN: ${pin}` : ''

  let jobLines = ''
  if (bookings && bookings.length > 0) {
    jobLines = '\n' + bookings.map(b => {
      const d = new Date(b.start_time)
      const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const client = b.clients?.name || 'Client'
      const addr = b.clients?.address || ''
      const phone = b.clients?.phone || ''
      return `\n${date} ${time}\n${client}${phone ? ' ' + phone : ''}${addr ? '\n' + addr : ''}`
    }).join('\n')
  }

  return `The NYC Maid: Hi ${firstName}, ${count} job${count === 1 ? '' : 's'} next 3 days:${jobLines}\n\nPortal: thenycmaid.com/team${pinText}\n\nHola ${firstName}, ${count} trabajo${count === 1 ? '' : 's'} en los próximos 3 días. Portal: thenycmaid.com/team${pinText}${STOP_TEXT}`
}

export function smsJobCancelled(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: Cancelled - ${date} job (${booking.clients?.name || 'Client'}). Portal: thenycmaid.com/team PIN: ${pin}\nCancelado - trabajo del ${date}. Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsJobRescheduled(booking: any): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: Rescheduled - ${booking.clients?.name || 'Client'} moved to ${newDate} ${newTime}. Portal: thenycmaid.com/team PIN: ${pin}\nReprogramado al ${newDate} ${newTime}. Portal: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsUrgentBroadcast(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const payRate = booking.cleaner_pay_rate || 40
  return `The NYC Maid URGENT: $${payRate}/hr job available ${date} ${time}. Claim now: thenycmaid.com/team\nURGENTE: Trabajo $${payRate}/hr ${date} ${time}. Reclamar: thenycmaid.com/team${STOP_TEXT}`
}

// ============================================
// CLIENT PAYMENT SMS
// ============================================

export function smsPaymentDue(clientName: string, amount: string): string {
  const firstName = clientName?.split(' ')[0] || 'there'
  return `The NYC Maid: Hi ${firstName}, your cleaning is wrapping up soon! Payment of $${amount} is due via Zelle (hi@thenycmaid.com) or Apple Pay (2120292200). Our team can't leave until payment is processed — thank you!${STOP_TEXT}`
}

export function smsPaymentDueES(clientName: string, amount: string): string {
  const firstName = clientName?.split(' ')[0] || ''
  return `The NYC Maid: Hola ${firstName}, tu limpieza está por terminar. El pago de $${amount} se puede hacer por Zelle (hi@thenycmaid.com) o Apple Pay (2120292200). Nuestro equipo no puede irse hasta que se procese el pago — ¡gracias!${STOP_TEXT_ES}`
}

// ============================================
// ADMIN SMS
// ============================================

export function smsPaymentDueAdmin(clientName: string, cleanerName: string, amount: string): string {
  return `The NYC Maid: 15 min left — ${clientName} with ${cleanerName}. Collect $${amount} via Zelle/Apple Pay`
}

export function smsNewClient(name: string): string {
  return `The NYC Maid: New client — ${name} via collect form`
}

export function smsLateCheckInCleaner(booking: any): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: You're late for your ${time} job (${clientName}). Please check in ASAP: thenycmaid.com/team PIN: ${pin}\nEstás tarde para tu trabajo de las ${time} (${clientName}). Regístrate ahora: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsLateCheckInAdmin(booking: any): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  return `The NYC Maid: Late check-in — ${cleanerName} hasn't checked in for ${time} job (${clientName}). 10+ min overdue.`
}

export function smsLateCheckOutCleaner(booking: any): string {
  const clientName = booking.clients?.name || 'Client'
  const pin = booking.cleaners?.pin || ''
  return `The NYC Maid: Please check out for your ${clientName} job. 15-min alert was sent 30+ min ago. Check out now: thenycmaid.com/team PIN: ${pin}\nPor favor regístrate de salida para tu trabajo con ${clientName}. Salir ahora: thenycmaid.com/team PIN: ${pin}${STOP_TEXT}`
}

export function smsLateCheckOutAdmin(booking: any): string {
  const cleanerName = booking.cleaners?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  return `The NYC Maid: Late check-out — ${cleanerName} hasn't checked out for ${clientName}. 30+ min since 15-min alert.`
}

export function smsNewBooking(booking: any): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `The NYC Maid: New booking — ${booking.clients?.name || 'Unknown'} on ${date}`
}

export function smsNewApplication(name: string): string {
  return `The NYC Maid: New cleaner application — ${name}`
}

export function smsNewReferrer(name: string, code: string): string {
  return `The NYC Maid: New referrer — ${name} (${code})`
}
