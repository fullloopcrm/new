import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { naiveETDayRange } from '@/lib/dates'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Member's pay rate + daily cap.
  const { data: member } = await tenantDb(auth.tid)
    .from('team_members')
    .select('pay_rate, max_jobs_per_day')
    .eq('id', auth.id)
    .single()

  // Enforce the daily claim cap (hoarding guard) — jobs already assigned to this
  // member that start today.
  const cap = member?.max_jobs_per_day
  if (cap && cap > 0) {
    // bookings.start_time is naive-ET (no tz). `new Date().setHours(0,0,0,0)`
    // read the SERVER's local calendar (UTC on Vercel), which runs a full
    // calendar day ahead of ET for ~4-5h every evening (8pm-midnight ET) --
    // during that window the cap window silently shifted to tomorrow's ET
    // date, letting a member blow past today's cap (or get blocked on
    // tomorrow's count while claiming a same-day job).
    const { start: dayStart, end: dayEnd } = naiveETDayRange(new Date(), 0)
    const { count } = await tenantDb(auth.tid)
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('team_member_id', auth.id)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .not('status', 'eq', 'cancelled')
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: `Daily job limit reached (${cap})` }, { status: 409 })
    }
  }

  // A job broadcast with its own "Team Pay Rate" (e.g. an urgent-job premium
  // set at creation) already has booking.pay_rate populated — preserve it
  // rather than clobbering it with the claimant's own default rate, or the
  // whole point of offering a premium to entice a claim is lost the instant
  // someone claims it. Only unassigned jobs with no rate of their own fall
  // back to the claiming member's rate.
  const { data: existingBooking } = await tenantDb(auth.tid)
    .from('bookings')
    .select('pay_rate')
    .eq('id', booking_id)
    .single()

  // Atomic claim: the `team_member_id IS NULL` filter on the UPDATE makes this
  // first-writer-wins — a concurrent claim updates zero rows → "already taken".
  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .update({
      team_member_id: auth.id,
      pay_rate: existingBooking?.pay_rate ?? member?.pay_rate ?? null,
      status: 'confirmed',
    })
    .eq('id', booking_id)
    .is('team_member_id', null)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
