import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
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

  // Generate 30-minute slots from 8am to 6pm
  const slots: { time: string; available: boolean }[] = []
  const bookedRanges = (bookings || []).map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time || new Date(new Date(b.start_time).getTime() + 2 * 3600000).toISOString()).getTime(),
  }))

  for (let hour = 8; hour <= 18; hour++) {
    for (const minute of [0, 30]) {
      // Don't show slots that would end after 9pm
      if (hour + duration > 21) continue
      if (hour === 18 && minute === 30) continue

      const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
      const slotEnd = new Date(slotStart.getTime() + duration * 3600000)

      // Check if this slot overlaps with any booking
      const isBooked = bookedRanges.some(
        (b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start
      )

      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const timeLabel = `${h}:${String(minute).padStart(2, '0')} ${ampm}`

      slots.push({ time: timeLabel, available: !isBooked })
    }
  }

  return NextResponse.json({ slots })
}
