import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

export interface NotifyTeamMemberOptions {
  tenantId: string
  teamMemberId: string
  type: 'job_assignment' | 'job_reminder' | 'daily_summary' | 'job_cancelled' | 'job_rescheduled' | 'broadcast'
  title: string
  message: string
  bookingId?: string
  smsMessage?: string
  emailSubject?: string
  emailHtml?: string
  skipEmail?: boolean
  skipSms?: boolean
}

export interface DeliveryReport {
  teamMemberName: string
  email: boolean
  sms: boolean
  inApp: true
  quietHours: boolean
}

function isQuietHours(quietStart: string, quietEnd: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = quietStart.split(':').map(Number)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  // Quiet hours that span midnight (e.g. 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export async function notifyTeamMember(opts: NotifyTeamMemberOptions): Promise<DeliveryReport> {
  const report: DeliveryReport = {
    teamMemberName: '',
    email: false,
    sms: false,
    inApp: true,
    quietHours: false
  }

  // 1. Always insert in-app notification
  try {
    await supabaseAdmin.from('team_notifications').insert({
      tenant_id: opts.tenantId,
      team_member_id: opts.teamMemberId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      booking_id: opts.bookingId || null
    })
  } catch {
    // Don't fail the whole flow if table doesn't exist yet
  }

  // 2. Fetch team member info + preferences
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('name, email, phone, sms_consent, notification_preferences')
    .eq('id', opts.teamMemberId)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (!member) return report

  report.teamMemberName = member.name || 'Unknown'

  const prefs = member.notification_preferences || {}
  const typePrefs = prefs[opts.type] || { email: true, sms: true }
  const quietStart = prefs.quiet_start || '22:00'
  const quietEnd = prefs.quiet_end || '07:00'
  const quiet = isQuietHours(quietStart, quietEnd)
  report.quietHours = quiet

  // 3. Get tenant for API keys
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone, resend_api_key')
    .eq('id', opts.tenantId)
    .single()

  if (!tenant) return report

  // 4. SMS (still delivered during quiet hours for urgent notifications)
  if (!opts.skipSms && typePrefs.sms && member.phone && member.sms_consent !== false && opts.smsMessage) {
    if (tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        await sendSMS({
          to: member.phone,
          body: opts.smsMessage,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        report.sms = true
      } catch {
        // SMS failed silently
      }
    }
  }

  // 5. Email (still delivered during quiet hours)
  if (!opts.skipEmail && typePrefs.email && member.email && opts.emailSubject && opts.emailHtml) {
    try {
      await sendEmail({
        to: member.email,
        subject: opts.emailSubject,
        html: opts.emailHtml,
        resendApiKey: tenant.resend_api_key,
      })
      report.email = true
    } catch {
      // Email failed silently
    }
  }

  return report
}

/** Format a DeliveryReport into a human-readable status string */
export function formatDeliveryReport(report: DeliveryReport): string {
  const parts: string[] = []
  parts.push(`email ${report.email ? '\u2713' : '\u2717'}`)
  parts.push(`sms ${report.sms ? '\u2713' : '\u2717'}`)
  if (report.quietHours) parts.push('(quiet hrs)')
  return `Team member notified: ${parts.join(' ')}`
}
