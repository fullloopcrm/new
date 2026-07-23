import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // claim_job_atomic's daily-cap count compares p_day_start/p_day_end against
  // bookings.start_time, a naive ET wall-clock column. Postgres's session
  // TimeZone is UTC, so casting that naive column to timestamptz for the
  // comparison treats its digits AS UTC (verified: '...13:00:00'::timestamptz
  // => '13:00:00+00', not the real UTC instant of 1pm ET). A true UTC instant
  // for "ET midnight" would therefore NOT line up with how the column gets
  // compared — the boundary has to be the same naive ET digits with a bare
  // 'Z' appended, matching what Postgres already does to the column.
  const todayCal = etToday()
  const dayStart = `${formatNaiveET(todayCal)}Z`
  const dayEnd = `${formatNaiveET(addCalendarDays(todayCal, 1))}Z`

  // Atomic claim: the daily-cap count check and the claiming UPDATE run inside
  // one DB function that locks the member row first (migrations/2026_07_13_
  // job_claim_atomic.sql), so a concurrent claim can no longer read a stale
  // count and slip past the cap. The booking UPDATE itself still filters on
  // `team_member_id IS NULL`, so claiming one booking stays first-writer-wins.
  const { data, error } = await supabaseAdmin.rpc('claim_job_atomic', {
    p_tenant_id: auth.tid,
    p_member_id: auth.id,
    p_booking_id: booking_id,
    p_day_start: dayStart,
    p_day_end: dayEnd,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.claimed) {
    if (data?.reason === 'cap_reached') {
      return NextResponse.json({ error: `Daily job limit reached (${data.cap})` }, { status: 409 })
    }
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: data.booking })
}
