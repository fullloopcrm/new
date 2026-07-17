import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'

// The crew's upcoming schedule — scoped to the actor's pod (or all, for manager).
// Gated on schedule.view_crew, so a tenant can restrict crew visibility.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'schedule.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ jobs: [] })

  // bookings.start_time is stored naive-local (no tz, literally what the operator
  // typed in — ET for the vast majority of tenants). Comparing it against a true-UTC
  // now.toISOString() silently drops jobs starting in the next ~4-5h ET evening
  // window every day (UTC clock reads hours ahead of ET). Format "now"/"end" as
  // naive ET wall-clock strings instead so the range matches what's actually stored.
  const now = new Date()
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const nowET = now.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T')
  const endET = end.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T')

  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, start_time, end_time, status, service_type, team_member_id, team_members!bookings_team_member_id_fkey(name), clients(name, address)')
    .in('team_member_id', scope)
    .gte('start_time', nowET)
    .lt('start_time', endET)
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
