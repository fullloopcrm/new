import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'

export const maxDuration = 300

// Post-job follow-up — runs every 30 min
// Sends SMS rating request 2 hours after checkout
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

  for (const tenant of tenants || []) {
    try {
      const settings = await getSettings(tenant.id)
      if (!settings.chatbot_enabled) continue
      if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

      // Find bookings completed (checked out) within last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, notes, check_out_time, clients(name, phone)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
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

        try {
          await sendSMS({
            to: client.phone,
            body: `Hi ${firstName}! How did everything go? We'd love to hear your feedback. Rate your experience 1-5 \u{1F60A}\nReply STOP to opt out.`,
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
