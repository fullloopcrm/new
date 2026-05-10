import { supabaseAdmin } from '@/lib/supabase'
import { sendPushToCleaner } from '@/lib/nycmaid/push'
import { sendSMS } from '@/lib/nycmaid/sms'
import { sendEmail } from '@/lib/nycmaid/email'

export interface NotifyCleanerOptions {
  cleanerId: string
  type: 'job_assignment' | 'job_reminder' | 'daily_summary' | 'job_cancelled' | 'job_rescheduled' | 'broadcast'
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
  cleanerName: string
  push: boolean
  email: boolean
  sms: boolean
  inApp: true
  quietHours: boolean
  // Channels the caller suppressed (e.g. email sent through a separate
  // template). Renders as '—' instead of '✗' so the report only flags
  // actual delivery failures.
  skipped?: { email?: boolean; sms?: boolean; push?: boolean }
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

export async function notifyCleaner(opts: NotifyCleanerOptions): Promise<DeliveryReport> {
  const report: DeliveryReport = {
    cleanerName: '',
    push: false,
    email: false,
    sms: false,
    inApp: true,
    quietHours: false,
    skipped: {
      email: !!opts.skipEmail,
      sms: !!opts.skipSms,
      push: !!opts.skipPush,
    },
  }

  // 1. Always insert in-app notification
  try {
    await supabaseAdmin.from('cleaner_notifications').insert({
      cleaner_id: opts.cleanerId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      booking_id: opts.bookingId || null
    })
  } catch {
    // Don't fail the whole flow if table doesn't exist yet
  }

  // 2. Fetch cleaner info + preferences
  const { data: cleaner } = await supabaseAdmin
    .from('cleaners')
    .select('name, email, phone, sms_consent, notification_preferences')
    .eq('id', opts.cleanerId)
    .single()

  if (!cleaner) return report

  report.cleanerName = cleaner.name || 'Unknown'

  const prefs = cleaner.notification_preferences || {}
  const typePrefs = prefs[opts.type] || { push: true, email: true, sms: true }
  const quietStart = prefs.quiet_start || '22:00'
  const quietEnd = prefs.quiet_end || '07:00'
  const quiet = isQuietHours(quietStart, quietEnd)
  report.quietHours = quiet

  // 3. Push notification (suppressed during quiet hours)
  if (!opts.skipPush && typePrefs.push && !quiet) {
    try {
      await sendPushToCleaner(opts.cleanerId, opts.title, opts.message, '/team/dashboard')
      report.push = true
    } catch {
      // Push failed silently
    }
  }

  // 4. SMS (still delivered during quiet hours)
  if (!opts.skipSms && typePrefs.sms && cleaner.phone && cleaner.sms_consent !== false && opts.smsMessage) {
    try {
      const result = await sendSMS(cleaner.phone, opts.smsMessage, {
        recipientType: 'cleaner',
        recipientId: opts.cleanerId,
        smsType: opts.type,
        bookingId: opts.bookingId
      })
      report.sms = result.success
    } catch {
      // SMS failed silently
    }
  }

  // 5. Email (still delivered during quiet hours)
  if (!opts.skipEmail && typePrefs.email && cleaner.email && opts.emailSubject && opts.emailHtml) {
    try {
      const result = await sendEmail(cleaner.email, opts.emailSubject, opts.emailHtml)
      report.email = !!result?.success
    } catch {
      // Email failed silently
    }
  }

  return report
}

/** Format a DeliveryReport into a human-readable status string for admin notifications.
 *  Channels the caller suppressed (skipEmail/skipSms/skipPush) render as '\u2014'
 *  so '\u2717' only signals an actual delivery failure. */
export function formatDeliveryReport(report: DeliveryReport, skippedOverride?: { email?: boolean; sms?: boolean; push?: boolean }): string {
  const skipped = skippedOverride || report.skipped || {}
  const mark = (ok: boolean | undefined, wasSkipped: boolean | undefined) =>
    wasSkipped ? '\u2014' : (ok ? '\u2713' : '\u2717')
  const parts: string[] = []
  parts.push(`push ${mark(report.push, skipped.push)}${report.quietHours && !report.push && !skipped.push ? ' (quiet hrs)' : ''}`)
  parts.push(`email ${mark(report.email, skipped.email)}`)
  parts.push(`sms ${mark(report.sms, skipped.sms)}`)
  return `Cleaner notified: ${parts.join(' ')}`
}
