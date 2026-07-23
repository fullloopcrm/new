/**
 * One-off verification send: fires every new/updated global email + SMS
 * template — populated with nycmaid's real tenant config — to Jeff's own
 * inbox/phone so the content + FullLoop-branded styling can be eyeballed
 * before any live call site is repointed at these functions.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

import { sendEmail, tenantSender } from '../src/lib/email'
import { sendSMS } from '../src/lib/sms'
import * as ET from '../src/lib/email-templates'
import * as ST from '../src/lib/sms-templates'
import { getCommPolicy, buildTemplateData } from '../src/lib/comms-prefs'

const TEST_EMAIL = 'jefftuckernyc@gmail.com'
const TEST_PHONE = '+12122029220'
const NYCMAID_ID = '00000000-0000-0000-0000-000000000001'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant, error } = await supabase.from('tenants').select('*').eq('id', NYCMAID_ID).single()
  if (error || !tenant) throw new Error(`tenant fetch failed: ${error?.message}`)

  const policy = await getCommPolicy(NYCMAID_ID)
  const base = buildTemplateData(tenant, policy)

  const emails: { label: string; subject: string; html: string }[] = [
    { label: 'bookingConfirmationEmail', subject: 'TEST: Booking Confirmed', html: ET.bookingConfirmationEmail({
      ...base, clientName: 'Sarah', serviceName: 'Standard Cleaning', dateTime: 'Thursday, Aug 6 · 10:00am–12:00pm',
      teamMemberName: 'Maria G.', address: '150 W 47th St, New York, NY', price: '$138.00 (2 hrs × $69/hr)',
      portalUrl: policy.bookingUrl, discountCents: 1000, discountLabel: 'self-book discount', isRecurring: false, suppliesIncluded: true,
      teamMemberPhotoUrl: 'https://i.pravatar.cc/150?img=47', teamMemberRatingAvg: 4.9, teamMemberRatingCount: 62,
      portalEmail: 'sarah@example.com', portalPin: '7731',
      whatToExpect: 'Maria will arrive within your 2-hour window. Once she arrives, she provides a thorough, quality service — if you forgot to mention something, just let her know.',
      prepTips: ['Clear countertops and surfaces', 'Pick up clothes and personal items from floors', 'Let us know about pets', 'Make sure building/door access is arranged'],
    }) },
    { label: 'clientBookingReceivedEmail', subject: 'TEST: Booking Received', html: ET.clientBookingReceivedEmail({
      ...base, clientName: 'Sarah', serviceName: 'Standard Cleaning', dateTime: 'Thursday, Aug 6 · 10:00am', price: '$138.00 (2 hrs × $69/hr)',
      isRecurring: false, portalEmail: 'sarah@example.com', portalPin: '7731',
    }) },
    { label: 'bookingReminderEmail', subject: 'TEST: Reminder', html: ET.bookingReminderEmail({
      ...base, clientName: 'Sarah', serviceName: 'Standard Cleaning', dateTime: 'Thursday, Aug 6 · 10:00am–12:00pm',
      address: '150 W 47th St, New York, NY', timeUntil: 'tomorrow', teamMemberName: 'Maria G.', teamMemberPhotoUrl: 'https://i.pravatar.cc/150?img=47',
    }) },
    { label: 'clientCancellationEmail', subject: 'TEST: Cancelled', html: ET.clientCancellationEmail({
      ...base, clientName: 'Sarah', serviceName: 'Standard Cleaning', dateTime: 'Thursday, Aug 6 · 10:00am',
    }) },
    { label: 'clientThankYouEmail', subject: 'TEST: Thank You', html: ET.clientThankYouEmail({ ...base, clientName: 'Sarah', referralLink: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced' }) },
    { label: 'clientPaymentDueEmail', subject: 'TEST: Payment Due', html: ET.clientPaymentDueEmail({
      ...base, clientName: 'Sarah', teamMemberName: 'Maria G.', amount: '138.00', paymentUrl: tenant.payment_link,
    }) },
    { label: 'clientRatingPromptEmail', subject: 'TEST: Rating Prompt', html: ET.clientRatingPromptEmail({
      ...base, clientName: 'Sarah', teamMemberName: 'Maria G.',
    }) },
    { label: 'clientReviewIncentiveEmail', subject: 'TEST: Review Incentive', html: ET.clientReviewIncentiveEmail({
      ...base, clientName: 'Sarah', teamMemberName: 'Maria G.', incentiveAmount: '10', referralLink: 'https://www.thenycmaid.com/book?ref=ALEX10',
    }) },
    { label: 'clientRescheduleEmail', subject: 'TEST: Rescheduled', html: ET.clientRescheduleEmail({
      ...base, clientName: 'Sarah', serviceName: 'Standard Cleaning', newDateTime: 'Friday, Aug 7 · 10:00am',
      oldDateTime: 'Thursday, Aug 6 · 10:00am', teamMemberName: 'Maria G.',
    }) },
    { label: 'teamJobAssignmentEmail', subject: 'TEST: Job Assigned', html: ET.teamJobAssignmentEmail({
      ...base, teamMemberName: 'Maria G.', clientName: 'Sarah', serviceName: 'Standard Cleaning',
      dateTime: 'Thursday, Aug 6 · 10:00am', address: '150 W 47th St, New York, NY', notes: 'Dog on premises, friendly',
      portalUrl: 'https://www.thenycmaid.com/team', suppliesIncluded: true,
    }) },
    { label: 'teamDailyJobsEmail', subject: 'TEST: Your Upcoming Jobs', html: ET.teamDailyJobsEmail({
      ...base, teamMemberName: 'Maria G.', portalUrl: 'https://www.thenycmaid.com/team',
      jobs: [
        { clientName: 'Sarah', dateTime: 'Thu Aug 6, 10:00am', address: '150 W 47th St', suppliesIncluded: true },
        { clientName: 'John', dateTime: 'Fri Aug 7, 2:00pm', suppliesIncluded: false, notes: 'Client provides supplies — do not bring your own' },
      ],
    }) },
    { label: 'teamCancellationEmail', subject: 'TEST: Job Cancelled (team)', html: ET.teamCancellationEmail({
      ...base, teamMemberName: 'Maria G.', clientName: 'Sarah', dateTime: 'Thursday, Aug 6 · 10:00am', portalUrl: 'https://www.thenycmaid.com/team',
    }) },
    { label: 'teamRescheduleEmail', subject: 'TEST: Job Rescheduled (team)', html: ET.teamRescheduleEmail({
      ...base, teamMemberName: 'Maria G.', clientName: 'Sarah', newDateTime: 'Fri Aug 7, 10am', oldDateTime: 'Thu Aug 6, 10am',
      address: '150 W 47th St', portalUrl: 'https://www.thenycmaid.com/team',
    }) },
    { label: 'referralWelcomeEmail', subject: 'TEST: Referral Welcome', html: ET.referralWelcomeEmail({
      ...base, referrerName: 'Alex', refCode: 'ALEX10', referralLink: 'https://www.thenycmaid.com/book?ref=ALEX10',
      payoutMethod: 'Zelle', dashboardUrl: 'https://www.thenycmaid.com/referral-dashboard?code=ALEX10',
    }) },
    { label: 'referralCommissionEmail', subject: 'TEST: Referral Commission', html: ET.referralCommissionEmail({
      ...base, referrerName: 'Alex', commissionAmount: '13.80', serviceTotal: '138.00', pendingBalance: '27.60',
      refCode: 'ALEX10', dashboardUrl: 'https://www.thenycmaid.com/referral-dashboard?code=ALEX10',
    }) },
    { label: 'newReferrerAdminEmail', subject: '', html: '' }, // handled separately (returns {subject, html})
    { label: 'verificationCodeEmail', subject: 'TEST: Verification Code', html: ET.verificationCodeEmail({ ...base, code: '482913', clientName: 'Sarah' }) },
    { label: 'pinResetEmail', subject: 'TEST: PIN Reset', html: ET.pinResetEmail({ ...base, personName: 'Maria G.', pin: '4821', portalUrl: 'https://www.thenycmaid.com/team' }) },
    { label: 'adminPendingRemindersEmail', subject: '', html: '' }, // handled separately
    { label: 'teamApplicationApprovedEmail', subject: 'TEST: Team Application Approved', html: ET.teamApplicationApprovedEmail({
      ...base, applicantName: 'Maria G.', pin: '4821', portalUrl: 'https://www.thenycmaid.com/team', supportPhone: policy.supportPhone,
    }) },
    { label: 'dailyOpsRecapEmail', subject: 'TEST: Daily Ops Recap', html: ET.dailyOpsRecapEmail({
      ...base, todayDate: 'Thu Aug 6', tomorrowDate: 'Fri Aug 7', todayJobCount: 1, tomorrowJobCount: 1,
      todayJobs: [{ clientName: 'Sarah', teamMemberName: 'Maria G.', time: '10am', revenue: '$138', paymentStatus: 'paid' }],
      tomorrowJobs: [{ clientName: 'John', teamMemberName: 'Maria G.', time: '2pm', revenue: '$150' }],
      todayRevenue: '$138', todayPaid: 1, todayUnpaid: 0,
    }) },
    { label: 'genericNotificationEmail', subject: 'TEST: Generic Notification', html: ET.genericNotificationEmail({
      ...base, title: 'Heads up', message: 'This is the generic branded fallback template.',
    }) },
  ]

  const newReferrerAdmin = ET.newReferrerAdminEmail(
    { name: 'Alex', email: 'alex@example.com', phone: '+12125551234', refCode: 'ALEX10', payoutMethod: 'Zelle' },
    { ...base, adminUrl: 'https://www.thenycmaid.com/admin/referrals' },
  )
  const pendingReminders = ET.adminPendingRemindersEmail(
    [{ clientName: 'Sarah', date: 'Thu Aug 6', serviceName: 'Standard Cleaning' }],
    { ...base, adminUrl: 'https://www.thenycmaid.com/admin/bookings' },
  )

  console.log(`Sending ${emails.length} test emails to ${TEST_EMAIL}...`)
  for (const e of emails) {
    const subject = e.label === 'newReferrerAdminEmail' ? `TEST: ${newReferrerAdmin.subject}`
      : e.label === 'adminPendingRemindersEmail' ? `TEST: ${pendingReminders.subject}`
      : e.subject
    const html = e.label === 'newReferrerAdminEmail' ? newReferrerAdmin.html
      : e.label === 'adminPendingRemindersEmail' ? pendingReminders.html
      : e.html
    try {
      await sendEmail({ to: TEST_EMAIL, subject: `[${e.label}] ${subject}`, html, from: tenantSender(tenant), resendApiKey: tenant.resend_api_key })
      console.log(`  ✓ ${e.label}`)
    } catch (err) {
      console.error(`  ✗ ${e.label} — ${err instanceof Error ? err.message : err}`)
    }
    await sleep(400)
  }

  const smsMessages: { label: string; body: string }[] = [
    { label: 'smsBookingReceived', body: ST.smsBookingReceived(tenant.name, { start_time: '2026-08-06T14:00:00Z' }) },
    { label: 'smsBookingConfirmation', body: ST.smsBookingConfirmation(tenant.name, { start_time: '2026-08-06T14:00:00Z', team_members: { name: 'Maria G.' } }, policy.bookingUrl) },
    { label: 'smsReminder', body: ST.smsReminder(tenant.name, { start_time: '2026-08-06T14:00:00Z', team_members: { name: 'Maria G.' } }, 'tomorrow') },
    { label: 'smsCancellation', body: ST.smsCancellation(tenant.name, { start_time: '2026-08-06T14:00:00Z' }, policy.bookingUrl) },
    { label: 'smsReschedule', body: ST.smsReschedule(tenant.name, { start_time: '2026-08-07T14:00:00Z' }, policy.bookingUrl) },
    { label: 'smsThankYou', body: ST.smsThankYou(tenant.name, 'Sarah') },
    { label: 'smsVerificationCode', body: ST.smsVerificationCode(tenant.name, '482913') },
    { label: 'smsJobAssignment', body: ST.smsJobAssignment(tenant.name, { start_time: '2026-08-06T14:00:00Z', clients: { name: 'Sarah' } }, 'https://www.thenycmaid.com/team') },
    { label: 'smsDailySummary', body: ST.smsDailySummary(tenant.name, 'Maria G.', 2, 'https://www.thenycmaid.com/team') },
    { label: 'smsJobCancelled', body: ST.smsJobCancelled(tenant.name, { start_time: '2026-08-06T14:00:00Z', clients: { name: 'Sarah' } }) },
    { label: 'smsJobRescheduled', body: ST.smsJobRescheduled(tenant.name, { start_time: '2026-08-07T14:00:00Z', clients: { name: 'Sarah' } }) },
    { label: 'smsPaymentDue', body: ST.smsPaymentDue(tenant.name, '138.00') },
    { label: 'smsPaymentDueAdmin', body: ST.smsPaymentDueAdmin(tenant.name, 'Sarah', 'Maria G.', '138.00') },
    { label: 'smsRatingQ1', body: ST.smsRatingQ1(tenant.name) },
    { label: 'smsRatingQ2', body: ST.smsRatingQ2('Maria') },
    { label: 'smsRatingQ3', body: ST.smsRatingQ3() },
    { label: 'smsRatingThanks', body: ST.smsRatingThanks(tenant.name, { serviceRating: 5, memberRating: 5 }) },
    { label: 'smsReviewRequest', body: ST.smsReviewRequest(tenant.name, 'Maria', policy.reviewUrl || '', `We'll take $10 off your bill for a written review.`) },
    { label: 'smsNewReferrer', body: ST.smsNewReferrer(tenant.name, 'Alex', 'ALEX10') },
  ]

  if (process.env.SKIP_SMS === '1') {
    console.log('\nSkipping SMS batch (SKIP_SMS=1) — SMS templates unchanged since last verified send.')
    return
  }
  console.log(`\nSending ${smsMessages.length} test texts to ${TEST_PHONE}...`)
  for (const s of smsMessages) {
    try {
      await sendSMS({ to: TEST_PHONE, body: `[${s.label}] ${s.body}`, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
      console.log(`  ✓ ${s.label}`)
    } catch (err) {
      console.error(`  ✗ ${s.label} — ${err instanceof Error ? err.message : err}`)
    }
    await sleep(1200)
  }

  console.log('\nDone.')
}

main().catch((err) => { console.error(err); process.exit(1) })
