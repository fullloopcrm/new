import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { nowNaiveET, addCalendarDays, etToday, formatNaiveET } from '@/lib/recurring'

// The crew's upcoming schedule — scoped to the actor's pod (or all, for manager).
// Gated on schedule.view_crew, so a tenant can restrict crew visibility.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'schedule.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ jobs: [] })

  // start_time is a naive ET wall-clock column — a real-instant boundary here
  // hid this-morning jobs from the crew view for hours after they'd actually
  // started (same bug as cron/no-show-check).
  const nowNaiveBound = `${nowNaiveET()}Z`
  const endNaiveBound = `${formatNaiveET(addCalendarDays(etToday(), 14))}Z`

  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, start_time, end_time, status, service_type, team_member_id, team_members!bookings_team_member_id_fkey(name), clients(name, address)')
    .in('team_member_id', scope)
    .gte('start_time', nowNaiveBound)
    .lt('start_time', endNaiveBound)
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
