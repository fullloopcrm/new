import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { formatET } from '@/lib/dates'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { geocodeAddress, calculateDistance, CHECK_IN_MAX_MILES, CHECK_IN_HARD_BLOCK_MILES, CHECK_IN_GPS_ENABLED } from '@/lib/nycmaid/geo'
import { applyPropertyToBookingClient, bookingCoords, bookingAddress } from '@/lib/client-properties'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // tenantDb auto-scopes every query to auth.tid (the tenant HMAC-bound in the
  // portal token). SELECT/UPDATE are filtered by tenant_id automatically.
  const db = tenantDb(auth.tid)

  // Verify booking belongs to this team member
  const { data: booking } = await db
    .from('bookings')
    .select('id, status, team_member_id, start_time, check_in_time, notes, clients(name, address, latitude, longitude), client_properties(address, latitude, longitude)')
    .eq('id', booking_id)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Block double check-in
  if (booking.check_in_time) {
    return NextResponse.json({ error: 'Already checked in' }, { status: 400 })
  }

  // Block check-in on future bookings (compare date in ET)
  const todayET = formatET(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })
  const bookingDateET = formatET(booking.start_time, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (bookingDateET > todayET) {
    return NextResponse.json({ error: 'Cannot check in to a future booking' }, { status: 400 })
  }

  // NYC Maid two-tier GPS geofence (tenant-scoped). Cleaner must be near the job
  // address. Hard-block if clearly far (abuse); flag-but-allow inside the drift
  // zone so a cleaner at the door is never stranded by NYC GPS jitter.
  let checkInFlagNote = ''
  if (isNycMaid(auth.tid) && CHECK_IN_GPS_ENABLED) {
    const hasLoc = typeof lat === 'number' && typeof lng === 'number'
    if (!hasLoc) {
      return NextResponse.json({ error: 'Check-in needs your location. Enable location/GPS for this site and try again.', code: 'location_required' }, { status: 400 })
    }
    applyPropertyToBookingClient(booking as never)
    let coords = bookingCoords(booking as never)
    const addr = bookingAddress(booking as never)
    if (!coords && addr) coords = await geocodeAddress(addr).catch(() => null)
    if (coords) {
      const dist = calculateDistance(lat, lng, coords.lat, coords.lng)
      if (dist > CHECK_IN_HARD_BLOCK_MILES) {
        return NextResponse.json({ error: `You're ${dist.toFixed(2)} mi from the job address. You must be at the address to check in. Move closer and try again.`, code: 'too_far', distance_miles: Math.round(dist * 100) / 100 }, { status: 400 })
      }
      if (dist > CHECK_IN_MAX_MILES) checkInFlagNote = `\n\n[GPS check-in flagged: ${dist.toFixed(2)} mi from address]`
    } else {
      // Couldn't resolve coords (no cache + geocoder down). Allow, but flag.
      checkInFlagNote = `\n\n[GPS check-in unverified: could not resolve job coordinates]`
    }
  }

  const { data, error } = await db
    .from('bookings')
    .update({
      check_in_time: new Date().toISOString(),
      check_in_lat: lat || null,
      check_in_lng: lng || null,
      status: 'in_progress',
      ...(checkInFlagNote ? { notes: ((booking as { notes?: string | null }).notes || '') + checkInFlagNote } : {}),
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ booking: data })
}
