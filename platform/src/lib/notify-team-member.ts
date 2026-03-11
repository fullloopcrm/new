import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

export interface NotifyTeamMemberOptions {
  tenantId: string
  teamMemberId: string
  type:
    | 'job_assignment'
    | 'job_reminder'
    | 'daily_summary'
    | 'job_cancelled'
    | 'job_rescheduled'
    | 'broadcast'
  title: string
  message: string
  bookingId?: string
  smsMessage?: string
  emailSubject?: string
  emailHtml?: string
  skipEmail?: boolean
  skipSms?: boolean
  skipPush?: boolean
}

export interface DeliveryReport {
  memberName: string
  push: boolean
  email: boolean
  sms: boolean
  inApp: true
  quietHours: boolean
}

interface PerTypePrefs {
  push: boolean
  email: boolean
  sms: boolean
}

interface NotificationPreferences {
  job_assignment?: PerTypePrefs
  job_reminder?: PerTypePrefs
  daily_summary?: PerTypePrefs
  job_cancelled?: PerTypePrefs
  job_rescheduled?: PerTypePrefs
  broadcast?: PerTypePrefs
  quiet_start?: string
  quiet_end?: string
}

const DEFAULT_PREFS: PerTypePrefs = { push: true, email: true, sms: true }

/**
 * Check whether the current time falls within quiet hours.
 * Handles midnight-spanning ranges (e.g. 22:00 – 07:00).
 */
function isQuietHours(quietStart: string, quietEnd: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = quietStart.split(':').map(Number)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00 – 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  // Midnight-spanning range (e.g. 22:00 – 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

/**
 * Notify a team member across all configured channels, respecting
 * per-type preferences and quiet hours.
 */
export async function notifyTeamMember(
  opts: NotifyTeamMemberOptions,
): Promise<DeliveryReport> {
  const {
    tenantId,
    teamMemberId,
    type,
    title,
    message,
    bookingId,
    smsMessage,
    emailSubject,
    emailHtml,
    skipEmail,
    skipSms,
    skipPush,
  } = opts

  // 1. Always create in-app notification
  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type,
    title,
    message,
    booking_id: bookingId || null,
    channel: 'in_app',
    status: 'sent',
    recipient_type: 'team_member',
    recipient_id: teamMemberId,
  })

  // 2. Fetch team member details
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('name, email, phone, sms_consent, notification_preferences')
    .eq('id', teamMemberId)
    .single()

  if (!member) {
    console.error(`notifyTeamMember: team member ${teamMemberId} not found`)
    return {
      memberName: 'Unknown',
      push: false,
      email: false,
      sms: false,
      inApp: true,
      quietHours: false,
    }
  }

  // 3. Read per-type preferences (default all true)
  const prefs = (member.notification_preferences || {}) as NotificationPreferences
  const typePrefs: PerTypePrefs = prefs[type] ?? DEFAULT_PREFS

  const wantsPush = typePrefs.push !== false && !skipPush
  const wantsEmail = typePrefs.email !== false && !skipEmail
  const wantsSms = typePrefs.sms !== false && !skipSms

  // 4. Check quiet hours
  const quietStart = prefs.quiet_start || '22:00'
  const quietEnd = prefs.quiet_end || '07:00'
  const quiet = isQuietHours(quietStart, quietEnd)

  let sentPush = false
  let sentEmail = false
  let sentSms = false

  // 5. Push — suppressed during quiet hours
  if (wantsPush && !quiet) {
    try {
      await notify({
        tenantId,
        type: type as Parameters<typeof notify>[0]['type'],
        title,
        message,
        channel: 'push',
        recipientType: 'team_member',
        recipientId: teamMemberId,
        bookingId,
      })
      sentPush = true
    } catch (e) {
      console.error('notifyTeamMember push error:', e)
    }
  }

  // 6. SMS — needs phone, consent, and an smsMessage
  if (wantsSms && member.phone && member.sms_consent !== false && smsMessage) {
    try {
      await notify({
        tenantId,
        type: type as Parameters<typeof notify>[0]['type'],
        title,
        message: smsMessage,
        channel: 'sms',
        recipientType: 'team_member',
        recipientId: teamMemberId,
        bookingId,
      })
      sentSms = true
    } catch (e) {
      console.error('notifyTeamMember sms error:', e)
    }
  }

  // 7. Email — needs email address and subject + html
  if (wantsEmail && member.email && emailSubject && emailHtml) {
    try {
      await notify({
        tenantId,
        type: type as Parameters<typeof notify>[0]['type'],
        title: emailSubject,
        message: emailHtml,
        channel: 'email',
        recipientType: 'team_member',
        recipientId: teamMemberId,
        bookingId,
      })
      sentEmail = true
    } catch (e) {
      console.error('notifyTeamMember email error:', e)
    }
  }

  // 8. Return delivery report
  return {
    memberName: member.name || 'Unknown',
    push: sentPush,
    email: sentEmail,
    sms: sentSms,
    inApp: true,
    quietHours: quiet,
  }
}

/**
 * Format a delivery report into a human-readable string.
 */
export function formatDeliveryReport(report: DeliveryReport): string {
  const check = (ok: boolean) => (ok ? '\u2713' : '\u2717')
  const parts = [
    `push ${check(report.push)}`,
    `email ${check(report.email)}`,
    `sms ${check(report.sms)}`,
  ]
  const suffix = report.quietHours ? ' (quiet hours)' : ''
  return `${report.memberName} notified: ${parts.join(' ')}${suffix}`
}
