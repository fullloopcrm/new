import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import { notify } from '@/lib/notify'
import { sendPushToTenantAdmins } from '@/lib/push'
import { trackError } from '@/lib/error-tracking'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 300

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  let lateCheckIns = 0
  let lateCheckOuts = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone, owner_phone, phone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    // Late alerts: team text gated by team_late_alert, owner text by
    // owner_late_alert. Push + in-app rows stay regardless.
    const latePrefs = await getCommPrefs(tenantId)
    const teamLateOn = latePrefs.comms.team_late_alert?.sms !== false
    const ownerLateOn = latePrefs.comms.owner_late_alert?.sms !== false

    try {
      // ============================================
      // LATE CHECK-IN — 10+ min after start_time, no check-in
      // ============================================
      const { data: lateBookings } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, hourly_rate, team_member_id, is_emergency, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone, pin, sms_consent)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed'])
        .lte('start_time', tenMinAgo.toISOString())
        .gte('start_time', todayStart.toISOString())
        .is('check_in_time', null)
        .limit(100)

      for (const booking of lateBookings || []) {
        // Dedup via notifications table
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'late_check_in')
          .limit(1)
        if (existing && existing.length > 0) continue

        const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const memberName = (booking.team_members as any)?.name || 'Unassigned'
        const clientName = (booking.clients as any)?.name || 'Client'
        const memberPhone = (booking.team_members as any)?.phone
        const memberConsent = (booking.team_members as any)?.sms_consent
        const templates = teamSmsTemplates(tenant)
        // Same admin-blindness class as items (20)/(24)/(26)/(29)/(30): a
        // same-day emergency job running late to check-in is a different
        // severity of problem than a routine one, but the alert was identical.
        const isEmergency = !!(booking as any).is_emergency

        // SMS to team member — gated on sms_consent, same item-48 convention
        // as every other team-member send site (default-opt-in: only a
        // recorded `false` blocks the text).
        if (teamLateOn && memberPhone && memberConsent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: memberPhone,
            body: templates.lateCheckInCleaner(booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: templates.lateCheckInAdmin(booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          isEmergency ? '🚨 Urgent Late Check-In' : 'Late Check-In',
          `${memberName} — ${clientName} at ${time}`,
          '/dashboard/bookings'
        ).catch(() => {})

        // In-app notification (also serves as dedup record)
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_in',
          title: isEmergency ? '🚨 Urgent Late Check-In' : 'Late Check-In',
          message: `${isEmergency ? '🚨 EMERGENCY — ' : ''}${memberName} hasn't checked in for ${clientName} (${time})`,
          booking_id: booking.id,
          channel: 'sms',
          status: 'sent',
        })

        lateCheckIns++
      }

      // ============================================
      // LATE CHECK-OUT — 30+ min after 15-min alert, no check-out
      // ============================================
      const { data: lateCheckouts } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, hourly_rate, team_member_id, fifteen_min_alert_time, is_emergency, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone, pin, sms_consent)')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_progress')
        .not('fifteen_min_alert_time', 'is', null)
        .lte('fifteen_min_alert_time', thirtyMinAgo.toISOString())
        .is('check_out_time', null)
        .limit(100)

      for (const booking of lateCheckouts || []) {
        // Dedup
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'late_check_out')
          .limit(1)
        if (existing && existing.length > 0) continue

        const memberName = (booking.team_members as any)?.name || 'Unassigned'
        const clientName = (booking.clients as any)?.name || 'Client'
        const memberPhone = (booking.team_members as any)?.phone
        const memberConsent = (booking.team_members as any)?.sms_consent
        const templates = teamSmsTemplates(tenant)
        const isEmergency = !!(booking as any).is_emergency

        // SMS to team member — gated on sms_consent, same as the check-in leg above.
        if (teamLateOn && memberPhone && memberConsent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: memberPhone,
            body: templates.lateCheckOutCleaner(booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: templates.lateCheckOutAdmin(booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          isEmergency ? '🚨 Urgent Late Check-Out' : 'Late Check-Out',
          `${memberName} — ${clientName} still on site`,
          '/dashboard/bookings'
        ).catch(() => {})

        // In-app notification (dedup record)
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_out',
          title: isEmergency ? '🚨 Urgent Late Check-Out' : 'Late Check-Out',
          message: `${isEmergency ? '🚨 EMERGENCY — ' : ''}${memberName} hasn't checked out for ${clientName} — 30+ min since 15-min alert`,
          booking_id: booking.id,
          channel: 'sms',
          status: 'sent',
        })

        lateCheckOuts++
      }

    } catch (tenantErr) {
      const errMsg = `Tenant ${tenant.name} (${tenantId}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`
      errors.push(errMsg)
      console.error('Late check-in cron error:', errMsg)
    }
  }

  if (errors.length > 0) {
    await trackError(new Error(errors.join('; ')), {
      source: 'cron/late-check-in',
      severity: 'high',
    }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    late_check_ins: lateCheckIns,
    late_check_outs: lateCheckOuts,
    errors: errors.slice(0, 10),
  })
}
