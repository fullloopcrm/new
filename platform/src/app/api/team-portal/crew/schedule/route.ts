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

  const now = new Date()
  const end = new Date(now); end.setDate(end.getDate() + 14)

  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('id, start_time, end_time, status, service_type, team_member_id, team_members!bookings_team_member_id_fkey(name), clients(name, address)')
    .in('team_member_id', scope)
    .gte('start_time', now.toISOString())
    .lt('start_time', end.toISOString())
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
