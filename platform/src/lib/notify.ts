import { supabaseAdmin } from './supabase'
import { sendEmail } from './email'
import { sendSMS } from './sms'
import {
  bookingReminderEmail,
  followUpEmail,
  dailySummaryEmail,
  reviewRequestEmail,
  paymentReceiptEmail,
} from './email-templates'

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_cancelled'
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

export async function notify({
  tenantId,
  type,
  title,
  message,
  channel = 'email',
  recipientType = 'admin',
  recipientId,
  bookingId,
  metadata,
}: {
  tenantId: string
  type: NotificationType
  title: string
  message: string
  channel?: 'email' | 'sms' | 'push'
  recipientType?: 'client' | 'team_member' | 'admin'
  recipientId?: string
  bookingId?: string
  metadata?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
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
    .select('resend_api_key, telnyx_api_key, telnyx_phone, name, primary_color, logo_url')
    .eq('id', tenantId)
    .single()

  if (!tenant) return { success: false, error: 'Tenant not found' }

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
    const { data } = await supabaseAdmin.from('tenant_members').select('email').eq('tenant_id', tenantId).eq('role', 'owner').single()
    email = data?.email || null
  }

  // Build branded HTML for email channel
  const templateData = {
    tenantName: tenant.name || 'Your Business',
    primaryColor: tenant.primary_color || '#111827',
    logoUrl: tenant.logo_url || undefined,
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
      htmlBody = dailySummaryEmail({
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

  // Attempt primary channel
  try {
    if (channel === 'email' && email) {
      await sendEmail({
        to: email,
        subject: title,
        html: htmlBody || `<p>${message.replace(/\n/g, '<br>')}</p>`,
        resendApiKey: tenant.resend_api_key,
      })
      sent = true
    } else if (channel === 'sms' && phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      await sendSMS({
        to: phone,
        body: message,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
      sent = true
    } else if (channel === 'email' && !email) {
      lastError = 'No email address for recipient'
    } else if (channel === 'sms' && (!phone || !tenant.telnyx_api_key)) {
      lastError = !phone ? 'No phone number for recipient' : 'Telnyx not configured for tenant'
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e)
    console.error(`Notification primary send error (${type}):`, lastError)
  }

  // Fallback: email failed → try SMS, SMS failed → try email
  if (!sent && recipientId) {
    try {
      if (channel === 'email' && phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
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
      } else if (channel === 'sms' && email && tenant.resend_api_key) {
        // SMS failed, fall back to email
        await sendEmail({
          to: email,
          subject: title,
          html: htmlBody || `<p>${message.replace(/\n/g, '<br>')}</p>`,
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

  // Both primary and fallback failed — mark for retry
  await updateNotif('failed', {
    metadata: { ...(metadata || {}), _error: lastError, _failedAt: new Date().toISOString() },
  })

  return { success: false, error: lastError }
}
