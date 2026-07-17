// ============================================
// SMS TEMPLATES — Multi-tenant, uses business name
// All messages end with opt-out info per TCPA
// ============================================

const STOP_TEXT = '\nReply STOP to opt out.'
const STOP_TEXT_ES = '\nResponde STOP para cancelar.'

// Item (115): every date/time render below had zero `timeZone` option at
// all (unlike sms-cleaning.ts/team-sms.ts's hardcoded America/New_York), so
// these generic templates -- sent to all ~23 non-cleaning tenants across
// all 4 US zones per item (70) -- rendered in the server runtime's default
// zone (UTC on Vercel), not even the tenant's own configured zone. Callers
// now thread the tenant's timezone through; falls back to ET (the same
// default formatInTz/zipToTimezone already use) when omitted so no existing
// caller's behavior gets worse.
function fmtDate(iso: string, timezone?: string | null): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: timezone || 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtTime(iso: string, timezone?: string | null): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: timezone || 'America/New_York', hour: 'numeric', minute: '2-digit' })
}

// ============================================
// CLIENT SMS
// ============================================

// P11.14: was urgency-blind by construction (no emergency field in the signature
// at all). is_emergency is optional so every existing caller keeps working unchanged.
export function smsBookingReceived(bizName: string, booking: { start_time: string; is_emergency?: boolean | null }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  if (booking.is_emergency) {
    return `${bizName}: URGENT request received for ${date} at ${time}. We're treating this as a priority and working to confirm ASAP.${STOP_TEXT}`
  }
  return `${bizName}: We received your booking request for ${date} at ${time}. We'll confirm with details shortly.${STOP_TEXT}`
}

export function smsBookingConfirmation(bizName: string, booking: { start_time: string; team_members?: { name?: string | null } | null }, portalUrl?: string, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Your pro'
  const link = portalUrl ? ` Details: ${portalUrl}` : ''
  return `${bizName}: Confirmed — ${date} at ${time} with ${memberName}. Payment collected at end of service.${link}${STOP_TEXT}`
}

export function smsReminder(bizName: string, booking: { start_time: string; team_members?: { name?: string | null } | null }, timeframe: string, timezone?: string | null): string {
  const time = fmtTime(booking.start_time, timezone)
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Your pro'
  if (timeframe === 'in 2 hours') {
    return `${bizName}: Reminder — ${memberName} arrives at ${time}. Almost time!${STOP_TEXT}`
  }
  return `${bizName}: Reminder — appointment ${timeframe} at ${time} with ${memberName}.${STOP_TEXT}`
}

export function smsCancellation(bizName: string, booking: { start_time: string }, portalUrl?: string, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const link = portalUrl ? ` Rebook: ${portalUrl}` : ''
  return `${bizName}: Your ${date} appointment has been cancelled.${link}${STOP_TEXT}`
}

export function smsReschedule(bizName: string, booking: { start_time: string; is_emergency?: boolean | null }, portalUrl?: string, timezone?: string | null): string {
  const newDate = fmtDate(booking.start_time, timezone)
  const newTime = fmtTime(booking.start_time, timezone)
  const link = portalUrl ? ` Details: ${portalUrl}` : ''
  const urgentLine = booking.is_emergency ? ' This is now a same-day/emergency appointment — our emergency rate applies.' : ''
  return `${bizName}: Your appointment has been rescheduled to ${newDate} at ${newTime}.${urgentLine}${link}${STOP_TEXT}`
}

export function smsThankYou(bizName: string, clientName: string): string {
  const firstName = clientName?.split(' ')[0] || 'there'
  return `${bizName}: Thanks ${firstName}! We appreciate your business.${STOP_TEXT}`
}

export function smsVerificationCode(bizName: string, code: string): string {
  return `${bizName}: Your code is ${code}. Expires in 10 min.`
}

// ============================================
// TEAM MEMBER SMS
// ============================================

// Item (7)/P11.22 push-half fix: was urgency-blind by construction (no
// emergency/pay-rate field in the signature at all, identical gap shape to
// smsBookingReceived above before P11.14). Both fields optional so every
// existing caller keeps working unchanged.
export function smsJobAssignment(bizName: string, booking: { start_time: string; clients?: { name: string } | null; is_emergency?: boolean | null; pay_rate?: number | null }, portalUrl?: string, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const clientName = booking.clients?.name || 'Client'
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  const prefixEs = booking.is_emergency ? 'URGENTE — ' : ''
  const rateLine = booking.is_emergency && booking.pay_rate ? ` Pay: $${booking.pay_rate}/hr.` : ''
  return `${bizName}: ${prefix}New job ${date} ${time} - ${clientName}.${rateLine}${link}\n---\n${bizName}: ${prefixEs}Nuevo trabajo ${date} ${time} - ${clientName}.${rateLine}${link}${STOP_TEXT}`
}

export function smsDailySummary(bizName: string, memberName: string, count: number, portalUrl?: string): string {
  const firstName = memberName.split(' ')[0]
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  return `${bizName}: Hi ${firstName}, you have ${count} job${count === 1 ? '' : 's'} in the next 3 days.${link}\n---\n${bizName}: Hola ${firstName}, tienes ${count} trabajo${count === 1 ? '' : 's'} en los proximos 3 dias.${link}${STOP_TEXT}`
}

export function smsJobCancelled(bizName: string, booking: { start_time: string; clients?: { name: string } | null }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const clientName = booking.clients?.name || 'Client'
  return `${bizName}: Cancelled - ${date} job (${clientName}).\n---\n${bizName}: Cancelado - trabajo del ${date} (${clientName}).${STOP_TEXT}`
}

// Fresh-ground fix, same shape as smsJobAssignment above: a booking rescheduled
// INTO same-day (PUT /api/client/reschedule/[id] recomputes is_emergency/rate
// when the new date lands today, see becomesEmergency in that route) still
// sent the assigned tech a byte-identical reschedule SMS with no urgency or
// pay-rate signal — same team-facing gap as item (7)/P11.21, just on the
// reschedule path instead of create/direct-assignment. Both fields optional
// so every existing caller (client-reschedule confirmations too) is unchanged.
export function smsJobRescheduled(bizName: string, booking: { start_time: string; clients?: { name: string } | null; is_emergency?: boolean | null; pay_rate?: number | null }, timezone?: string | null): string {
  const newDate = fmtDate(booking.start_time, timezone)
  const newTime = fmtTime(booking.start_time, timezone)
  const clientName = booking.clients?.name || 'Client'
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  const prefixEs = booking.is_emergency ? 'URGENTE — ' : ''
  const rateLine = booking.is_emergency && booking.pay_rate ? ` Pay: $${booking.pay_rate}/hr.` : ''
  return `${bizName}: ${prefix}Rescheduled - ${clientName} moved to ${newDate} ${newTime}.${rateLine}\n---\n${bizName}: ${prefixEs}Reprogramado - ${clientName} movido a ${newDate} ${newTime}.${rateLine}${STOP_TEXT}`
}

export function smsUrgentBroadcast(bizName: string, booking: { start_time: string; team_pay_rate?: number }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const payRate = booking.team_pay_rate || 40
  return `${bizName} URGENT: $${payRate}/hr job available ${date} ${time}. Respond to claim.\n---\n${bizName} URGENTE: Trabajo $${payRate}/hr disponible ${date} ${time}. Responde para reclamar.${STOP_TEXT}`
}

// ============================================
// ADMIN SMS (sent to business owner)
// ============================================

export function smsLateCheckInTeam(bizName: string, booking: { start_time: string; clients?: { name: string } | null }, portalUrl?: string, timezone?: string | null): string {
  const time = fmtTime(booking.start_time, timezone)
  const clientName = booking.clients?.name || 'Client'
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  return `${bizName}: You're late for your ${time} job (${clientName}). Please check in ASAP.${link}\n---\n${bizName}: Estas tarde para tu trabajo de las ${time} (${clientName}). Registrate ahora.${link}${STOP_TEXT}`
}

export function smsLateCheckInAdmin(bizName: string, booking: { start_time: string; clients?: { name: string } | null; team_members?: { name?: string | null } | null; is_emergency?: boolean | null }, timezone?: string | null): string {
  const time = fmtTime(booking.start_time, timezone)
  const memberName = booking.team_members?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  return `${bizName}: ${prefix}Late check-in — ${memberName} hasn't checked in for ${time} job (${clientName}). 10+ min overdue.`
}

export function smsLateCheckOutTeam(bizName: string, booking: { clients?: { name: string } | null }, portalUrl?: string): string {
  const clientName = booking.clients?.name || 'Client'
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  return `${bizName}: Please check out for your ${clientName} job. 15-min alert was sent 30+ min ago.${link}\n---\n${bizName}: Por favor registrate de salida para tu trabajo con ${clientName}. Salir ahora.${link}${STOP_TEXT}`
}

export function smsLateCheckOutAdmin(bizName: string, booking: { clients?: { name: string } | null; team_members?: { name?: string | null } | null; is_emergency?: boolean | null }): string {
  const memberName = booking.team_members?.name || 'Unassigned'
  const clientName = booking.clients?.name || 'Client'
  const prefix = booking.is_emergency ? 'URGENT — ' : ''
  return `${bizName}: ${prefix}Late check-out — ${memberName} hasn't checked out for ${clientName}. 30+ min since 15-min alert.`
}

export function smsRunningLateClient(bizName: string, memberName: string, eta?: number): string {
  const first = memberName.split(' ')[0]
  return eta
    ? `${bizName}: Hi! ${first} is running a few minutes behind and will arrive in approximately ${eta} minutes. We apologize for the delay.${STOP_TEXT}`
    : `${bizName}: Hi! ${first} is running a few minutes behind schedule. They'll be there shortly. We apologize for the delay.${STOP_TEXT}`
}

export function smsRunningLateAdmin(bizName: string, memberName: string, clientName: string, time: string, eta?: number, isEmergency?: boolean): string {
  const prefix = isEmergency ? 'URGENT — ' : ''
  return `${bizName}: ${prefix}${memberName} running late for ${time} job (${clientName})${eta ? ` — ETA ${eta} min` : ''}`
}

export function smsNewClient(bizName: string, name: string): string {
  return `${bizName}: New client — ${name}`
}

export function smsNewBooking(bizName: string, booking: { start_time: string; clients?: { name: string } | null }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  return `${bizName}: New booking — ${booking.clients?.name || 'Unknown'} on ${date}`
}

export function smsNewApplication(bizName: string, name: string): string {
  return `${bizName}: New team application — ${name}`
}

// ============================================
// SPANISH / BILINGUAL SMS (for tenants with Spanish-speaking clients/team)
// ============================================

export function smsBookingReceivedES(bizName: string, booking: { start_time: string }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  return `${bizName}: Recibimos su solicitud de cita para ${date} a las ${time}. Confirmaremos con detalles pronto.${STOP_TEXT_ES}`
}

export function smsBookingConfirmationES(bizName: string, booking: { start_time: string; team_members?: { name?: string | null } | null }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Su profesional'
  return `${bizName}: Su cita esta confirmada para ${date} a las ${time} con ${memberName}.${STOP_TEXT_ES}`
}

export function smsReminderES(bizName: string, booking: { start_time: string; team_members?: { name?: string | null } | null }, timeframe: string, timezone?: string | null): string {
  const time = fmtTime(booking.start_time, timezone)
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Su profesional'
  const tfMap: Record<string, string> = { 'tomorrow': 'manana', 'in 2 hours': 'en 2 horas', 'in 3 days': 'en 3 dias' }
  const tf = tfMap[timeframe] || timeframe
  if (timeframe === 'in 2 hours') {
    return `${bizName}: Recordatorio — ${memberName} llega a las ${time}. Ya casi!${STOP_TEXT_ES}`
  }
  return `${bizName}: Recordatorio — cita ${tf} a las ${time} con ${memberName}.${STOP_TEXT_ES}`
}

export function smsCancellationES(bizName: string, booking: { start_time: string }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  return `${bizName}: Su cita del ${date} ha sido cancelada.${STOP_TEXT_ES}`
}

export function smsRescheduleES(bizName: string, booking: { start_time: string; is_emergency?: boolean | null }, timezone?: string | null): string {
  const newDate = fmtDate(booking.start_time, timezone)
  const newTime = fmtTime(booking.start_time, timezone)
  const urgentLine = booking.is_emergency ? ' Esta cita ahora es de emergencia el mismo día — aplica nuestra tarifa de emergencia.' : ''
  return `${bizName}: Su cita ha sido reprogramada para ${newDate} a las ${newTime}.${urgentLine}${STOP_TEXT_ES}`
}

export function smsJobAssignmentES(bizName: string, booking: { start_time: string; clients?: { name: string } | null }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const clientName = booking.clients?.name || 'Cliente'
  return `${bizName}: Nuevo trabajo ${date} ${time} - ${clientName}.${STOP_TEXT_ES}`
}

export function smsDailySummaryES(bizName: string, memberName: string, count: number): string {
  const firstName = memberName.split(' ')[0]
  return `${bizName}: Hola ${firstName}, tienes ${count} trabajo${count === 1 ? '' : 's'} en los proximos 3 dias.${STOP_TEXT_ES}`
}

export function smsUrgentBroadcastES(bizName: string, booking: { start_time: string; team_pay_rate?: number }, timezone?: string | null): string {
  const date = fmtDate(booking.start_time, timezone)
  const time = fmtTime(booking.start_time, timezone)
  const payRate = booking.team_pay_rate || 40
  return `${bizName} URGENTE: Trabajo $${payRate}/hr disponible ${date} ${time}. Responde para reclamar.${STOP_TEXT_ES}`
}

export function smsPaymentDueES(bizName: string, amount: string): string {
  return `${bizName}: Pago de $${amount} pendiente. Pague al finalizar el servicio.${STOP_TEXT_ES}`
}

// ============================================
// BILINGUAL HELPER — returns EN + ES in one message
// ============================================

export function smsBilingual(en: string, es: string): string {
  return `${en}\n---\n${es}`
}
