import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'

// The roster this member is allowed to see (their pod / all for manager).
// Powers the reassign picker. Gated on team.view_roster.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'team.view_roster')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ members: [] })

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('id, name')
    .eq('tenant_id', auth.tid)
    .in('id', scope)
    .eq('status', 'active')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}
