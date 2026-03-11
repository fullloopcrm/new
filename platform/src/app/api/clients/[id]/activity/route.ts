import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get client
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, created_at')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!client) return NextResponse.json([], { status: 404 })

  // Get all bookings for this client
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members(name)')
    .eq('client_id', id)
    .eq('tenant_id', tenant.id)
    .order('start_time', { ascending: false })

  const activities: { type: string; title: string; description: string; timestamp: string; location?: Record<string, unknown> }[] = []

  // Client created
  activities.push({
    type: 'client_created',
    title: 'Client added',
    description: client.name,
    timestamp: client.created_at
  })

  if (bookings) {
    const bookingIds = bookings.map(b => b.id)

    const { data: notifications } = bookingIds.length > 0
      ? await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('tenant_id', tenant.id)
          .in('booking_id', bookingIds)
      : { data: [] }

    for (const b of bookings) {
      const memberName = Array.isArray(b.team_members) ? b.team_members[0]?.name : b.team_members?.name

      activities.push({
        type: 'booking_created',
        title: 'Booking created',
        description: `${b.notes || 'Service'} with ${memberName || 'unassigned'} - ${new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        timestamp: b.created_at || b.start_time
      })

      if (b.check_in_time) {
        let loc: Record<string, unknown> | undefined
        if (b.check_in_location) {
          try { loc = typeof b.check_in_location === 'string' ? JSON.parse(b.check_in_location) : b.check_in_location } catch {}
        }
        activities.push({
          type: 'check_in',
          title: 'Checked in',
          description: `${memberName || 'Team member'} checked in`,
          timestamp: b.check_in_time,
          location: loc
        })
      }

      if (b.check_out_time) {
        let desc = `${memberName || 'Team member'} checked out`
        if (b.actual_hours) desc += ` - ${b.actual_hours}hrs`
        let loc: Record<string, unknown> | undefined
        if (b.check_out_location) {
          try { loc = typeof b.check_out_location === 'string' ? JSON.parse(b.check_out_location) : b.check_out_location } catch {}
        }
        activities.push({
          type: 'check_out',
          title: 'Checked out',
          description: desc,
          timestamp: b.check_out_time,
          location: loc
        })
      }

      if (b.status === 'cancelled') {
        activities.push({
          type: 'booking_cancelled',
          title: 'Booking cancelled',
          description: `On ${new Date(b.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          timestamp: b.updated_at || b.start_time
        })
      }

      if (b.payment_status === 'paid' && b.price) {
        const payNotif = notifications?.find(n => n.booking_id === b.id && n.type === 'payment_received')
        activities.push({
          type: 'payment_received',
          title: 'Payment received',
          description: `$${(b.price / 100).toFixed(0)} via ${b.payment_method || 'unknown'}`,
          timestamp: payNotif?.created_at || b.check_out_time || b.updated_at || b.start_time
        })
      }
    }
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(activities)
}
