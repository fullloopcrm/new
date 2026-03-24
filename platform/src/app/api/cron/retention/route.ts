import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

export const maxDuration = 300

// 30-day retention cron — runs daily at 10am
// Targets clients whose last completed booking was 30-90 days ago
// with no upcoming booking, max 3 retention texts per client
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoNotif = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

    try {
      // Find active clients with SMS consent
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone')
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
          .gte('start_time', now.toISOString())

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
