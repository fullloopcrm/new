import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { dayTokenToIndex } from '@/lib/day-availability'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  // No dedicated "view own availability" permission exists — availability.edit_own
  // is granted to every portal role by default and gates both reading and
  // writing your own availability in the UI, so it doubles as the view gate too.
  const { auth, error } = await requirePortalPermission(request, 'availability.edit_own')
  if (error) return error

  // Read the SAME columns the scheduler reads (working_days / unavailable_dates
  // on team_members) — this used to read a `notes` JSON blob that nothing else
  // in the app ever looked at, so what a cleaner set here silently never
  // affected their real scheduling availability.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await tenantDb(auth.tid)
    .from('team_members')
    .select('working_days, unavailable_dates')
    .eq('id', auth.id)
    .single()) as { data: { working_days: string[] | null; unavailable_dates: string[] | null } | null }

  const workingDays = (member?.working_days || [])
    .map(dayTokenToIndex)
    .filter((d): d is number => d !== null)
    .sort()

  const availability = {
    working_days: workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5],
    blocked_dates: member?.unavailable_dates || [],
  }

  return NextResponse.json({ availability })
})

export const PUT = withMobileCors(async function PUT(request: NextRequest) {
  const { auth, error } = await requirePortalPermission(request, 'availability.edit_own')
  if (error) return error

  const { availability } = await request.json()

  const db = tenantDb(auth.tid)

  // Get current availability to detect NEW blocked dates — read from the same
  // working_days/unavailable_dates columns the scheduler reads, not `notes`.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await db
    .from('team_members')
    .select('name, unavailable_dates')
    .eq('id', auth.id)
    .single()) as { data: { name: string | null; unavailable_dates: string[] | null } | null }

  const currentDates = new Set(member?.unavailable_dates || [])
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

  // Write to the canonical scheduler columns so this actually affects the
  // cleaner's real availability (see comment in GET above).
  const workingDays = (availability?.working_days || []).map((d: number) => String(d)).sort()

  await db
    .from('team_members')
    .update({ working_days: workingDays, unavailable_dates: availability?.blocked_dates || [] })
    .eq('id', auth.id)

  // Notify admin about new time-off requests
  if (newDatesRequested.length > 0) {
    const memberName = member?.name || 'A team member'
    const dateList = newDatesRequested.map((d: string) => {
      const date = new Date(d + 'T12:00:00')
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'America/New_York' })
    }).join(', ')

    await notify({
      tenantId: auth.tid,
      type: 'check_in',
      title: `Time Off — ${memberName}`,
      message: `${memberName} requested time off: ${dateList}`,
    }).catch(() => {})
  }

  return NextResponse.json({ availability })
})
