import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import { notify } from '@/lib/notify'
import { sendPushToTenantAdmins } from '@/lib/push'
import { trackError } from '@/lib/error-tracking'
import { getTerminatedTeamMemberIds } from '@/lib/hr'
import {
  smsLateCheckInTeam,
  smsLateCheckInAdmin,
  smsLateCheckOutTeam,
  smsLateCheckOutAdmin,
} from '@/lib/sms-templates'
import { safeEqual } from '@/lib/timing-safe-equal'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    .select('id, name, telnyx_api_key, telnyx_phone, sms_number, owner_phone, phone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    const smsCreds = resolveTenantSmsCredentials(tenant)
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
        .select('id, start_time, team_member_id, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone, sms_consent)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed'])
        .lte('start_time', tenMinAgo.toISOString())
        .gte('start_time', todayStart.toISOString())
        .is('check_in_time', null)
        .limit(100)

      // Booking assignment survives HR termination — without this check a
      // terminated team member still gets texted about their own late
      // check-in on a job they no longer work. Same guard class as the
      // reminders/daily-summary/confirmations cron fixes; batched once per
      // pass.
      const lateCheckInTeamMemberIds = Array.from(new Set((lateBookings || []).map(b => b.team_member_id).filter((x): x is string => !!x)))
      const lateCheckInTerminatedIds = lateCheckInTeamMemberIds.length > 0
        ? new Set(await getTerminatedTeamMemberIds(tenantId, lateCheckInTeamMemberIds))
        : new Set<string>()

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
        const memberSmsConsent = (booking.team_members as any)?.sms_consent
        const isTerminatedAssignee = !!booking.team_member_id && lateCheckInTerminatedIds.has(booking.team_member_id)

        // SMS to team member — skip a terminated assignee, plus sms_consent
        // (team_members.sms_consent is a real, crew-editable column; this
        // send fired unconditionally regardless of it before this fix).
        if (teamLateOn && !isTerminatedAssignee && memberPhone && memberSmsConsent !== false && smsCreds.apiKey && smsCreds.phone) {
          sendSMS({
            to: memberPhone,
            body: smsLateCheckInTeam(tenant.name, booking as any),
            telnyxApiKey: smsCreds.apiKey,
            telnyxPhone: smsCreds.phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && smsCreds.apiKey && smsCreds.phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: smsLateCheckInAdmin(tenant.name, booking as any),
            telnyxApiKey: smsCreds.apiKey,
            telnyxPhone: smsCreds.phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          'Late Check-In',
          `${memberName} — ${clientName} at ${time}`,
          '/dashboard/bookings'
        ).catch(() => {})

        // In-app notification (also serves as dedup record)
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_in',
          title: 'Late Check-In',
          message: `${memberName} hasn't checked in for ${clientName} (${time})`,
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
        .select('id, start_time, team_member_id, fifteen_min_alert_time, clients(name, phone), team_members!bookings_team_member_id_fkey(name, phone, sms_consent)')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_progress')
        .not('fifteen_min_alert_time', 'is', null)
        .lte('fifteen_min_alert_time', thirtyMinAgo.toISOString())
        .is('check_out_time', null)
        .limit(100)

      // Same terminated-assignee guard as the check-in pass above, batched
      // once per pass.
      const lateCheckOutTeamMemberIds = Array.from(new Set((lateCheckouts || []).map(b => b.team_member_id).filter((x): x is string => !!x)))
      const lateCheckOutTerminatedIds = lateCheckOutTeamMemberIds.length > 0
        ? new Set(await getTerminatedTeamMemberIds(tenantId, lateCheckOutTeamMemberIds))
        : new Set<string>()

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
        const memberSmsConsent = (booking.team_members as any)?.sms_consent
        const isTerminatedAssignee = !!booking.team_member_id && lateCheckOutTerminatedIds.has(booking.team_member_id)

        // SMS to team member — skip a terminated assignee, plus sms_consent
        // (team_members.sms_consent is a real, crew-editable column; this
        // send fired unconditionally regardless of it before this fix).
        if (teamLateOn && !isTerminatedAssignee && memberPhone && memberSmsConsent !== false && smsCreds.apiKey && smsCreds.phone) {
          sendSMS({
            to: memberPhone,
            body: smsLateCheckOutTeam(tenant.name, booking as any),
            telnyxApiKey: smsCreds.apiKey,
            telnyxPhone: smsCreds.phone,
          }).catch(() => {})
        }

        // SMS to admin
        const adminPhone = tenant.owner_phone || tenant.phone
        if (ownerLateOn && adminPhone && smsCreds.apiKey && smsCreds.phone) {
          sendSMS({
            to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
            body: smsLateCheckOutAdmin(tenant.name, booking as any),
            telnyxApiKey: smsCreds.apiKey,
            telnyxPhone: smsCreds.phone,
          }).catch(() => {})
        }

        // Push to admins
        sendPushToTenantAdmins(
          tenantId,
          'Late Check-Out',
          `${memberName} — ${clientName} still on site`,
          '/dashboard/bookings'
        ).catch(() => {})

        // In-app notification (dedup record)
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'late_check_out',
          title: 'Late Check-Out',
          message: `${memberName} hasn't checked out for ${clientName} — 30+ min since 15-min alert`,
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
