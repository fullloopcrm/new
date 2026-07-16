import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/token'
import { buildPortalSlots } from '@/lib/portal-availability'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date')
  const duration = parseInt(request.nextUrl.searchParams.get('duration') || '2')

  if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  // Get existing bookings for this date
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('start_time, end_time')
    .eq('tenant_id', auth.tid)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .not('status', 'eq', 'cancelled')

  const bookedRanges = (bookings || []).map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time || new Date(new Date(b.start_time).getTime() + 2 * 3600000).toISOString()).getTime(),
  }))

  // Concurrent worker/crew capacity: a slot is only FULL once overlapping
  // bookings reach the number of active team members. Previously ANY overlapping
  // booking blocked the slot, which under-booked every multi-worker tenant.
  // Falls back to 1 when no team is configured, preserving prior behavior.
  const { count: activeMembers } = await supabaseAdmin
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tid)
    .eq('status', 'active')
  const capacity = Math.max(1, activeMembers || 0)

  const slots = buildPortalSlots(date, duration, bookedRanges, capacity)

  return NextResponse.json({ slots })
}
