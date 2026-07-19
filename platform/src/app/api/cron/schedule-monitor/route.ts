import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'
import { calculateDistance, estimateTransitMinutes } from '@/lib/geo'
import { worksScheduledDay } from '@/lib/day-availability'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { nowNaiveET, etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'
import { applyDiscount, applyCredit } from '@/lib/discount'

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
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  // bookings.start_time is naive-ET (see lib/recurring's nowNaiveET header).
  // `new Date()` + getFullYear()/getMonth()/getDate() reads the SERVER's local
  // calendar (UTC on Vercel), not ET -- during the ET-evening/UTC-already-
  // tomorrow window (~8pm-midnight ET) that silently rolled todayStr to
  // tomorrow's date, excluding the rest of tonight's real bookings from the
  // 14-day monitored window (line below), from the no-show check's lower
  // bound, and incorrectly auto-resolving today's still-open issues as
  // "past-dated" at the stale-issue reconcile below. etToday() anchors on the
  // real ET calendar date instead.
  const todayCal = etToday()
  const todayStr = formatNaiveET(todayCal).slice(0, 10)
  const endDateStr = formatNaiveET(addCalendarDays(todayCal, 14)).slice(0, 10)
  let totalIssues = 0

  const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').eq('status', 'active').limit(1000)

  for (const tenant of tenants || []) {
    try {
      const issues: Issue[] = []
      const tenantId = tenant.id

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, start_time, end_time, status, price, hourly_rate, notes, recurring_type, actual_hours, discount_percent, one_time_credit_cents, clients(id, name, address), team_members!bookings_team_member_id_fkey(id, name, working_days, schedule, unavailable_dates, max_jobs_per_day, service_zones, has_car, home_by_time, home_latitude, home_longitude)')
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStr + 'T00:00:00')
        .lte('start_time', endDateStr + 'T23:59:59')
        .in('status', ['scheduled', 'pending', 'confirmed'])
        .limit(500)

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
        // start_time/end_time are naive-ET; dayAgoIso/nowT.toISOString() are
        // true-UTC and skew any comparison against those two columns by 4-5h
        // (see lib/recurring's nowNaiveET header) -- created_at is a real
        // timestamptz column and correctly keeps using dayAgoIso/nowT as-is.
        const nowNaive = nowNaiveET()
        const dayAgoNaive = nowNaiveET(-24 * 60 * 60 * 1000)

        // no_show — scheduled, past end_time, never checked in.
        const { data: noShows } = await supabaseAdmin
          .from('bookings')
          .select('id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId).eq('status', 'scheduled')
          .lte('end_time', nowNaive).gte('start_time', todayStr + 'T00:00:00').is('check_in_time', null)
        for (const b of noShows || []) {
          issues.push({ type: 'no_show', severity: 'critical', message: `${(b.team_members as { name?: string } | null)?.name || 'Unassigned'} never checked in for ${(b.clients as { name?: string } | null)?.name || 'client'} — job should be done by now`, booking_ids: [b.id], team_member_id: b.team_member_id || undefined, tenant_id: tenantId })
        }

        // stuck_pending — pending 24h+ and still scheduled in the future.
        const { data: stuck } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, clients(name)')
          .eq('tenant_id', tenantId).eq('status', 'pending').lt('created_at', dayAgoIso).gte('start_time', nowNaive)
        for (const b of stuck || []) {
          issues.push({ type: 'stuck_pending', severity: 'warning', message: `${(b.clients as { name?: string } | null)?.name || 'Client'} — pending 24h+, not yet scheduled`, booking_ids: [b.id], client_id: b.client_id || undefined, tenant_id: tenantId })
        }

        // payment_overdue — completed, unpaid, 24h+ after end.
        const { data: overdue } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, price, end_time, clients(name)')
          .eq('tenant_id', tenantId).eq('status', 'completed').neq('payment_status', 'paid').gt('price', 0).lte('end_time', dayAgoNaive)
        for (const b of overdue || []) {
          issues.push({ type: 'payment_overdue', severity: 'warning', message: `${(b.clients as { name?: string } | null)?.name || 'Client'} — $${(Number(b.price) / 100).toFixed(0)} unpaid (completed ${String(b.end_time).split('T')[0]})`, booking_ids: [b.id], client_id: b.client_id || undefined, tenant_id: tenantId })
        }

        // cleaner_unpaid — completed 48h+ ago, team member not paid.
        const twoDayNaive = nowNaiveET(-48 * 60 * 60 * 1000)
        const { data: unpaidCleaner } = await supabaseAdmin
          .from('bookings')
          .select('id, team_member_id, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId).eq('status', 'completed').gt('price', 0)
          .or('team_member_paid.is.null,team_member_paid.eq.false').lte('end_time', twoDayNaive)
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
              // Expected price still runs through this booking's own
              // discount_percent + one_time_credit_cents — otherwise a
              // one-off booking with an admin-set discount or comp
              // false-positives here every run (nycmaid a8efe43f parity).
              const bDiscount = (b as { discount_percent?: number | null }).discount_percent
              const bCredit = (b as { one_time_credit_cents?: number | null }).one_time_credit_cents
              const expected = applyCredit(applyDiscount(hrs * Number(b.hourly_rate) * 100, bDiscount), bCredit)
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
          // Re-check status still open/acknowledged AT WRITE TIME, not just at
          // the SELECT above -- PUT /api/admin/schedule-issues lets an admin
          // change a row's status (e.g. explicitly 'dismissed', a deliberate
          // "not a real issue" call distinct from an auto-resolve) at any
          // moment. Without this re-check in the UPDATE's own WHERE, a
          // dismissal landing in the gap between this SELECT and this UPDATE
          // got silently clobbered back to 'resolved'/resolved_by:'auto',
          // erasing the admin's explicit call with no error or signal. Same
          // compare-and-swap discipline as this session's cron/lifecycle and
          // cron/generate-recurring overwrite-race fixes.
          await supabaseAdmin.from('schedule_issues').update({ status: 'resolved', resolved_at: nowT.toISOString(), resolved_by: 'auto', resolution_note: 'Auto-resolved: no longer applies' }).in('id', staleIds).in('status', ['open', 'acknowledged']).then(() => {}, () => {})
        }
      }

      // Dedup + write. The pre-check above (existingMessages) only catches
      // the sequential case; idx_schedule_issues_tenant_message_open_unique
      // (migration 2026_07_17_schedule_issues_open_dedup_unique) is the
      // DB-level guard for a concurrent/overlapping invocation of this same
      // cron (maxDuration=300 looping every tenant is exactly the shape
      // Vercel retries on timeout) racing this tenant and both passing the
      // same empty existingMessages read before either insert lands. Treat a
      // duplicate-key hit as an idempotent no-op -- lost the race, not a
      // real failure -- same pattern as cron/comhub-email's 23505 handling.
      const { data: existing } = await supabaseAdmin.from('schedule_issues').select('message').eq('tenant_id', tenantId).in('status', ['open', 'acknowledged'])
      const existingMessages = new Set((existing || []).map(i => i.message))
      const newIssues = issues.filter(i => !existingMessages.has(i.message))

      let insertedForTenant = 0
      for (const issue of newIssues) {
        const { error: insertErr } = await supabaseAdmin.from('schedule_issues').insert({
          tenant_id: tenantId, type: issue.type, severity: issue.severity, message: issue.message,
          booking_id: issue.booking_ids[0] || null, booking_ids: issue.booking_ids,
          team_member_id: issue.team_member_id || null, client_id: issue.client_id || null,
          date: issue.date || null, status: 'open',
        })
        if (insertErr) {
          if (insertErr.code !== '23505') {
            console.error(`[schedule-monitor] insert failed for tenant=${tenantId}:`, insertErr.message)
          }
          continue // duplicate-key = lost the race to a concurrent/overlapping invocation
        }
        insertedForTenant++
      }
      totalIssues += insertedForTenant
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
