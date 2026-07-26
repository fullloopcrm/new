import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import { updateRecurringSchedule, RecurringScheduleNotFoundError } from '@/lib/recurring-schedule-update'

// Client-initiated edit of an EXISTING recurring schedule. Before this route
// existed, the client side had no edit at all -- only POST /api/client/recurring
// (create). A client "editing" their schedule meant cancelling the old one and
// creating a new one as two separate, non-atomic calls, which produced
// duplicate active+cancelled schedule rows for the same day/time (9 real
// nycmaid clients, 6mo audit 2026-07-26) and duplicate confirmation
// texts/emails for what the client experienced as one continuous service.
// This route, like the admin PUT, updates the schedule row in place and syncs
// already-generated future bookings -- it never cancels+recreates.
//
// Only a narrow field set is client-editable (day/time/cadence/notes/crew).
// Pricing fields (hourly_rate, pay_rate, discount_percent) are deliberately
// NOT accepted here -- those stay admin/business-controlled, same as the
// create route's price is always server-computed, never client-supplied.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  const { id } = await params

  const auth = await protectClientAPI(tenant.id)
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const db = tenantDb(tenant.id)
  const { data: existing } = await db
    .from('recurring_schedules')
    .select('id, client_id')
    .eq('id', id)
    .maybeSingle()
  // Same shape whether the id doesn't exist OR belongs to another client --
  // never confirm to the caller which id-guesses are real (the IDOR pattern
  // this codebase's other client/* ownership checks already follow).
  if (!existing || existing.client_id !== clientId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const teamMemberId = body.cleaner_id !== undefined ? body.cleaner_id : body.team_member_id

  // A client-supplied cleaner must stay inside their own tenant's active
  // roster -- same gate the create route (POST /api/client/recurring) and
  // /api/client/preferred-cleaner enforce.
  if (teamMemberId) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, active')
      .eq('id', teamMemberId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (!member || member.active === false) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  const changes = {
    ...(teamMemberId !== undefined && { team_member_id: teamMemberId || null }),
    ...(body.recurring_type !== undefined && { recurring_type: body.recurring_type }),
    ...(body.day_of_week !== undefined && { day_of_week: body.day_of_week }),
    ...(body.days_of_week !== undefined && { days_of_week: body.days_of_week }),
    ...(body.preferred_time !== undefined && { preferred_time: body.preferred_time }),
    ...(body.duration_hours !== undefined && { duration_hours: body.duration_hours }),
    ...(body.notes !== undefined && { notes: body.notes }),
  }

  try {
    const { schedule, sync } = await updateRecurringSchedule(tenant.id, id, changes, { notifyClient: true })
    return NextResponse.json({ ...schedule, sync })
  } catch (err: unknown) {
    if (err instanceof RecurringScheduleNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update recurring schedule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
