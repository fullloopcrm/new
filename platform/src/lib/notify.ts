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
  // Create notification record
  await supabaseAdmin.from('notifications').insert({
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
  })

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

  // Send via channel
  try {
    if (channel === 'email' && email) {
      await sendEmail({
        to: email,
        subject: title,
        html: htmlBody || `<p>${message.replace(/\n/g, '<br>')}</p>`,
        resendApiKey: tenant.resend_api_key,
      })
    } else if (channel === 'sms' && phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      await sendSMS({
        to: phone,
        body: message,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
    }

    // Mark as sent
    await supabaseAdmin
      .from('notifications')
      .update({ status: 'sent' })
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    return { success: true }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error(`Notification send error (${type}):`, e)

    // Log the failure with error details in metadata
    await supabaseAdmin
      .from('notifications')
      .update({
        status: 'failed',
        metadata: { ...(metadata || {}), _error: errorMessage, _failedAt: new Date().toISOString() },
      })
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    return { success: false, error: errorMessage }
  }
}
