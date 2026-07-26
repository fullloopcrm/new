import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { nowNaiveET } from '@/lib/recurring'

// Crew earnings roll-up — the most sensitive portal permission (pay visibility).
// Gated on earnings.view_crew, which defaults ON only for manager. Scoped to the
// actor's pod. Sums completed-job pay per member over the trailing 30 days.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'earnings.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ members: [] })

  // bookings.start_time is a naive ET wall-clock column (see earnings/route.ts's
  // comment on the identical bug in cron/no-show-check) — a real
  // `new Date().toISOString()` boundary compares real UTC digits against those
  // naive ET digits, shifting the 30-day cutoff by the ET/UTC offset. Use the
  // naive-ET string convention instead so the boundary lines up with the column.
  const sinceNaiveET = `${nowNaiveET(-30 * 24 * 3600 * 1000)}Z`

  // Round worked hours to the nearest half hour, matching the individual
  // earnings endpoint so crew totals reconcile with each member's own view.
  const roundToHalfHour = (h: number) => Math.round(h * 2) / 2

  const db = tenantDb(auth.tid)
  const [{ data: members }, { data: jobs }] = await Promise.all([
    db
      .from('team_members')
      .select('id, name, pay_rate')
      .in('id', scope),
    db
      .from('bookings')
      .select('team_member_id, pay_rate, start_time, end_time, check_in_time, check_out_time, status')
      .in('team_member_id', scope)
      .eq('status', 'completed')
      .gte('start_time', sinceNaiveET),
  ])

  // Per-member hourly fallback (dollars/hour). booking.pay_rate overrides it.
  const rateFor = new Map<string, number>()
  for (const m of members || []) rateFor.set(m.id, Number(m.pay_rate) || 25)

  // Earnings = worked hours × hourly rate (NOT a per-job total). Prefer
  // check-in/out span; fall back to scheduled start→end.
  const totals = new Map<string, { jobs: number; earnings: number }>()
  for (const j of jobs || []) {
    if (!j.team_member_id) continue
    const startMs = new Date(j.check_in_time || j.start_time).getTime()
    const endRaw = j.check_out_time || j.end_time
    const hours = endRaw ? roundToHalfHour((new Date(endRaw).getTime() - startMs) / 3_600_000) : 0
    const rate = Number(j.pay_rate) || rateFor.get(j.team_member_id) || 25
    const prev = totals.get(j.team_member_id) || { jobs: 0, earnings: 0 }
    prev.jobs += 1
    prev.earnings += Math.max(0, hours) * rate
    totals.set(j.team_member_id, prev)
  }

  const result = (members || []).map((m) => ({
    id: m.id,
    name: m.name,
    jobs: totals.get(m.id)?.jobs ?? 0,
    earnings: Math.round(totals.get(m.id)?.earnings ?? 0), // whole dollars
  }))

  return NextResponse.json({ members: result, window_days: 30 })
}
