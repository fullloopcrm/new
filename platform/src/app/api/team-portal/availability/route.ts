import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member } = await tenantDb(auth.tid)
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .single()

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

  // Get current availability to detect NEW blocked dates
  const { data: member } = await tenantDb(auth.tid)
    .from('team_members')
    .select('name, notes')
    .eq('id', auth.id)
    .single()

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

      const { data: bookings } = await tenantDb(auth.tid)
        .from('bookings')
        .select('id, start_time, clients(name)')
        .eq('team_member_id', auth.id)
        .in('status', ['scheduled', 'pending', 'confirmed', 'in_progress'])
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .limit(1)

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

  await tenantDb(auth.tid)
    .from('team_members')
    .update({ notes: JSON.stringify(currentObj) })
    .eq('id', auth.id)

  // Notify admin about new time-off requests
  if (newDatesRequested.length > 0) {
    const memberName = member?.name || 'A team member'
    const dateList = newDatesRequested.map((d: string) => {
      const date = new Date(d + 'T12:00:00')
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }).join(', ')

    await notify({
      tenantId: auth.tid,
      type: 'check_in',
      title: `Time Off — ${memberName}`,
      message: `${memberName} requested time off: ${dateList}`,
    }).catch(() => {})
  }

  return NextResponse.json({ availability })
}
