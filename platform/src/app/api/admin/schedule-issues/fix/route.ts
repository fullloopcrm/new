import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

interface IssueRow {
  id: string
  type: string
  message: string
  booking_id: string | null
  team_member_id: string | null
  status: string
}

interface BookingRow {
  id: string
  start_time: string
  end_time: string
  price: number | null
  hourly_rate: number | null
  team_member_id: string | null
  status: string
}

function hoursFromBooking(b: BookingRow): number {
  const [, st] = (b.start_time || '').split('T')
  const [, et] = (b.end_time || '').split('T')
  const [sh, sm] = (st || '00:00').split(':').map(Number)
  const [eh, em] = (et || '00:00').split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

interface FixPlan {
  description: string
  changes: Array<{ table: string; id: string; field: string; from: unknown; to: unknown }>
  acknowledgeOnly: boolean
}

async function buildFixPlan(issue: IssueRow, tenantId: string): Promise<FixPlan> {
  const ack: FixPlan = {
    description: `Mark "${issue.type.replace(/_/g, ' ')}" as resolved (no data change).`,
    changes: [],
    acknowledgeOnly: true,
  }

  if (!issue.booking_id) return ack

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, price, hourly_rate, team_member_id, status')
    .eq('id', issue.booking_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!booking) return ack

  if (issue.type === 'price_mismatch' && booking.hourly_rate && booking.price) {
    const hours = hoursFromBooking(booking as BookingRow)
    const expectedPrice = Math.round(hours * (booking.hourly_rate as number) * 100)
    if (expectedPrice !== booking.price) {
      return {
        description: `Update price from $${(booking.price / 100).toFixed(0)} → $${(expectedPrice / 100).toFixed(0)} (${hours}hrs × $${booking.hourly_rate}/hr).`,
        changes: [{ table: 'bookings', id: booking.id, field: 'price', from: booking.price, to: expectedPrice }],
        acknowledgeOnly: false,
      }
    }
  }

  if (issue.type === 'day_off') {
    // Guard against a stale issue: the booking may have been reassigned to a
    // different (available) team member, or moved to a terminal status,
    // since the cron flagged it. Applying the unassign+revert-to-pending
    // mutation in either case would destroy a since-completed job record or
    // undo a manual fix that already solved the problem.
    const actionableStatuses = ['scheduled', 'pending', 'confirmed']
    if (!actionableStatuses.includes(booking.status) || booking.team_member_id !== issue.team_member_id) {
      return {
        description: `This issue no longer applies -- the booking's status or assignment has changed since it was flagged. Marking resolved with no data change.`,
        changes: [],
        acknowledgeOnly: true,
      }
    }
    return {
      description: `Unassign team member from this booking and flip status back to pending so admin can reassign.`,
      changes: [
        { table: 'bookings', id: booking.id, field: 'team_member_id', from: booking.team_member_id, to: null },
        { table: 'bookings', id: booking.id, field: 'status', from: booking.status, to: 'pending' },
      ],
      acknowledgeOnly: false,
    }
  }

  return ack
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const body = await request.json().catch(() => ({}))
  const id = body.id as string | undefined
  const apply = body.apply === true

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: issue } = await supabaseAdmin
    .from('schedule_issues')
    .select('id, type, message, booking_id, team_member_id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

  const plan = await buildFixPlan(issue as IssueRow, tenantId)

  if (!apply) {
    return NextResponse.json({ preview: plan, applied: false })
  }

  const bookingUpdates: Record<string, Record<string, unknown>> = {}
  for (const ch of plan.changes) {
    if (ch.table !== 'bookings') continue
    if (!bookingUpdates[ch.id]) bookingUpdates[ch.id] = {}
    bookingUpdates[ch.id][ch.field] = ch.to
  }
  for (const [bookingId, fields] of Object.entries(bookingUpdates)) {
    await supabaseAdmin.from('bookings').update(fields).eq('id', bookingId).eq('tenant_id', tenantId)
  }

  await supabaseAdmin
    .from('schedule_issues')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'admin',
      resolution_note: plan.description,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ preview: plan, applied: true })
}
