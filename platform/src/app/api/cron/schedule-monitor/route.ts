import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'
import { calculateDistance, estimateTransitMinutes } from '@/lib/geo'
import { worksScheduledDay } from '@/lib/day-availability'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { safeEqual } from '@/lib/timing-safe-equal'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

export const maxDuration = 300

interface Issue {
  type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  booking_id?: string
  booking_ids: string[]
  team_member_id?: string
  client_id?: string
  date?: string
  tenant_id: string
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const endDate = new Date(now); endDate.setDate(endDate.getDate() + 14)
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const todayStr = toDateStr(now)
  let totalIssues = 0

  const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').eq('status', 'active').limit(1000)

  for (const tenant of tenants || []) {
    try {
      const issues: Issue[] = []
      const tenantId = tenant.id

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, start_time, end_time, status, price, hourly_rate, notes, recurring_type, actual_hours, clients(id, name, address), team_members!bookings_team_member_id_fkey(id, name, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car, home_by_time, home_latitude, home_longitude)')
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStr + 'T00:00:00')
        .lte('start_time', toDateStr(endDate) + 'T23:59:59')
        .in('status', ['scheduled', 'pending', 'confirmed'])
        .limit(500)

      // A terminated employee's existing future bookings are never touched by
      // the HR termination action (it only writes hr_status) and team-portal
      // login is already blocked for them (team-portal-auth.ts), so without
      // this check the job silently has nobody who can show up for it while
      // still reading as "assigned" everywhere else on the dashboard.
      const assignedMemberIds = [...new Set((bookings ?? []).map((b) => b.team_member_id).filter((id): id is string => !!id))]
      const terminatedIds = new Set(await getTerminatedTeamMemberIds(tenantId, assignedMemberIds))

      // Sold-but-unscheduled: a converted service sale lands as a 'pending'
      // booking on a placeholder slot (bookings.start_time is NOT NULL, so it
      // can't be dateless) — the owner must confirm the real date. Surface every
      // pending booking so it doesn't rot on a placeholder date.
      const { data: pendingBk } = await supabaseAdmin
        .from('bookings')
        .select('id, clients(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .limit(200)
      for (const b of pendingBk || []) {
        const name = (b.clients as any)?.name || 'Client'
        issues.push({
          type: 'unscheduled_sale',
          severity: 'warning',
          message: `Sold: ${name} (#${String(b.id).slice(0, 8)}) — confirm the date`,
          booking_ids: [b.id],
          tenant_id: tenantId,
        })
      }

      const byDate: Record<string, NonNullable<typeof bookings>> = {}
      for (const b of bookings || []) {
        const date = b.start_time.split('T')[0]
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(b)
      }

      for (const [date, dayBookings] of Object.entries(byDate)) {
        const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

        // Duplicate client
        const clientGroups: Record<string, NonNullable<typeof bookings>> = {}
        for (const b of dayBookings) {
          if (!b.client_id) continue
          if (!clientGroups[b.client_id]) clientGroups[b.client_id] = []
          clientGroups[b.client_id].push(b)
        }
        for (const [, group] of Object.entries(clientGroups)) {
          if (group.length > 1) {
            issues.push({ type: 'duplicate_client', severity: 'critical', message: `${(group[0].clients as any)?.name} double-booked on ${date}`, booking_ids: group.map(b => b.id), tenant_id: tenantId, date })
          }
        }

        // Per-team-member checks
        const memberGroups: Record<string, NonNullable<typeof bookings>> = {}
        for (const b of dayBookings) {
          if (!b.team_member_id) continue
          if (!memberGroups[b.team_member_id]) memberGroups[b.team_member_id] = []
          memberGroups[b.team_member_id].push(b)
        }

        for (const [memberId, mBookings] of Object.entries(memberGroups)) {
          const sorted = mBookings.sort((a, b) => a.start_time.localeCompare(b.start_time))
          const member = sorted[0].team_members as any
          if (!member) continue

          // Time conflicts
          for (let i = 0; i < sorted.length - 1; i++) {
            if (toMin(sorted[i].end_time) > toMin(sorted[i + 1].start_time)) {
              issues.push({ type: 'time_conflict', severity: 'critical', message: `${member.name} has overlapping jobs on ${date}`, booking_ids: [sorted[i].id, sorted[i + 1].id], team_member_id: memberId, tenant_id: tenantId, date })
            }
          }

          // Over max jobs
          if (member.max_jobs_per_day && mBookings.length > member.max_jobs_per_day) {
            issues.push({ type: 'over_max_jobs', severity: 'warning', message: `${member.name} has ${mBookings.length} jobs on ${date} (max ${member.max_jobs_per_day})`, booking_ids: mBookings.map(b => b.id), team_member_id: memberId, tenant_id: tenantId, date })
          }

          // Home-by risk
          if (member.home_by_time && member.home_latitude && member.home_longitude) {
            const lastJob = sorted[sorted.length - 1]
            const lastEndMin = toMin(lastJob.end_time)
            const [hbH, hbM] = member.home_by_time.split(':').map(Number)
            const homeByMin = hbH * 60 + hbM
            const lastClient = lastJob.clients as any
            let travelHome = 30
            if (lastClient?.latitude && lastClient?.longitude) {
              travelHome = estimateTransitMinutes(calculateDistance(Number(lastClient.latitude), Number(lastClient.longitude), Number(member.home_latitude), Number(member.home_longitude)))
            }
            if (lastEndMin + travelHome > homeByMin) {
              issues.push({ type: 'home_by_risk', severity: 'warning', message: `${member.name} won't make home by ${member.home_by_time} on ${date}`, booking_ids: [lastJob.id], team_member_id: memberId, tenant_id: tenantId, date })
            }
          }
        }

        // Per-booking checks
        for (const b of dayBookings) {
          const member = b.team_members as any
          const client = b.clients as any

          if (!b.team_member_id) {
            issues.push({ type: 'unassigned', severity: 'warning', message: `${client?.name || 'Client'} on ${date} — no team member assigned`, booking_ids: [b.id], tenant_id: tenantId, date })
            continue
          }
          if (!member) continue

          // Terminated but still assigned — checked ahead of day_off since it's
          // the more specific/urgent condition (the member can never come back
          // to this booking, vs. day_off which is a scheduling conflict).
          if (terminatedIds.has(b.team_member_id)) {
            issues.push({ type: 'terminated_assigned', severity: 'critical', message: `${member.name} was let go but is still booked for ${client?.name || 'a client'} on ${date}`, booking_ids: [b.id], team_member_id: b.team_member_id, tenant_id: tenantId, date })
            continue
          }

          // Day off
          if (member.unavailable_dates?.includes(date)) {
            issues.push({ type: 'day_off', severity: 'critical', message: `${member.name} marked unavailable on ${date} but booked for ${client?.name}`, booking_ids: [b.id], team_member_id: b.team_member_id, tenant_id: tenantId, date })
          } else if (
            // Only flag when availability IS configured but this date isn't in it —
            // don't flag members who simply haven't set a schedule yet. Canonical
            // resolver handles numeric ("0") + name ("Sun") formats, so numeric-format
            // members are no longer falsely flagged "doesn't work".
            ((member.working_days?.length || 0) > 0 || (member.schedule && Object.keys(member.schedule).length > 0)) &&
            !worksScheduledDay(member.working_days, member.schedule, date)
          ) {
            issues.push({ type: 'day_off', severity: 'critical', message: `${member.name} doesn't work ${dayOfWeek}s — booked for ${client?.name} on ${date}`, booking_ids: [b.id], team_member_id: b.team_member_id, tenant_id: tenantId, date })
          }

          // Zone mismatch
          if (member.service_zones?.length > 0 && client?.address) {
            const jobZone = guessZoneFromAddress(client.address)
            if (jobZone && !member.service_zones.includes(jobZone)) {
              issues.push({ type: 'zone_mismatch', severity: 'info', message: `${member.name} → ${client.name} on ${date} outside zone`, booking_ids: [b.id], team_member_id: b.team_member_id, tenant_id: tenantId, date })
            }
            if (jobZone && zoneRequiresCar(jobZone) && !member.has_car) {
              issues.push({ type: 'no_car', severity: 'critical', message: `${member.name} assigned to ${client.name} — area requires car`, booking_ids: [b.id], team_member_id: b.team_member_id, tenant_id: tenantId, date })
            }
          }
        }
      }

      // NYC Maid parity (tenant-scoped): extra standalone checks + self-healing
      // reconcile so the panel stays TRUE (issues clear when the condition does).
      if (isNycMaid(tenantId)) {
        const nowT = new Date()
        const dayAgoIso = new Date(nowT.getTime() - 24 * 60 * 60 * 1000).toISOString()

        // no_show — scheduled, past end_time, never checked in.
        const { data: noShows } = await supabaseAdmin
          .from('bookings')
          .select('id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId).eq('status', 'scheduled')
          .lte('end_time', nowT.toISOString()).gte('start_time', todayStr + 'T00:00:00').is('check_in_time', null)
        for (const b of noShows || []) {
          issues.push({ type: 'no_show', severity: 'critical', message: `${(b.team_members as { name?: string } | null)?.name || 'Unassigned'} never checked in for ${(b.clients as { name?: string } | null)?.name || 'client'} — job should be done by now`, booking_ids: [b.id], team_member_id: b.team_member_id || undefined, tenant_id: tenantId })
        }

        // stuck_pending — pending 24h+ and still scheduled in the future.
        const { data: stuck } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, clients(name)')
          .eq('tenant_id', tenantId).eq('status', 'pending').lt('created_at', dayAgoIso).gte('start_time', nowT.toISOString())
        for (const b of stuck || []) {
          issues.push({ type: 'stuck_pending', severity: 'warning', message: `${(b.clients as { name?: string } | null)?.name || 'Client'} — pending 24h+, not yet scheduled`, booking_ids: [b.id], client_id: b.client_id || undefined, tenant_id: tenantId })
        }

        // payment_overdue — completed, unpaid, 24h+ after end.
        const { data: overdue } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, price, end_time, clients(name)')
          .eq('tenant_id', tenantId).eq('status', 'completed').neq('payment_status', 'paid').gt('price', 0).lte('end_time', dayAgoIso)
        for (const b of overdue || []) {
          issues.push({ type: 'payment_overdue', severity: 'warning', message: `${(b.clients as { name?: string } | null)?.name || 'Client'} — $${(Number(b.price) / 100).toFixed(0)} unpaid (completed ${String(b.end_time).split('T')[0]})`, booking_ids: [b.id], client_id: b.client_id || undefined, tenant_id: tenantId })
        }

        // cleaner_unpaid — completed 48h+ ago, team member not paid.
        const twoDayIso = new Date(nowT.getTime() - 48 * 60 * 60 * 1000).toISOString()
        const { data: unpaidCleaner } = await supabaseAdmin
          .from('bookings')
          .select('id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId).eq('status', 'completed').gt('price', 0)
          .or('team_member_paid.is.null,team_member_paid.eq.false').lte('end_time', twoDayIso)
        for (const b of unpaidCleaner || []) {
          issues.push({ type: 'cleaner_unpaid', severity: 'warning', message: `${(b.team_members as { name?: string } | null)?.name || 'Team member'} not paid for ${(b.clients as { name?: string } | null)?.name || 'client'}`, booking_ids: [b.id], team_member_id: b.team_member_id || undefined, tenant_id: tenantId })
        }

        // tight_buffer + price_mismatch (reuse byDate computed above).
        const BUFFER_MIN = 60
        for (const [date, dayBk] of Object.entries(byDate)) {
          const byMember: Record<string, typeof dayBk> = {}
          for (const b of dayBk) { if (!b.team_member_id) continue; (byMember[b.team_member_id] ||= []).push(b) }
          for (const [mid, mb] of Object.entries(byMember)) {
            const sorted = mb.sort((a, b) => a.start_time.localeCompare(b.start_time))
            const nm = (sorted[0].team_members as { name?: string } | null)?.name || 'Team member'
            for (let i = 0; i < sorted.length - 1; i++) {
              const gap = toMin(sorted[i + 1].start_time) - toMin(sorted[i].end_time)
              if (gap > 0 && gap < BUFFER_MIN) {
                issues.push({ type: 'tight_buffer', severity: 'warning', message: `${nm} has only ${gap}min between jobs on ${date} (need ${BUFFER_MIN}min)`, booking_ids: [sorted[i].id, sorted[i + 1].id], team_member_id: mid, tenant_id: tenantId, date })
              }
            }
          }
          for (const b of dayBk) {
            const bn = (b as { notes?: string | null }).notes
            const hasPromo = typeof bn === 'string' && /\[Promo:|self-booking|discount|promo/i.test(bn)
            const isRec = !!(b as { recurring_type?: string | null }).recurring_type
            const hasActual = (b as { actual_hours?: number | null }).actual_hours != null && Number((b as { actual_hours?: number | null }).actual_hours) > 0
            if (b.hourly_rate && b.price && !hasPromo && !isRec && !hasActual) {
              const hrs = (toMin(b.end_time) - toMin(b.start_time)) / 60
              const expected = hrs * Number(b.hourly_rate) * 100
              if (Math.abs(Number(b.price) - expected) > 1000 && Number(b.price) > 0) {
                issues.push({ type: 'price_mismatch', severity: 'info', message: `${(b.clients as { name?: string } | null)?.name || 'Client'} on ${date} — price $${(Number(b.price) / 100).toFixed(0)} ≠ ${hrs}hrs × $${b.hourly_rate}/hr`, booking_ids: [b.id], tenant_id: tenantId, date })
              }
            }
          }
        }

        // Self-healing reconcile — resolve open issues that are past-dated or no
        // longer in the freshly-computed set (condition cleared).
        const validMessages = new Set(issues.map((i) => i.message))
        const { data: openIssues } = await supabaseAdmin.from('schedule_issues').select('id, message, date').eq('tenant_id', tenantId).in('status', ['open', 'acknowledged'])
        const staleIds = (openIssues || []).filter((i) => (i.date && i.date < todayStr) || !validMessages.has(i.message)).map((i) => i.id)
        if (staleIds.length) {
          await supabaseAdmin.from('schedule_issues').update({ status: 'resolved', resolved_at: nowT.toISOString(), resolved_by: 'auto', resolution_note: 'Auto-resolved: no longer applies' }).in('id', staleIds).then(() => {}, () => {})
        }
      }

      // Dedup + write
      const { data: existing } = await supabaseAdmin.from('schedule_issues').select('message').eq('tenant_id', tenantId).in('status', ['open', 'acknowledged'])
      const existingMessages = new Set((existing || []).map(i => i.message))
      const newIssues = issues.filter(i => !existingMessages.has(i.message))

      for (const issue of newIssues) {
        await supabaseAdmin.from('schedule_issues').insert({
          tenant_id: tenantId, type: issue.type, severity: issue.severity, message: issue.message,
          booking_id: issue.booking_ids[0] || null, booking_ids: issue.booking_ids,
          team_member_id: issue.team_member_id || null, client_id: issue.client_id || null,
          date: issue.date || null, status: 'open',
        })
      }
      totalIssues += newIssues.length
    } catch (err) {
      console.error(`Schedule monitor error for ${tenant.name}:`, err)
    }
  }

  return NextResponse.json({ success: true, tenants: tenants?.length || 0, new_issues: totalIssues })
}

function toMin(timeStr: string): number {
  const [, t] = timeStr.split('T')
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}
