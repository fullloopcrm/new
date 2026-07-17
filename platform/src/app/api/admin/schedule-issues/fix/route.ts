import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

interface IssueRow {
  id: string
  tenant_id: string
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

async function buildFixPlan(issue: IssueRow): Promise<FixPlan> {
  const ack: FixPlan = {
    description: `Mark "${issue.type.replace(/_/g, ' ')}" as resolved (no data change).`,
    changes: [],
    acknowledgeOnly: true,
  }

  if (!issue.booking_id) return ack

  // Scoped to the issue's own tenant — a booking_id that doesn't belong to this
  // tenant (data-integrity drift, or a crafted cross-tenant reference) resolves
  // to "not found" instead of leaking/mutating another tenant's booking.
  const { data: booking } = await tenantDb(issue.tenant_id)
    .from('bookings')
    .select('id, start_time, end_time, price, hourly_rate, team_member_id, status')
    .eq('id', issue.booking_id)
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
  const { tenant, error: authError } = await requirePermission('schedules.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const body = await request.json().catch(() => ({}))
  const id = body.id as string | undefined
  const apply = body.apply === true

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // This is the shared /dashboard Schedule Issues widget (every tenant's own
  // admin, not a platform-super-admin tool) — scope the lookup to the caller's
  // own tenant, or a crafted id could resolve/leak another tenant's issue.
  const { data: issue } = await tenantDb(tenantId)
    .from('schedule_issues')
    .select('id, tenant_id, type, message, booking_id, team_member_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

  const plan = await buildFixPlan(issue as IssueRow)

  if (!apply) {
    return NextResponse.json({ preview: plan, applied: false })
  }

  const db = tenantDb(issue.tenant_id)

  const bookingUpdates: Record<string, Record<string, unknown>> = {}
  for (const ch of plan.changes) {
    if (ch.table !== 'bookings') continue
    if (!bookingUpdates[ch.id]) bookingUpdates[ch.id] = {}
    bookingUpdates[ch.id][ch.field] = ch.to
  }
  for (const [bookingId, fields] of Object.entries(bookingUpdates)) {
    await db.from('bookings').update(fields).eq('id', bookingId)
    // GET /api/bookings/:id/team and closeout-summary both source the LEAD
    // from booking_team_members, not bookings.team_member_id -- the
    // 'day_off' fix nulls the latter to unassign, but left the stale lead
    // row behind, so the admin Team panel kept showing the unavailable
    // member as still assigned. Same booking_team_members-sync gap already
    // fixed across every other team_member_id write site this session.
    if ('team_member_id' in fields) {
      await db.from('booking_team_members').delete().eq('booking_id', bookingId).eq('is_lead', true)
    }
  }

  await db
    .from('schedule_issues')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'admin',
      resolution_note: plan.description,
    })
    .eq('id', id)

  return NextResponse.json({ preview: plan, applied: true })
}
