import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { toNaiveET } from '@/lib/dates'

// Crew earnings roll-up — the most sensitive portal permission (pay visibility).
// Gated on earnings.view_crew, which defaults ON only for manager. Scoped to the
// actor's pod. Sums completed-job pay per member over the trailing 30 days.
export async function GET(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'earnings.view_crew')
  if (permError) return permError

  const scope = await scopedMemberIds(auth)
  if (scope.length === 0) return NextResponse.json({ members: [] })

  const since = new Date(); since.setDate(since.getDate() - 30)

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
      // status='completed' only would silently drop a job the instant POST
      // /api/finance/payroll (bulk payroll) claims it (flips status straight
      // to 'paid') -- a crew lead's earnings roll-up going blind on real,
      // recently-worked jobs the moment payroll runs, same blind spot
      // already fixed on finance/summary, ar-aging, pending, and
      // cleaner-income this session. No paid/unpaid split here (this is a
      // gross trailing-30-day earnings figure), so no team_member_paid trap
      // to guard against -- just widen the status filter.
      .in('status', ['completed', 'paid'])
      // bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
      // in. since.toISOString() is a true-UTC clock reading; string-compared
      // against the naive-ET column that shifts the 30-day cutoff by the
      // EST/EDT offset, silently dropping real worked jobs from the trailing
      // window near the boundary (same class already fixed on the sibling
      // crew/schedule route). Use the naive-ET wall-clock equivalent instead.
      .gte('start_time', toNaiveET(since)),
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
