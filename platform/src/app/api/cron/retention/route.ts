import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { nowNaiveET } from '@/lib/recurring'

export const maxDuration = 300

// 30-day retention cron — runs daily at 10am
// Targets clients whose last completed booking was 30-90 days ago
// with no upcoming booking, max 3 retention texts per client
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  // Get all active tenants
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone')
    .eq('status', 'active')
    .limit(1000)

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoNotif = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

    try {
      // Find active clients with SMS consent
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone, retention_sms_sent_at, retention_sms_count')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
        .eq('sms_consent', true)
        .not('phone', 'is', null)
        .limit(500)

      for (const client of clients || []) {
        if (!client.phone) continue

        // Check last completed booking
        const { data: lastBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, end_time')
          .eq('tenant_id', tenant.id)
          .eq('client_id', client.id)
          .in('status', ['completed', 'paid'])
          .order('end_time', { ascending: false })
          .limit(1)
          .single()

        if (!lastBooking?.end_time) { skipped++; continue }

        const lastDate = new Date(lastBooking.end_time)
        // Must be between 30-90 days ago
        if (lastDate > thirtyDaysAgo || lastDate < ninetyDaysAgo) { skipped++; continue }

        // Check for upcoming bookings
        const { count: upcomingCount } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('client_id', client.id)
          .in('status', ['scheduled', 'confirmed'])
          // start_time is naive-ET; now.toISOString() is true-UTC and would
          // skew this "any upcoming booking?" gate by 4-5h (see lib/recurring's
          // nowNaiveET header) -- a client due for a retention text could get
          // skipped/kept based on a booking that isn't really upcoming yet.
          .gte('start_time', nowNaiveET())

        if ((upcomingCount || 0) > 0) { skipped++; continue }

        // Claim BEFORE sending: the old dedup was two separate notifications-
        // table SELECTs (a lifetime-cap COUNT and a 30-day-cooldown SELECT),
        // but the only notifications row that would satisfy either check is
        // inserted AFTER sendSMS() resolves -- same sent-before-claim race
        // fixed elsewhere this session (phone-fixup/confirmation-reminder/
        // payment-followup-daily/etc). This cron runs daily with no run-lock
        // over up to 500 clients per tenant, so two overlapping invocations
        // could both read zero matching rows before either write landed and
        // both text the client. Both the cooldown and the lifetime cap are
        // enforced atomically in ONE UPDATE's WHERE clause -- the losing
        // invocation's claim affects 0 rows and it skips.
        const priorSentAt = client.retention_sms_sent_at as string
        const priorCount = (client.retention_sms_count as number) || 0
        const { data: claimed } = await supabaseAdmin
          .from('clients')
          .update({
            retention_sms_sent_at: now.toISOString(),
            retention_sms_count: priorCount + 1,
          })
          .eq('id', client.id)
          .eq('tenant_id', tenant.id)
          .lt('retention_sms_sent_at', thirtyDaysAgoNotif.toISOString())
          .lt('retention_sms_count', 3)
          .select('id')
        if (!claimed || claimed.length === 0) { skipped++; continue } // lost the race, capped, or still in cooldown

        // Send retention SMS
        const firstName = client.name?.split(' ')[0] || 'there'
        try {
          await sendSMS({
            to: client.phone,
            body: `Hey ${firstName}! It's been a while \u2014 need help? We'd love to assist \u{1F60A}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })

          // Audit trail only now -- retention_sms_sent_at/retention_sms_count
          // above are the dedup source of truth.
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenant.id,
            type: 'retention',
            title: `Retention SMS: ${client.name}`,
            message: `Retention text sent to ${client.name} (${client.phone})`,
            channel: 'sms',
            recipient_type: 'client',
            recipient_id: client.id,
            status: 'sent',
            metadata: { sms_type: 'retention', retention_count: priorCount + 1 },
          })

          sent++
        } catch (smsErr) {
          errors.push(`SMS to ${client.phone}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
          // Release the claim on failure, back to its exact pre-claim state
          // -- the old notifications-based dedup only ever recorded a
          // SUCCESSFUL send, so a failed attempt didn't count against the
          // lifetime cap and wasn't subject to the cooldown either.
          await supabaseAdmin.from('clients')
            .update({ retention_sms_sent_at: priorSentAt, retention_sms_count: priorCount })
            .eq('id', client.id)
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
