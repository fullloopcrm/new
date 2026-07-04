import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'

// Crew earnings roll-up — the most sensitive portal permission (pay visibility).
// Gated on earnings.view_crew, which defaults ON only for manager. Scoped to the
// actor's pod. Sums completed-job pay per member over the trailing 30 days.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'earnings.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ members: [] })

  const since = new Date(); since.setDate(since.getDate() - 30)

  const [{ data: members }, { data: jobs }] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select('id, name')
      .eq('tenant_id', auth.tid)
      .in('id', scope),
    supabaseAdmin
      .from('bookings')
      .select('team_member_id, pay_rate, price, status, start_time')
      .eq('tenant_id', auth.tid)
      .in('team_member_id', scope)
      .eq('status', 'completed')
      .gte('start_time', since.toISOString()),
  ])

  const totals = new Map<string, { jobs: number; earnings: number }>()
  for (const j of jobs || []) {
    if (!j.team_member_id) continue
    const prev = totals.get(j.team_member_id) || { jobs: 0, earnings: 0 }
    prev.jobs += 1
    prev.earnings += Number(j.pay_rate ?? j.price ?? 0)
    totals.set(j.team_member_id, prev)
  }

  const result = (members || []).map((m) => ({
    id: m.id,
    name: m.name,
    jobs: totals.get(m.id)?.jobs ?? 0,
    earnings: totals.get(m.id)?.earnings ?? 0,
  }))

  return NextResponse.json({ members: result, window_days: 30 })
}
