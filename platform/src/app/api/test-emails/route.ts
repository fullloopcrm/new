/**
 * Test harness — sends every email template to the authenticated admin so
 * they can preview rendered output. Tenant-scoped; sender uses tenant.resend_api_key.
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { requirePermission } from '@/lib/require-permission'
import {
  bookingConfirmationEmail,
  bookingReceivedEmail,
  bookingReminderEmail,
  dailySummaryEmail,
  dailyOpsRecapEmail,
  followUpEmail,
  notificationDigestEmail,
  paymentReceiptEmail,
  reviewRequestEmail,
  adminNewClientEmail,
} from '@/lib/email-templates'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('id, name, email, phone, primary_color, logo_url, resend_api_key, email_from')
    .eq('id', tenant.tenantId)
    .single()

  if (!t?.email) return NextResponse.json({ error: 'Tenant has no email set — cannot send test' }, { status: 400 })

  const base = {
    tenantName: t.name,
    primaryColor: t.primary_color || undefined,
    logoUrl: t.logo_url || undefined,
  }

  const bookingData = {
    ...base,
    clientName: 'Test Client',
    serviceName: 'Standard Service',
    dateTime: new Date(Date.now() + 48 * 3600 * 1000).toLocaleString(),
    address: '123 Main St, New York, NY',
    teamMemberName: 'Test Team Member',
    price: '$150',
    timeUntil: 'tomorrow at 10am',
  }

  const templates: Array<{ name: string; fn: () => { subject: string; html: string } | string }> = [
    { name: '1. Booking Reminder', fn: () => ({ subject: '[TEST] Booking Reminder', html: bookingReminderEmail(bookingData) }) },
    { name: '2. Booking Confirmation', fn: () => ({ subject: '[TEST] Booking Confirmed', html: bookingConfirmationEmail(bookingData) }) },
    { name: '3. Booking Received', fn: () => ({ subject: '[TEST] Booking Received', html: bookingReceivedEmail(bookingData) }) },
    { name: '4. Daily Summary', fn: () => ({ subject: '[TEST] Daily Summary', html: dailySummaryEmail({ ...base, todaysJobs: 5, yesterdayRevenue: '$1,250', upcomingSchedules: 12 }) }) },
    { name: '5. Daily Ops Recap', fn: () => ({ subject: '[TEST] Daily Ops Recap', html: dailyOpsRecapEmail({ ...base, todayDate: new Date().toLocaleDateString(), tomorrowDate: new Date(Date.now() + 86400000).toLocaleDateString(), todayJobs: [], tomorrowJobs: [], todayRevenue: '$500', todayJobCount: 0, tomorrowJobCount: 0, todayPaid: 0, todayUnpaid: 0 }) }) },
    { name: '6. Follow Up', fn: () => ({ subject: '[TEST] Follow Up', html: followUpEmail({ ...base, clientName: 'Test Client', serviceName: 'Standard Service', discountCode: 'THANKS10' }) }) },
    { name: '7. Notification Digest', fn: () => ({ subject: '[TEST] Digest', html: notificationDigestEmail({ ...base, date: new Date().toLocaleDateString(), emailCount: 3, smsCount: 1, entries: [{ type: 'booking', recipient: 'test@x', time: '1h ago', channel: 'email' }] }) }) },
    { name: '8. Payment Receipt', fn: () => ({ subject: '[TEST] Payment Receipt', html: paymentReceiptEmail({ ...base, clientName: 'Test Client', amount: '$150', date: new Date().toLocaleDateString(), paymentMethod: 'Stripe', serviceName: 'Standard' }) }) },
    { name: '9. Review Request', fn: () => ({ subject: '[TEST] Review Request', html: reviewRequestEmail({ ...base, clientName: 'Test Client', feedbackUrl: 'https://example.com/review' }) }) },
    {
      name: '10. Admin New Client',
      fn: () => {
        const msg = adminNewClientEmail(
          { name: 'Test Lead', phone: '(212) 555-1212', email: 'test@example.com', address: '123 Main St' },
          base,
        )
        return { subject: '[TEST] ' + msg.subject, html: msg.html }
      },
    },
  ]

  const results: Array<{ name: string; success: boolean; error?: string }> = []
  for (const tpl of templates) {
    try {
      const rendered = tpl.fn()
      if (typeof rendered === 'string') throw new Error('template must return {subject, html}')
      await sendEmail({
        to: t.email,
        subject: rendered.subject,
        html: rendered.html,
        from: t.email_from || undefined,
        resendApiKey: t.resend_api_key || null,
      })
      results.push({ name: tpl.name, success: true })
    } catch (err) {
      results.push({ name: tpl.name, success: false, error: err instanceof Error ? err.message : String(err) })
    }
    await new Promise(r => setTimeout(r, 300))
  }

  const sent = results.filter(r => r.success).length
  return NextResponse.json({ message: `Sent ${sent} of ${templates.length} test emails to ${t.email}`, results })
}
