// ============================================
// SMS TEMPLATES — Multi-tenant, uses business name
// All messages end with opt-out info per TCPA
// ============================================

const STOP_TEXT = '\nReply STOP to opt out.'
const STOP_TEXT_ES = '\nResponde STOP para cancelar.'

// ============================================
// CLIENT SMS
// ============================================

export function smsBookingConfirmation(bizName: string, booking: { start_time: string; team_members?: { name: string } | null }, portalUrl?: string): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Your pro'
  const link = portalUrl ? ` Details: ${portalUrl}` : ''
  return `${bizName}: Your appointment is confirmed for ${date} at ${time} with ${memberName}.${link}${STOP_TEXT}`
}

export function smsReminder(bizName: string, booking: { start_time: string; team_members?: { name: string } | null }, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Your pro'
  if (timeframe === 'in 2 hours') {
    return `${bizName}: Reminder — ${memberName} arrives at ${time}. Almost time!${STOP_TEXT}`
  }
  return `${bizName}: Reminder — appointment ${timeframe} at ${time} with ${memberName}.${STOP_TEXT}`
}

export function smsCancellation(bizName: string, booking: { start_time: string }, portalUrl?: string): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const link = portalUrl ? ` Rebook: ${portalUrl}` : ''
  return `${bizName}: Your ${date} appointment has been cancelled.${link}${STOP_TEXT}`
}

export function smsReschedule(bizName: string, booking: { start_time: string }, portalUrl?: string): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const link = portalUrl ? ` Details: ${portalUrl}` : ''
  return `${bizName}: Your appointment has been rescheduled to ${newDate} at ${newTime}.${link}${STOP_TEXT}`
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

export function smsJobAssignment(bizName: string, booking: { start_time: string; clients?: { name: string } | null }, portalUrl?: string): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name || 'Client'
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  return `${bizName}: New job ${date} ${time} - ${clientName}.${link}${STOP_TEXT}`
}

export function smsDailySummary(bizName: string, memberName: string, count: number, portalUrl?: string): string {
  const firstName = memberName.split(' ')[0]
  const link = portalUrl ? ` Portal: ${portalUrl}` : ''
  return `${bizName}: Hi ${firstName}, you have ${count} job${count === 1 ? '' : 's'} in the next 3 days.${link}${STOP_TEXT}`
}

export function smsJobCancelled(bizName: string, booking: { start_time: string; clients?: { name: string } | null }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const clientName = booking.clients?.name || 'Client'
  return `${bizName}: Cancelled - ${date} job (${clientName}).${STOP_TEXT}`
}

export function smsJobRescheduled(bizName: string, booking: { start_time: string; clients?: { name: string } | null }): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name || 'Client'
  return `${bizName}: Rescheduled - ${clientName} moved to ${newDate} ${newTime}.${STOP_TEXT}`
}

export function smsUrgentBroadcast(bizName: string, booking: { start_time: string; team_pay_rate?: number }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const payRate = booking.team_pay_rate || 40
  return `${bizName} URGENT: $${payRate}/hr job available ${date} ${time}. Respond to claim.${STOP_TEXT}`
}

// ============================================
// ADMIN SMS (sent to business owner)
// ============================================

export function smsNewClient(bizName: string, name: string): string {
  return `${bizName}: New client — ${name}`
}

export function smsNewBooking(bizName: string, booking: { start_time: string; clients?: { name: string } | null }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${bizName}: New booking — ${booking.clients?.name || 'Unknown'} on ${date}`
}

export function smsNewApplication(bizName: string, name: string): string {
  return `${bizName}: New team application — ${name}`
}

// ============================================
// SPANISH / BILINGUAL SMS (for tenants with Spanish-speaking clients/team)
// ============================================

export function smsBookingConfirmationES(bizName: string, booking: { start_time: string; team_members?: { name: string } | null }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Su profesional'
  return `${bizName}: Su cita esta confirmada para ${date} a las ${time} con ${memberName}.${STOP_TEXT_ES}`
}

export function smsReminderES(bizName: string, booking: { start_time: string; team_members?: { name: string } | null }, timeframe: string): string {
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const memberName = booking.team_members?.name?.split(' ')[0] || 'Su profesional'
  const tfMap: Record<string, string> = { 'tomorrow': 'manana', 'in 2 hours': 'en 2 horas', 'in 3 days': 'en 3 dias' }
  const tf = tfMap[timeframe] || timeframe
  if (timeframe === 'in 2 hours') {
    return `${bizName}: Recordatorio — ${memberName} llega a las ${time}. Ya casi!${STOP_TEXT_ES}`
  }
  return `${bizName}: Recordatorio — cita ${tf} a las ${time} con ${memberName}.${STOP_TEXT_ES}`
}

export function smsCancellationES(bizName: string, booking: { start_time: string }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${bizName}: Su cita del ${date} ha sido cancelada.${STOP_TEXT_ES}`
}

export function smsRescheduleES(bizName: string, booking: { start_time: string }): string {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${bizName}: Su cita ha sido reprogramada para ${newDate} a las ${newTime}.${STOP_TEXT_ES}`
}

export function smsJobAssignmentES(bizName: string, booking: { start_time: string; clients?: { name: string } | null }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name || 'Cliente'
  return `${bizName}: Nuevo trabajo ${date} ${time} - ${clientName}.${STOP_TEXT_ES}`
}

export function smsDailySummaryES(bizName: string, memberName: string, count: number): string {
  const firstName = memberName.split(' ')[0]
  return `${bizName}: Hola ${firstName}, tienes ${count} trabajo${count === 1 ? '' : 's'} en los proximos 3 dias.${STOP_TEXT_ES}`
}

export function smsUrgentBroadcastES(bizName: string, booking: { start_time: string; team_pay_rate?: number }): string {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
