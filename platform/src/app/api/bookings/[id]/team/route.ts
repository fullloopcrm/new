/**
 * Multi-tech team management for a booking.
 *
 *   GET  /api/bookings/:id/team  → { lead, extras }
 *   PUT  /api/bookings/:id/team
 *        body: { lead_id: string|null, extra_team_member_ids: string[], team_size: number }
 *
 * Replaces the booking's team. Updates bookings.team_member_id (lead) +
 * bookings.team_size, then rewrites booking_team_members rows. Notifies
 * newly-added extras (lead is handled by the main /api/bookings/[id] PUT
 * path on team_member_id change).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { notifyTeamMember, formatDeliveryReport } from '@/lib/notify-team'
import { smsJobAssignment } from '@/lib/sms-templates'

type Booking = {
  id: string
  start_time: string | null
  clients: { name?: string | null } | null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { id } = await params
  // tenantDb auto-scopes booking_team_members/bookings/notifications; the `tenants`
  // row (keyed by id, no tenant_id — cross-tenant by design) stays on supabaseAdmin.
  const db = tenantDb(ctx.tenantId)
  const { data: rows } = await db
    .from('booking_team_members')
    .select('team_member_id, is_lead, position')
    .eq('booking_id', id)
    .order('position', { ascending: true })

  const lead = (rows || []).find((r) => r.is_lead)?.team_member_id || null
  const extras = (rows || []).filter((r) => !r.is_lead).map((r) => r.team_member_id)
  return NextResponse.json({ lead, extras })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { id } = await params
  const body = await req.json()
  const db = tenantDb(ctx.tenantId)

  const newLead: string | null = body.lead_id || null
  const rawExtras: unknown[] = Array.isArray(body.extra_team_member_ids) ? body.extra_team_member_ids : []
  const newExtras = rawExtras.filter((x): x is string => typeof x === 'string' && x.length > 0 && x !== newLead)
  const teamSize = Math.max(1, Math.min(8, Number(body.team_size) || 1 + newExtras.length))

  // lead_id + extra_team_member_ids are caller-supplied FKs — team_members has
  // no cross-tenant FK check, and tenantDb only stamps/filters tenant_id on
  // the row being written (bookings, booking_team_members), it does not
  // validate a referenced team_member_id belongs to this tenant. Without this,
  // an admin session could assign another tenant's employee as this booking's
  // lead or extra (same class as the client-portal + POST /api/bookings gaps
  // fixed earlier this session).
  const requestedIds = Array.from(new Set([newLead, ...newExtras].filter((x): x is string => !!x)))
  if (requestedIds.length > 0) {
    const { data: validMembers } = await db.from('team_members').select('id').in('id', requestedIds)
    const validIds = new Set((validMembers || []).map((m) => m.id))
    if (requestedIds.some((mid) => !validIds.has(mid))) {
      return NextResponse.json({ error: 'Invalid team member selection' }, { status: 400 })
    }
  }

  // Snapshot the old team to figure out which extras are NEW (need notification).
  const { data: oldRows } = await db
    .from('booking_team_members')
    .select('team_member_id, is_lead')
    .eq('booking_id', id)
  const oldMemberIds = new Set((oldRows || []).map((r) => r.team_member_id))
  const newlyAddedExtras = newExtras.filter((mid) => !oldMemberIds.has(mid))

  // Update bookings.team_member_id (lead) + team_size — tenant-scoped.
  const { data: updatedBooking, error: updErr } = await db
    .from('bookings')
    .update({ team_member_id: newLead, team_size: teamSize })
    .eq('id', id)
    .select('id, start_time, clients(name)')
    .single<Booking>()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Replace booking_team_members rows (delete then insert).
  await db
    .from('booking_team_members')
    .delete()
    .eq('booking_id', id)

  const teamRows: { tenant_id: string; booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
  if (newLead) {
    teamRows.push({ tenant_id: ctx.tenantId, booking_id: id, team_member_id: newLead, is_lead: true, position: 1 })
  }
  newExtras.forEach((mid, i) => {
    teamRows.push({ tenant_id: ctx.tenantId, booking_id: id, team_member_id: mid, is_lead: false, position: i + 2 })
  })
  if (teamRows.length > 0) {
    const { error: insErr } = await db.from('booking_team_members').insert(teamRows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // Tenant context for notifications (telnyx + push). `tenants` is keyed by id
  // (no tenant_id column) — cross-tenant by design, stays on supabaseAdmin.
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone')
    .eq('id', ctx.tenantId)
    .single()

  // Notify newly-added extras (skip the lead — handled by main PUT path)
  const clientName = updatedBooking?.clients?.name || 'Client'
  const startISO = updatedBooking?.start_time
  const bookingDate = startISO
    ? new Date(startISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD'

  for (const extraId of newlyAddedExtras) {
    if (extraId === newLead) continue
    try {
      const { data: bookingFull } = await db
        .from('bookings')
        .select('*, clients(*)')
        .eq('id', id)
        .single()

      const report = await notifyTeamMember({
        tenantId: ctx.tenantId,
        teamMemberId: extraId,
        type: 'job_assignment',
        title: 'Added to Team Job',
        message: `${clientName} on ${bookingDate} (team of ${teamSize})`,
        bookingId: id,
        smsMessage: tenant && bookingFull
          ? smsJobAssignment(tenant.name || 'Your business', { start_time: bookingFull.start_time, clients: bookingFull.clients })
          : `New team job assigned for ${clientName} on ${bookingDate}.`,
        skipEmail: true,
      })

      await db.from('notifications').insert({
        type: 'team_member_notified',
        title: 'Team Member Notified',
        message: `${report.teamMemberName}: ${formatDeliveryReport(report)}`,
        booking_id: id,
      })
    } catch (notifyErr) {
      console.error('Team notify on edit failed:', notifyErr)
    }
  }

  return NextResponse.json({ ok: true, lead: newLead, extras: newExtras, team_size: teamSize })
}
