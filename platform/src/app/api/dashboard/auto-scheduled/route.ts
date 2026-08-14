import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface AutoScheduledBooking {
  id: string
  start_time: string | null
  end_time: string | null
  status: string | null
  suggested_reason: string | null
  clients: { name: string | null; address: string | null } | null
  team_members: { name: string | null } | null
}

export async function GET() {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const db = tenantDb(ctx.tenantId)

  const { data: notifs, error } = await db
    .from('notifications')
    .select('id, message, booking_id, created_at')
    .eq('type', 'auto_booking_assigned')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bookingIds = [...new Set((notifs || []).map((n) => n.booking_id).filter((id): id is string => !!id))]

  const bookingsById = new Map<string, AutoScheduledBooking>()
  if (bookingIds.length > 0) {
    const { data: bookings } = await db
      .from('bookings')
      .select('id, start_time, end_time, status, suggested_reason, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
      .in('id', bookingIds)
    for (const b of (bookings || []) as unknown as AutoScheduledBooking[]) bookingsById.set(b.id, b)
  }

  const rows = (notifs || []).map((n) => {
    const booking = n.booking_id ? bookingsById.get(n.booking_id) : undefined
    return {
      id: n.id,
      created_at: n.created_at,
      message: n.message,
      booking_id: n.booking_id,
      client_name: booking?.clients?.name || null,
      client_address: booking?.clients?.address || null,
      team_member_name: booking?.team_members?.name || null,
      start_time: booking?.start_time || null,
      end_time: booking?.end_time || null,
      status: booking?.status || null,
      reason: booking?.suggested_reason || null,
    }
  })

  return NextResponse.json(rows)
}
