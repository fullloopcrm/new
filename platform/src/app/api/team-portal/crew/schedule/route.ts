import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { nowNaiveET } from '@/lib/recurring'

// The crew's upcoming schedule — scoped to the actor's pod (or all, for manager).
// Gated on schedule.view_crew, so a tenant can restrict crew visibility.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'schedule.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ jobs: [] })

  // start_time is naive-ET; a true-UTC "now"/"+14d" here would skew both
  // edges of this window by 4-5h (see lib/recurring's nowNaiveET header).
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, status, service_type, team_member_id, team_members!bookings_team_member_id_fkey(name), clients(name, address)')
    .eq('tenant_id', auth.tid)
    .in('team_member_id', scope)
    .gte('start_time', nowNaiveET())
    .lt('start_time', nowNaiveET(14 * 24 * 60 * 60 * 1000))
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
