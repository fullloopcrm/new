import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 300

// Post-job follow-up — runs every 30 min
// Sends SMS rating request 2 hours after checkout
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  // Get all active tenants — include domain + slug for review link.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, domain, slug')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    try {
      const settings = await getSettings(tenant.id)
      if (!settings.chatbot_enabled) continue
      if (!settings.review_followup_enabled) continue
      if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

      // Find bookings completed (checked out) within the per-tenant
      // review_followup_delay_hours window. Cron runs every 30 min, so we
      // process bookings that crossed the delay threshold within the last
      // 30-minute slice.
      const delayHours = Math.max(0.5, settings.review_followup_delay_hours)
      const delayMs = delayHours * 60 * 60 * 1000
      const twoHoursAgo = new Date(Date.now() - delayMs)
      const threeHoursAgo = new Date(Date.now() - delayMs - 60 * 60 * 1000)

      // Only standalone bookings (cleaning, N=1). Sessions of a multi-day JOB
      // carry a job_id — following up per-session would spam one review text per
      // session. Jobs get a single review request at job completion instead.
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, notes, check_out_time, clients(name, phone)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
        .is('job_id', null)
        .gte('check_out_time', threeHoursAgo.toISOString())
        .lte('check_out_time', twoHoursAgo.toISOString())
        .limit(500)

      for (const booking of bookings || []) {
        // Skip if already sent
        if (booking.notes?.includes('[FOLLOWUP_SENT]')) {
          skipped++
          continue
        }

        const client = booking.clients as unknown as { name: string; phone: string | null } | null
        if (!client?.phone) {
          skipped++
          continue
        }

        const firstName = client.name?.split(' ')[0] || 'there'

        // Build review link — prefer the tenant's configured Google review
        // URL, then custom domain, then subdomain. Tenants with a real
        // Google review link send clients straight to a 5-star post on the
        // platform's listing.
        const reviewUrl = settings.google_review_link
          || (tenant.domain
            ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/reviews/submit`
            : `https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`)

        try {
          await sendSMS({
            to: client.phone,
            body: `Hi ${firstName}! How did everything go? We'd love to hear your feedback — takes 30 sec:\n${reviewUrl}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })

          // Mark booking notes with [FOLLOWUP_SENT]
          const updatedNotes = booking.notes
            ? `${booking.notes}\n[FOLLOWUP_SENT] ${new Date().toISOString()}`
            : `[FOLLOWUP_SENT] ${new Date().toISOString()}`

          await supabaseAdmin
            .from('bookings')
            .update({ notes: updatedNotes })
            .eq('id', booking.id)

          sent++
        } catch (smsErr) {
          errors.push(`SMS to ${client.phone} for booking ${booking.id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
        }
      }

      // Jobs (projects): one review request per COMPLETED job — the piece
      // bookings don't cover. Same flag gate (review_followup_enabled, checked
      // above) + telnyx. Deduped via a 'review_requested' job_event so a job is
      // only ever asked once, no matter how many sessions it had.
      const { data: doneJobs } = await supabaseAdmin
        .from('jobs')
        .select('id, client_id, completed_at, clients(name, phone)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
        .gte('completed_at', threeHoursAgo.toISOString())
        .lte('completed_at', twoHoursAgo.toISOString())
        .limit(200)

      const jobReviewUrl = settings.google_review_link
        || (tenant.domain
          ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/reviews/submit`
          : `https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`)

      for (const job of doneJobs || []) {
        const { count: already } = await supabaseAdmin
          .from('job_events')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('event_type', 'review_requested')
        if (already && already > 0) { skipped++; continue }

        const jc = job.clients as unknown as { name: string; phone: string | null } | null
        if (!jc?.phone) { skipped++; continue }
        const jFirst = jc.name?.split(' ')[0] || 'there'

        try {
          await sendSMS({
            to: jc.phone,
            body: `Hi ${jFirst}! How did everything go? We'd love your feedback — takes 30 sec:\n${jobReviewUrl}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })
          await supabaseAdmin.from('job_events').insert({
            tenant_id: tenant.id, job_id: job.id, event_type: 'review_requested', detail: {},
          })
          sent++
        } catch (smsErr) {
          errors.push(`Job review SMS ${job.id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
        }
      }
    } catch (tenantErr) {
      errors.push(`Tenant ${tenant.name} (${tenant.id}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`)
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    errors: errors.slice(0, 20),
  })
}
