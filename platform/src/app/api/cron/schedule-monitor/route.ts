import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { guessZoneFromAddress, zoneRequiresCar } from '@/lib/service-zones'
import { calculateDistance, estimateTransitMinutes } from '@/lib/geo'

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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        .select('id, client_id, team_member_id, start_time, end_time, status, price, hourly_rate, clients(id, name, address), team_members(id, name, working_days, unavailable_dates, max_jobs_per_day, service_zones, has_car, home_by_time, home_latitude, home_longitude)')
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStr + 'T00:00:00')
        .lte('start_time', toDateStr(endDate) + 'T23:59:59')
        .in('status', ['scheduled', 'pending', 'confirmed'])
        .limit(500)

      if (!bookings || bookings.length === 0) continue

      const byDate: Record<string, typeof bookings> = {}
      for (const b of bookings) {
        const date = b.start_time.split('T')[0]
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(b)
      }

      for (const [date, dayBookings] of Object.entries(byDate)) {
        const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

        // Duplicate client
        const clientGroups: Record<string, typeof bookings> = {}
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
        const memberGroups: Record<string, typeof bookings> = {}
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
          } else if (member.working_days?.length > 0 && !member.working_days.includes(dayOfWeek)) {
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
