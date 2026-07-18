import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import { notify } from '@/lib/notify'
import { sendPushToTenantAdmins } from '@/lib/push'
import { trackError } from '@/lib/error-tracking'
import { etToday, formatNaiveET, nowNaiveET } from '@/lib/recurring'
import {
  smsLateCheckInTeam,
  smsLateCheckInAdmin,
  smsLateCheckOutTeam,
  smsLateCheckOutAdmin,
} from '@/lib/sms-templates'

export const maxDuration = 300

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  // fifteen_min_alert_time is genuinely UTC (written via
  // `new Date().toISOString()`) -- thirtyMinAgo stays a true-UTC cutoff for
  // that filter only.
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
  // start_time is naive-ET (see recurring.ts's nowNaiveET header). The old
  // tenMinAgo/todayStart, built from true-UTC `now`, silently misread the
  // naive-ET column as UTC -- both the instant-cutoff bug (tenMinAgo, same
  // class as e380a403) and its day-boundary counterpart (todayStart, same
  // class already fixed on the main dashboard, 975d7db8).
  const tenMinAgoET = nowNaiveET(-10 * 60 * 1000)
  const todayStartET = formatNaiveET(etToday())

  let lateCheckIns = 0
  let lateCheckOuts = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, owner_phone, phone')
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
        .select('id, start_time, team_member_id, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed'])
        .lte('start_time', tenMinAgoET)
        .gte('start_time', todayStartET)
        .is('check_in_time', null)
        .limit(100)

      for (const booking of lateBookings || []) {
        const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const memberName = (booking.team_members as any)?.name || 'Unassigned'
        const clientName = (booking.clients as any)?.name || 'Client'
        const memberPhone = (booking.team_members as any)?.phone

        // Claim BEFORE sending: insert the notifications row FIRST -- the
        // partial unique index on (tenant_id, booking_id, type) WHERE
        // type IN ('late_check_in','late_check_out') is the atomic dedup
        // boundary, not a pre-send select(). Two overlapping invocations
        // (this cron loops every active tenant with no run-lock) used to be
        // able to both read zero existing notifications for the same late
        // booking and both fire team+admin SMS before either's insert
        // landed. Same bug class + fix shape as this session's
        // post-job-followup/outreach/payment-reminder claim-before-send fixes.
        const { error: claimErr } = await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_in',
          title: 'Late Check-In',
          message: `${memberName} hasn't checked in for ${clientName} (${time})`,
          booking_id: booking.id,
          channel: 'sms',
          status: 'sent',
        })
        if (claimErr) {
          if (!claimErr.message.includes('duplicate key')) {
            errors.push(`Late check-in claim ${booking.id}: ${claimErr.message}`)
          }
          continue // lost the race, or the claim write itself failed -- either way, do not send
        }

        // SMS to team member
        if (teamLateOn && memberPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: memberPhone,
            body: smsLateCheckInTeam(tenant.name, booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: smsLateCheckInAdmin(tenant.name, booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          'Late Check-In',
          `${memberName} — ${clientName} at ${time}`,
          '/dashboard/bookings'
        ).catch(() => {})

        lateCheckIns++
      }

      // ============================================
      // LATE CHECK-OUT — 30+ min after 15-min alert, no check-out
      // ============================================
      const { data: lateCheckouts } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, team_member_id, fifteen_min_alert_time, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone)')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_progress')
        .not('fifteen_min_alert_time', 'is', null)
        .lte('fifteen_min_alert_time', thirtyMinAgo.toISOString())
        .is('check_out_time', null)
        .limit(100)

      for (const booking of lateCheckouts || []) {
        const memberName = (booking.team_members as any)?.name || 'Unassigned'
        const clientName = (booking.clients as any)?.name || 'Client'
        const memberPhone = (booking.team_members as any)?.phone

        // Claim BEFORE sending -- see the matching comment in the late
        // check-in branch above; same fix, same partial unique index
        // (this type is the other half of its WHERE IN clause).
        const { error: claimErr } = await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_out',
          title: 'Late Check-Out',
          message: `${memberName} hasn't checked out for ${clientName} — 30+ min since 15-min alert`,
          booking_id: booking.id,
          channel: 'sms',
          status: 'sent',
        })
        if (claimErr) {
          if (!claimErr.message.includes('duplicate key')) {
            errors.push(`Late check-out claim ${booking.id}: ${claimErr.message}`)
          }
          continue // lost the race, or the claim write itself failed -- either way, do not send
        }

        // SMS to team member
        if (teamLateOn && memberPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: memberPhone,
            body: smsLateCheckOutTeam(tenant.name, booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: smsLateCheckOutAdmin(tenant.name, booking as any),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          'Late Check-Out',
          `${memberName} — ${clientName} still on site`,
          '/dashboard/bookings'
        ).catch(() => {})

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
