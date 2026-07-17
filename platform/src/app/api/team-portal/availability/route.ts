import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await tenantDb(auth.tid)
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .single()) as { data: { notes: string | null } | null }

  // Store availability in member notes as JSON for now
  let availability = { working_days: [1, 2, 3, 4, 5], blocked_dates: [] as string[] }
  if (member?.notes) {
    try {
      const parsed = JSON.parse(member.notes)
      if (parsed.availability) availability = parsed.availability
    } catch { /* not JSON, ignore */ }
  }

  return NextResponse.json({ availability })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { availability } = await request.json()

  const db = tenantDb(auth.tid)

  // Get current availability to detect NEW blocked dates
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await db
    .from('team_members')
    .select('name, notes')
    .eq('id', auth.id)
    .single()) as { data: { name: string | null; notes: string | null } | null }

  let currentObj: Record<string, unknown> = {}
  if (member?.notes) {
    try { currentObj = JSON.parse(member.notes) } catch { currentObj = { text: member.notes } }
  }
  const currentDates = new Set((currentObj.availability as any)?.blocked_dates || [])
  const newDatesRequested = (availability?.blocked_dates || []).filter((d: string) => !currentDates.has(d))

  // Check if team member has bookings on any newly requested dates
  if (newDatesRequested.length > 0) {
    const blockedDates: string[] = []
    for (const date of newDatesRequested) {
      const dayStart = `${date}T00:00:00`
      const dayEnd = `${date}T23:59:59`

      // tenantDb's select() takes a non-literal `columns` param, which widens
      // supabase-js's column-string type inference — cast to the shape actually selected.
      const { data: bookings } = (await db
        .from('bookings')
        .select('id, start_time, clients(name)')
        .eq('team_member_id', auth.id)
        .in('status', ['scheduled', 'pending', 'confirmed', 'in_progress'])
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .limit(1)) as { data: { id: string; start_time: string; clients: { name: string } | null }[] | null }

      if (bookings && bookings.length > 0) {
        const clientName = (bookings[0].clients as any)?.name || 'a client'
        blockedDates.push(`${date} (booked with ${clientName})`)
      }
    }

    if (blockedDates.length > 0) {
      return NextResponse.json({
        error: `Cannot request time off on dates with existing bookings: ${blockedDates.join(', ')}. Contact admin to reschedule first.`,
        blocked_dates: blockedDates,
      }, { status: 409 })
    }
  }

  currentObj.availability = availability

  // Re-check notes still matches what we read — `notes` is a shared JSON blob
  // (also written by /api/team-portal/preferences), so a concurrent write to
  // either endpoint between the read above and this write would otherwise be
  // silently clobbered by this stale-based merge.
  let availUpdate = db.from('team_members').update({ notes: JSON.stringify(currentObj) }).eq('id', auth.id)
  availUpdate = member?.notes != null ? availUpdate.eq('notes', member.notes) : availUpdate.is('notes', null)
  const { data: availUpdated } = await availUpdate.select('id')
  if (!availUpdated || availUpdated.length === 0) {
    return NextResponse.json({ error: 'Preferences changed elsewhere — please retry' }, { status: 409 })
  }

  // Notify admin about new time-off requests
  if (newDatesRequested.length > 0) {
    const memberName = member?.name || 'A team member'
    const dateList = newDatesRequested.map((d: string) => {
      const date = new Date(d + 'T12:00:00')
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }).join(', ')

    await notify({
      tenantId: auth.tid,
      type: 'time_off_request',
      title: `Time Off — ${memberName}`,
      message: `${memberName} requested time off: ${dateList}`,
    }).catch(() => {})
  }

  return NextResponse.json({ availability })
}
