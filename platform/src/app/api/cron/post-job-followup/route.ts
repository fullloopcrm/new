import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'

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
        .select('id, client_id, notes, check_out_time, clients(name, phone, sms_consent)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
        .is('job_id', null)
        .is('review_followup_sent_at', null)
        .gte('check_out_time', threeHoursAgo.toISOString())
        .lte('check_out_time', twoHoursAgo.toISOString())
        .limit(500)

      for (const booking of bookings || []) {
        const client = booking.clients as unknown as { name: string; phone: string | null; sms_consent?: boolean | null } | null
        if (!client?.phone) {
          skipped++
          continue
        }
        // sms_consent is the blanket STOP/START opt-out flag (webhooks/telnyx's
        // STOP handler sets it false tenant-wide) -- this route sent unconditionally,
        // same consent-bypass bug class as payment-followup-daily/payment-reminder.
        if (client.sms_consent === false) {
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

        // Claim BEFORE sending: compare-and-swap update conditioned on
        // review_followup_sent_at still being null. Two overlapping cron
        // invocations racing on the same booking can no longer both send --
        // the loser's claim affects 0 rows and it skips. Also replaces the
        // old notes-substring marker as the dedup source: any later admin
        // edit to notes (PATCH /api/bookings/:id allows it) used to silently
        // erase the marker and trigger a duplicate send on the next pass --
        // this column is never touched by that route, so it can't happen.
        const nowIso = new Date().toISOString()
        const updatedNotes = booking.notes
          ? `${booking.notes}\n[FOLLOWUP_SENT] ${nowIso}`
          : `[FOLLOWUP_SENT] ${nowIso}`

        const { data: claimed } = await supabaseAdmin
          .from('bookings')
          .update({ review_followup_sent_at: nowIso, notes: updatedNotes })
          .eq('id', booking.id)
          .is('review_followup_sent_at', null)
          .select('id')

        if (!claimed || claimed.length === 0) {
          skipped++
          continue // lost the race to a concurrent/overlapping invocation
        }

        try {
          await sendSMS({
            to: client.phone,
            body: `Hi ${firstName}! How did everything go? We'd love to hear your feedback — takes 30 sec:\n${reviewUrl}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })

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
        .select('id, client_id, completed_at, clients(name, phone, sms_consent)')
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
        // Cheap pre-filter only -- NOT the atomic claim (job_events carries
        // no constraint backing this count(), so two overlapping invocations
        // could both read 0 here). Kept purely to skip an obviously-already-
        // handled job before the network round trip below.
        const { count: already } = await supabaseAdmin
          .from('job_events')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('event_type', 'review_requested')
        if (already && already > 0) { skipped++; continue }

        const jc = job.clients as unknown as { name: string; phone: string | null; sms_consent?: boolean | null } | null
        if (!jc?.phone) { skipped++; continue }
        if (jc.sms_consent === false) { skipped++; continue }
        const jFirst = jc.name?.split(' ')[0] || 'there'

        // Claim BEFORE sending: insert the job_events row first -- the
        // partial unique index on (job_id) WHERE event_type =
        // 'review_requested' is the atomic dedup boundary, not the count()
        // check above. Same bug class + fix shape as outreach's
        // insert-then-send fix (this session, 17:50): sending first and
        // logging after left a window where two overlapping invocations
        // could both text the client for the same completed job before
        // either's insert landed.
        const { error: claimErr } = await supabaseAdmin.from('job_events').insert({
          tenant_id: tenant.id, job_id: job.id, event_type: 'review_requested', detail: {},
        })
        if (claimErr) {
          if (!claimErr.message.includes('duplicate key')) {
            errors.push(`Job review claim ${job.id}: ${claimErr.message}`)
          }
          skipped++
          continue // lost the race, or the claim write itself failed -- either way, do not send
        }

        try {
          await sendSMS({
            to: jc.phone,
            body: `Hi ${jFirst}! How did everything go? We'd love your feedback — takes 30 sec:\n${jobReviewUrl}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
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
