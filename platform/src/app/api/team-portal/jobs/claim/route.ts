import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { shiftNaiveTimestamp } from '@/lib/cleaner-availability'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const db = tenantDb(auth.tid)

  // Member's default pay rate (fallback when the booking has none set — see
  // the pay_rate merge below). The daily cap itself is now enforced inside
  // claim_open_job(), not read here — see that RPC for why.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await db
    .from('team_members')
    .select('pay_rate')
    .eq('id', auth.id)
    .single()) as { data: { pay_rate: number | null } | null }

  // Time-conflict guard — the open pool (GET .../jobs?available=true) lists
  // every unassigned job with no per-viewer filtering, and until this check
  // existed nothing stopped a member from self-claiming two overlapping jobs
  // (only the daily cap was enforced). Mirrors the buffer-aware
  // conflict check /api/bookings' POST already applies to admin/agent-created
  // assignments, so a self-service claim can't create a double-booking that a
  // manual assignment would be blocked from creating.
  const { data: target } = (await db
    .from('bookings')
    .select('start_time, end_time, pay_rate')
    .eq('id', booking_id)
    .single()) as { data: { start_time: string | null; end_time: string | null; pay_rate: number | null } | null }
  if (!target?.start_time) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const settings = await getSettings(auth.tid)
  const bufferMin = Math.max(0, settings.booking_buffer_minutes)
  const endTime = target.end_time || shiftNaiveTimestamp(target.start_time, 180)
  const startWithBuffer = shiftNaiveTimestamp(target.start_time, -bufferMin)
  const endWithBuffer = shiftNaiveTimestamp(endTime, bufferMin)

  const { count: conflictCount } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('team_member_id', auth.id)
    .neq('id', booking_id)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('start_time', endWithBuffer)
    .gt('end_time', startWithBuffer)
  if ((conflictCount ?? 0) > 0) {
    return NextResponse.json({ error: 'You already have a job that overlaps this time' }, { status: 409 })
  }

  // Atomic claim + daily-cap check, both inside one DB transaction
  // (claim_open_job / 2026_07_18_claim_open_job_atomic.sql). The
  // `team_member_id IS NULL` filter makes the claim itself first-writer-wins
  // (a concurrent claim updates zero rows → "already taken"); the cap check
  // runs under a row lock on this member so two near-simultaneous claims for
  // two DIFFERENT open bookings by the SAME member can't both read the same
  // pre-claim count and both land under the cap.
  //
  // pay_rate: only fill in the claiming member's own default when the booking
  // doesn't already carry a per-job rate. A job open for self-claim can already
  // have one set — an admin-set premium on an emergency broadcast
  // (`/api/bookings/broadcast` advertises exactly `booking.pay_rate` as the
  // "$X/hr, first to claim gets it" promise), or a previous holder's rate
  // surviving a release back to the pool (`.../jobs/release` never touches
  // pay_rate). Unconditionally overwriting it with `member.pay_rate` here
  // silently broke that promise — payroll (`finance/payroll/route.ts`)
  // already treats `booking.pay_rate` as authoritative over the member's
  // default (`b.pay_rate || member.pay_rate`), so once claimed the row's
  // premium was gone and the member who answered the broadcast got paid
  // their own standard rate at payout time instead. (The RPC re-applies this
  // same COALESCE server-side, so it holds regardless of the caller's view of
  // target.pay_rate.)
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)

  const { data, error } = await supabaseAdmin.rpc('claim_open_job', {
    p_booking_id: booking_id,
    p_tenant_id: auth.tid,
    p_member_id: auth.id,
    p_default_pay_rate: member?.pay_rate ?? null,
    p_day_start: dayStart.toISOString(),
    p_day_end: dayEnd.toISOString(),
  })

  if (error) {
    if (error.message?.startsWith('DAILY_CAP_REACHED: ')) {
      return NextResponse.json({ error: error.message.slice('DAILY_CAP_REACHED: '.length) }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const claimed = Array.isArray(data) ? data[0] : data
  if (!claimed) {
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: claimed })
}
