import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
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

  // Member's pay rate + daily cap.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await db
    .from('team_members')
    .select('pay_rate, max_jobs_per_day')
    .eq('id', auth.id)
    .single()) as { data: { pay_rate: number | null; max_jobs_per_day: number | null } | null }

  // Enforce the daily claim cap (hoarding guard) — jobs already assigned to this
  // member that start today.
  const cap = member?.max_jobs_per_day
  if (cap && cap > 0) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
    const { count } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('team_member_id', auth.id)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .not('status', 'eq', 'cancelled')
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: `Daily job limit reached (${cap})` }, { status: 409 })
    }
  }

  // Time-conflict guard — the open pool (GET .../jobs?available=true) lists
  // every unassigned job with no per-viewer filtering, and until this check
  // existed nothing stopped a member from self-claiming two overlapping jobs
  // (only the daily COUNT cap above was enforced). Mirrors the buffer-aware
  // conflict check /api/bookings' POST already applies to admin/agent-created
  // assignments, so a self-service claim can't create a double-booking that a
  // manual assignment would be blocked from creating.
  const { data: target } = (await db
    .from('bookings')
    .select('start_time, end_time')
    .eq('id', booking_id)
    .single()) as { data: { start_time: string | null; end_time: string | null } | null }
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

  // Atomic claim: the `team_member_id IS NULL` filter on the UPDATE makes this
  // first-writer-wins — a concurrent claim updates zero rows → "already taken".
  const { data, error } = await db
    .from('bookings')
    .update({
      team_member_id: auth.id,
      pay_rate: member?.pay_rate || null,
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
