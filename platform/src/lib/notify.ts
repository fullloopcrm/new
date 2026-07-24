import { supabaseAdmin } from './supabase'
import { sendEmail, tenantSender } from './email'
import { sendSMS } from './sms'
import { sendTelegram, notifyOwnerOnTelegram } from './telegram'
import { decryptSecret } from './secret-crypto'
import { isCommEnabled, getCommPolicy, buildTemplateData } from './comms-prefs'
import { NOTIFY_COMM_MAP } from './comms-registry'
import {
  bookingReminderEmail,
  bookingConfirmationEmail,
  bookingRescheduledEmail,
  portalPinResetEmail,
  bookingReceivedEmail,
  clientCancellationEmail,
  clientPaymentDueEmail,
  followUpEmail,
  dailySummaryEmail,
  dailyOpsRecapEmail,
  notificationDigestEmail,
  reviewRequestEmail,
  paymentReceiptEmail,
  genericNotificationEmail,
  teamDailyJobsEmail,
} from './email-templates'

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'portal_pin_reset'
  | 'booking_completed'
  | 'check_in'
  | 'check_out'
  | 'payment_received'
  | 'review_request'
  | 'review_received'
  | 'new_client'
  | 'new_booking'
  | 'schedule_paused'
  | 'schedule_resumed'
  | 'campaign_sent'
  | 'referral_converted'
  | 'team_member_added'
  | 'daily_summary'
  | 'lifecycle_change'
  | 'follow_up'
  | 'expense_added'
  | 'payroll_paid'
  | 'sms_received'
  | 'sms_opt_out'
  | 'sms_opt_in'
  | 'team_confirmed'
  | 'team_confirm_request'
  | 'team_no_confirm_alert'
  | 'client_confirm_request'
  | 'pending_reminder'
  | 'unpaid_team'
  | 'payment_due'
  | 'daily_ops_recap'
  | 'daily_digest'
  | 'booking_received'
  | 'new_lead'
  | 'waitlist'
  | 'selena_error'
  | 'escalation'
  | 'video_uploaded'
  | '15min_warning'
  | 'late_check_in'
  | 'duplicate_recurring_schedule'
  | 'comms_fail'
  | 'late_check_out'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_declined'
  | 'quote_expired'
  | 'security'
  | 'error'
  | 'referral_lead'
  | 'cleaner_application'

// Operational event types worth pushing to the tenant's Telegram, ported from
// lib/nycmaid/notify.ts (2026-07-22) — that nycmaid-specific notify() had
// working Telegram delivery, but the live client-booking route and most other
// send paths call THIS global notify(), which never sent Telegram at all.
// Per the platform's own global rule (one shared codebase, tenant differences
// come from data), the fix belongs here so every tenant with a bot configured
// benefits, not a nycmaid-only patch. Filtered to values that exist in
// NotificationType above.
const TELEGRAM_NOTIFY_TYPES = new Set<NotificationType>([
  'new_lead',
  'new_client',
  'new_booking',
  'referral_lead',
  'payment_received',
  'review_received',
  'escalation',
  'comms_fail',
  'selena_error',
  'error',
])

// Per-tenant Telegram: post to the tenant's own bot when configured. A
// resolved tenant with no Telegram of its own stays dashboard-only — falling
// back to the platform owner bot here would leak every other tenant's
// new_booking/new_client/payment_received/etc. events into nycmaid/Jeff's own
// Telegram feed (same cross-tenant leak already fixed in
// lib/nycmaid/notify.ts). tenantId is always resolved by every call site in
// this file, so this fallback exists only for symmetry with the nycmaid
// module's cron/no-request-scope case.
export async function sendTenantTelegram(
  tenantId: string | null,
  tenant: { telegram_bot_token?: string | null; telegram_chat_id?: string | null },
  text: string,
): Promise<void> {
  if (tenant.telegram_bot_token && tenant.telegram_chat_id) {
    const botToken = decryptSecret(tenant.telegram_bot_token)
    await sendTelegram(tenant.telegram_chat_id, text, botToken)
    return
  }
  if (!tenantId) await notifyOwnerOnTelegram(text)
}

export async function notify({
  tenantId,
  type,
  title,
  message,
  channel = 'email',
  recipientType = 'admin',
  recipientId,
  bookingId,
  booking_id,
  metadata,
}: {
  tenantId?: string
  type: NotificationType
  title: string
  message: string
  channel?: 'email' | 'sms' | 'push'
  recipientType?: 'client' | 'team_member' | 'admin'
  recipientId?: string
  bookingId?: string
  booking_id?: string  // nycmaid-style alias
  metadata?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  // Accept nycmaid-style `booking_id` as an alias for bookingId
  bookingId = bookingId || booking_id
  // Resolve tenant from request headers if caller didn't pass one (nycmaid pattern).
  if (!tenantId) {
    try {
      const { headers } = await import('next/headers')
      const h = await headers()
      tenantId = h.get('x-tenant-id') || undefined
    } catch {
      // headers() only available inside request scope — ignore if outside
    }
  }
  if (!tenantId) {
    // Last-resort: skip DB write but don't throw — log for ops visibility.
    console.warn(`[notify] no tenantId resolvable for type=${type}, title=${title}`)
    return { success: false, error: 'no tenant' }
  }
  // Create notification record — capture ID for accurate status updates
  const { data: notifRecord } = await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type,
    title,
    message,
    channel,
    recipient_type: recipientType,
    recipient_id: recipientId || null,
    booking_id: bookingId || null,
    status: 'pending',
    metadata: metadata || null,
    retry_count: 0,
  }).select('id').single()

  const notifId = notifRecord?.id

  // Get tenant for API keys and branding
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('resend_api_key, telnyx_api_key, telnyx_phone, name, slug, email_from, primary_color, logo_url, address, email, phone, telegram_bot_token, telegram_chat_id, commission_rate')
    .eq('id', tenantId)
    .single()

  if (!tenant) return { success: false, error: 'Tenant not found' }

  // Telegram is orthogonal to the email/sms `channel` param below — it goes
  // to the tenant's own ops chat regardless of recipientType, same as
  // lib/nycmaid/notify.ts. Fire-and-forget: a Telegram failure must never
  // block the DB notification record or the primary email/SMS send.
  if (TELEGRAM_NOTIFY_TYPES.has(type)) {
    sendTenantTelegram(tenantId, tenant, `${title}\n\n${message}`).catch((err) => {
      console.error(`Notification telegram send error (${type}):`, err)
    })
  }

  // Get recipient contact info
  let email: string | null = null
  let phone: string | null = null

  if (recipientId && recipientType === 'client') {
    const { data } = await supabaseAdmin.from('clients').select('email, phone').eq('id', recipientId).single()
    email = data?.email || null
    phone = data?.phone || null
  } else if (recipientId && recipientType === 'team_member') {
    const { data } = await supabaseAdmin.from('team_members').select('email, phone').eq('id', recipientId).single()
    email = data?.email || null
    phone = data?.phone || null
  } else if (recipientType === 'admin') {
    const { data } = await supabaseAdmin.from('tenant_members').select('email, phone').eq('tenant_id', tenantId).eq('role', 'owner').maybeSingle()
    // Fall back to the tenant's own contact info when no owner tenant_member row
    // exists — matches admin-contacts.ts's getAdminContacts() fallback. Without
    // this, tenants with no tenant_members rows silently skip every admin
    // notification (found via nycmaid: zero tenant_members rows meant every
    // payment_received/new_client/new_booking alert was marked 'skipped').
    email = data?.email || (tenant as { email?: string | null }).email || null
    phone = data?.phone || (tenant as { phone?: string | null }).phone || null
  }

  // Build branded HTML for email channel — tenant branding + this tenant's
  // comm policy (support phone, review link, cancellation policy text, etc.)
  // in one shot, so every template call site stays consistent.
  const policy = tenantId ? await getCommPolicy(tenantId) : {}
  const templateData = {
    ...buildTemplateData(
      { name: tenant.name, primary_color: tenant.primary_color, logo_url: tenant.logo_url, commission_rate: (tenant as { commission_rate?: number | null }).commission_rate },
      policy,
    ),
    // CAN-SPAM: physical postal address in the shared email footer when on file.
    businessAddress: (tenant as { address?: string | null }).address || undefined,
  }

  let htmlBody: string | undefined
  const clientName = (metadata?.clientName as string) || 'Client'
  const serviceName = (metadata?.serviceName as string) || ''

  switch (type) {
    case 'booking_reminder':
      htmlBody = bookingReminderEmail({
        ...templateData,
        clientName,
        serviceName: serviceName || title,
        dateTime: message,
        timeUntil: (metadata?.timeUntil as string) || 'soon',
        address: metadata?.address as string | undefined,
      })
      break
    case 'follow_up':
      htmlBody = followUpEmail({
        ...templateData,
        clientName,
        serviceName,
        discountCode: (metadata?.discountCode as string) || 'THANKYOU',
      })
      break
    case 'daily_summary':
      // Same notify() type covers two different audiences: the admin metrics
      // recap and a team member's own upcoming-jobs list. Metadata shape tells
      // them apart — team-member calls pass `jobs`, admin calls don't.
      htmlBody = (recipientType === 'team_member' && metadata?.jobs)
        ? teamDailyJobsEmail({
            ...templateData,
            teamMemberName: (metadata?.teamMemberName as string) || clientName,
            jobs: metadata?.jobs as never[],
            portalUrl: metadata?.portalUrl as string | undefined,
          })
        : dailySummaryEmail({
            ...templateData,
            todaysJobs: (metadata?.todaysJobs as number) || 0,
            yesterdayRevenue: (metadata?.yesterdayRevenue as string) || '$0',
            upcomingSchedules: (metadata?.upcomingSchedules as number) || 0,
          })
      break
    case 'review_request':
      htmlBody = reviewRequestEmail({
        ...templateData,
        clientName,
        feedbackUrl: (metadata?.feedbackUrl as string) || '',
      })
      break
    case 'payment_received':
      htmlBody = paymentReceiptEmail({
        ...templateData,
        clientName,
        serviceName,
        amount: (metadata?.amount as string) || '$0',
        date: (metadata?.date as string) || new Date().toLocaleDateString(),
        paymentMethod: (metadata?.paymentMethod as string) || 'Card',
      })
      break
    case 'booking_confirmed':
      htmlBody = bookingConfirmationEmail({
        ...templateData,
        clientName,
        serviceName: serviceName || 'Appointment',
        dateTime: message,
        teamMemberName: (metadata?.teamMemberName as string) || 'Your pro',
        address: metadata?.address as string | undefined,
        price: metadata?.price as string | undefined,
        portalUrl: metadata?.portalUrl as string | undefined,
      })
      break
    case 'booking_rescheduled':
      htmlBody = bookingRescheduledEmail({
        ...templateData,
        clientName,
        oldDateTime: (metadata?.oldDateTime as string) || '',
        newDateTime: (metadata?.newDateTime as string) || message,
      })
      break
    case 'portal_pin_reset':
      htmlBody = portalPinResetEmail({
        ...templateData,
        recipientName: (metadata?.recipientName as string) || clientName,
        pin: (metadata?.pin as string) || '',
        portalUrl: metadata?.portalUrl as string | undefined,
        wasReset: metadata?.wasReset as boolean | undefined,
      })
      break
    case 'booking_received':
      htmlBody = bookingReceivedEmail({
        ...templateData,
        clientName,
        serviceName: serviceName || 'Appointment',
        dateTime: message,
      })
      break
    case 'booking_cancelled':
      htmlBody = clientCancellationEmail({
        ...templateData,
        clientName,
        serviceName: serviceName || 'Appointment',
        dateTime: message,
      })
      break
    case 'payment_due':
      htmlBody = clientPaymentDueEmail({
        ...templateData,
        clientName,
        teamMemberName: metadata?.teamMemberName as string | undefined,
        amount: (metadata?.amount as string) || '0',
        paymentUrl: metadata?.paymentUrl as string | undefined,
      })
      break
    case 'daily_ops_recap':
      htmlBody = dailyOpsRecapEmail({
        ...templateData,
        todayDate: (metadata?.todayDate as string) || '',
        tomorrowDate: (metadata?.tomorrowDate as string) || '',
        todayJobs: (metadata?.todayJobs as never[]) || [],
        tomorrowJobs: (metadata?.tomorrowJobs as never[]) || [],
        todayRevenue: (metadata?.todayRevenue as string) || '$0',
        todayJobCount: (metadata?.todayJobCount as number) || 0,
        tomorrowJobCount: (metadata?.tomorrowJobCount as number) || 0,
        todayPaid: (metadata?.todayPaid as number) || 0,
        todayUnpaid: (metadata?.todayUnpaid as number) || 0,
      })
      break
    case 'daily_digest':
      htmlBody = notificationDigestEmail({
        ...templateData,
        date: (metadata?.date as string) || '',
        emailCount: (metadata?.emailCount as number) || 0,
        smsCount: (metadata?.smsCount as number) || 0,
        entries: (metadata?.entries as never[]) || [],
      })
      break
  }

  // Helper to update this specific notification by ID (no race condition)
  const updateNotif = async (status: string, extra?: Record<string, unknown>) => {
    if (!notifId) return
    await supabaseAdmin
      .from('notifications')
      .update({ status, ...(extra || {}) })
      .eq('id', notifId)
  }

  // Send via channel — with fallback: if email fails, try SMS
  let sent = false
  let lastError = ''

  // Check if integrations are configured
  const hasEmail = !!(tenant.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))
  const hasSMS = !!(tenant.telnyx_api_key && tenant.telnyx_phone)

  // ── Communications gate ────────────────────────────────────────────────
  // The in-app notification row is already persisted above; here we honor the
  // tenant's per-comm channel preference for the OUTBOUND email/SMS only.
  // Fail-open: only comms mapped in NOTIFY_COMM_MAP (whose default matches
  // current behavior) are gated — everything else sends exactly as before.
  if ((channel === 'email' || channel === 'sms') && tenantId) {
    const commKey = NOTIFY_COMM_MAP[`${type}:${recipientType}`] || NOTIFY_COMM_MAP[type]
    if (commKey && !(await isCommEnabled(tenantId, commKey, channel))) {
      await updateNotif('skipped', {
        metadata: { ...(metadata || {}), _gated: commKey, _channel: channel },
      })
      return { success: true }
    }
  }

  // Attempt primary channel
  try {
    if (channel === 'email' && email && hasEmail) {
      await sendEmail({
        to: email,
        subject: title,
        html: htmlBody || genericNotificationEmail({ ...templateData, title, message }),
        from: tenantSender(tenant),
        resendApiKey: tenant.resend_api_key,
      })
      sent = true
    } else if (channel === 'sms' && phone && hasSMS) {
      await sendSMS({
        to: phone,
        body: message,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
      sent = true
    } else if (channel === 'email' && !email) {
      lastError = 'No email address for recipient'
    } else if (channel === 'email' && !hasEmail) {
      lastError = 'Email not configured — no Resend API key'
    } else if (channel === 'sms' && !phone) {
      lastError = 'No phone number for recipient'
    } else if (channel === 'sms' && !hasSMS) {
      lastError = 'SMS not configured — no Telnyx API key'
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e)
    console.error(`Notification primary send error (${type}):`, lastError)
  }

  // Fallback: email failed → try SMS, SMS failed → try email
  if (!sent && recipientId) {
    try {
      if (channel === 'email' && phone && hasSMS) {
        // Email failed, fall back to SMS
        await sendSMS({
          to: phone,
          body: `${title}: ${message}`.slice(0, 320),
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        sent = true
        await updateNotif('sent', {
          metadata: { ...(metadata || {}), _fallback: 'sms', _primaryError: lastError },
        })
      } else if (channel === 'sms' && email && hasEmail) {
        // SMS failed, fall back to email
        await sendEmail({
          to: email,
          subject: title,
          html: htmlBody || genericNotificationEmail({ ...templateData, title, message }),
          from: tenantSender(tenant),
          resendApiKey: tenant.resend_api_key,
        })
        sent = true
        await updateNotif('sent', {
          metadata: { ...(metadata || {}), _fallback: 'email', _primaryError: lastError },
        })
      }
    } catch (fallbackErr) {
      console.error(`Notification fallback also failed (${type}):`, fallbackErr)
    }
  }

  if (sent) {
    await updateNotif('sent')
    return { success: true }
  }

  // A missing recipient address or an unconfigured channel is NOT a delivery
  // failure — nothing was ever sendable. Classify it 'skipped' (like the gated
  // case) so it doesn't count against the delivery-rate health check or trigger
  // pointless retries. Genuine send errors (bounce, unverified domain, provider
  // error) stay 'failed'.
  const UNROUTABLE = new Set([
    'No email address for recipient',
    'No phone number for recipient',
    'Email not configured — no Resend API key',
    'SMS not configured — no Telnyx API key',
  ])
  const finalStatus = lastError && UNROUTABLE.has(lastError) ? 'skipped' : 'failed'
  await updateNotif(finalStatus, {
    metadata: { ...(metadata || {}), _error: lastError, _failedAt: new Date().toISOString() },
  })

  return { success: false, error: lastError }
}
