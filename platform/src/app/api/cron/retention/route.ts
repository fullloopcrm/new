import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { safeEqual } from '@/lib/secret-compare'
import { toNaiveET } from '@/lib/dates'

export const maxDuration = 300

// 30-day retention cron — runs daily at 10am
// Targets clients whose last completed booking was 30-90 days ago
// with no upcoming booking, max 3 retention texts per client
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  // bookings.start_time/end_time are naive-ET TIMESTAMP (no tz) -- their
  // parsed digits are ET wall-clock, not a real UTC instant, so boundaries
  // compared against them need the same naive-ET-as-local-digits encoding
  // (nowNaiveET below), not real-UTC arithmetic off `now`. notifications
  // .created_at is TIMESTAMPTZ (aware), so thirtyDaysAgoNotif correctly
  // stays real-UTC.
  const nowNaiveET = new Date(toNaiveET(now))
  const thirtyDaysAgo = new Date(nowNaiveET.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(nowNaiveET.getTime() - 90 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoNotif = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

    try {
      // Find active clients with SMS consent. clients.active is a stale,
      // never-written NYC-Maid-import snapshot column (see
      // 2026_07_17_clients_active_column_backfill_PROPOSED.sql) -- a
      // production sample found 426 of 439 status='inactive' clients still
      // read active=true, so this filter was excluding almost none of them.
      // That included clients whose status is 'do_not_contact', a distinct
      // value this filter never checked at all -- this daily cron was
      // sending unsolicited retention SMS to clients explicitly marked
      // do-not-contact in the CRM. Filter on `status` instead, the field
      // client edits/DNS flagging actually maintain, and exclude
      // do_not_contact alongside inactive.
      // do_not_service is a separate boolean kill-switch from `status` (see
      // the status/active-column fix above) -- the nycmaid-legacy
      // getClientContacts() fan-out helper and this session's booking-
      // lifecycle/campaign fixes (89c2cdd9, 14fa0888, da0b904d) treat it as
      // an absolute, channel-agnostic gate. This filter never checked it, so
      // a DNS-flagged client with status='active' and sms_consent=true still
      // got unsolicited retention win-back texts.
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone')
        .eq('tenant_id', tenant.id)
        .not('status', 'in', '(inactive,do_not_contact)')
        .neq('do_not_service', true)
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
          .gte('start_time', toNaiveET(now))

        if ((upcomingCount || 0) > 0) { skipped++; continue }

        // Check how many retention texts already sent (max 3)
        const { count: retentionCount } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('recipient_id', client.id)
          .eq('type', 'retention')

        if ((retentionCount || 0) >= 3) { skipped++; continue }

        // Check if retention text was sent in last 30 days
        const { data: recentRetention } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('recipient_id', client.id)
          .eq('type', 'retention')
          .gte('created_at', thirtyDaysAgoNotif.toISOString())
          .limit(1)

        if (recentRetention && recentRetention.length > 0) { skipped++; continue }

        // Send retention SMS
        const firstName = client.name?.split(' ')[0] || 'there'
        try {
          await sendSMS({
            to: client.phone,
            body: `Hey ${firstName}! It's been a while \u2014 need help? We'd love to assist \u{1F60A}\nReply STOP to opt out.`,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })

          // Log the retention notification
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenant.id,
            type: 'retention',
            title: `Retention SMS: ${client.name}`,
            message: `Retention text sent to ${client.name} (${client.phone})`,
            channel: 'sms',
            recipient_type: 'client',
            recipient_id: client.id,
            status: 'sent',
            metadata: { sms_type: 'retention', retention_count: (retentionCount || 0) + 1 },
          })

          sent++
        } catch (smsErr) {
          errors.push(`SMS to ${client.phone}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
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
