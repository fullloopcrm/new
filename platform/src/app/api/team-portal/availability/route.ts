import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('working_days, unavailable_dates, schedule')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  // working_days is TEXT[] (migrations/013_full_parity.sql) — the real column
  // smart-schedule.ts/cron/generate-recurring/cron/schedule-monitor/
  // admin/find-cleaner/preview actually read via day-availability.ts's
  // dayTokenToIndex (which normalizes BOTH numeric "0".."6" and day-name
  // "Sun".."Sat" tokens). Numeric tokens are widened back to Number here so
  // /team/availability's number-keyed UI (`workingDays: number[]`) keeps
  // working; day-name tokens (written by /team's own editor) pass through
  // unchanged for that page. Default Mon-Fri (numeric) when unset, matching
  // this route's long-standing default for a never-configured member.
  const rawWorkingDays = member?.working_days?.length ? member.working_days : ['1', '2', '3', '4', '5']
  const workingDays = (rawWorkingDays as string[]).map((d) => (/^[0-6]$/.test(d) ? Number(d) : d))

  return NextResponse.json({
    availability: {
      working_days: workingDays,
      schedule: member?.schedule || {},
      blocked_dates: member?.unavailable_dates || [],
    },
  })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { availability } = await request.json()

  // Get current unavailable_dates (the real column) to detect NEW blocked dates
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('name, unavailable_dates')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  const currentDates = new Set((member?.unavailable_dates as string[] | null) || [])
  const newDatesRequested = (availability?.blocked_dates || []).filter((d: string) => !currentDates.has(d))

  // Check if team member has bookings on any newly requested dates
  if (newDatesRequested.length > 0) {
    const blockedDates: string[] = []
    for (const date of newDatesRequested) {
      const dayStart = `${date}T00:00:00`
      const dayEnd = `${date}T23:59:59`

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, clients(name)')
        .eq('team_member_id', auth.id)
        .eq('tenant_id', auth.tid)
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

  // Target the real columns the scheduling engine actually reads
  // (smart-schedule.ts, cron/generate-recurring, cron/schedule-monitor,
  // admin/find-cleaner/preview) — working_days (TEXT[]) / unavailable_dates
  // (DATE[]) / schedule (JSONB), all added by migrations/013_full_parity.sql.
  // Only set keys the caller actually sent so a partial payload can't null out
  // an unrelated column.
  const update: Record<string, unknown> = {}
  if (Array.isArray(availability?.working_days)) {
    update.working_days = availability.working_days.map((d: unknown) => String(d))
  }
  if (Array.isArray(availability?.blocked_dates)) {
    update.unavailable_dates = availability.blocked_dates
  }
  if (availability?.schedule && typeof availability.schedule === 'object') {
    update.schedule = availability.schedule
  }

  if (Object.keys(update).length > 0) {
    await supabaseAdmin
      .from('team_members')
      .update(update)
      .eq('id', auth.id)
      .eq('tenant_id', auth.tid)
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
      type: 'check_in',
      title: `Time Off — ${memberName}`,
      message: `${memberName} requested time off: ${dateList}`,
    }).catch(() => {})
  }

  return NextResponse.json({ availability })
}
