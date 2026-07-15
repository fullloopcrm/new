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
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'

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
  const { data: rows } = (await tenantDb(ctx.tenantId)
    .from('booking_team_members')
    .select('team_member_id, is_lead, position')
    .eq('booking_id', id)
    .order('position', { ascending: true })) as {
    data: { team_member_id: string; is_lead: boolean; position: number }[] | null
  }

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

  const newLead: string | null = body.lead_id || null
  const rawExtras: unknown[] = Array.isArray(body.extra_team_member_ids) ? body.extra_team_member_ids : []
  const newExtras = rawExtras.filter((x): x is string => typeof x === 'string' && x.length > 0 && x !== newLead)
  const teamSize = Math.max(1, Math.min(8, Number(body.team_size) || 1 + newExtras.length))
  const db = tenantDb(ctx.tenantId)

  // A caller assigning a booking's lead/extras must stay inside their own
  // tenant's active roster — same gate /api/client/reschedule and
  // /api/client/preferred-cleaner already enforce. Without this, lead_id /
  // extra_team_member_ids were written straight from request-body input with
  // no ownership check, letting any staff caller point team_member_id (and
  // booking_team_members rows) at another tenant's team_members row, which
  // then leaks that employee's name/phone/email via this booking's joins.
  const requestedMemberIds = Array.from(new Set([newLead, ...newExtras].filter((x): x is string => !!x)))
  if (requestedMemberIds.length > 0) {
    const { data: validMembers } = (await db
      .from('team_members')
      .select('id, active')
      .in('id', requestedMemberIds)) as { data: { id: string; active: boolean | null }[] | null }
    const validIds = new Set((validMembers || []).filter((m) => m.active !== false).map((m) => m.id))
    const invalidIds = requestedMemberIds.filter((id) => !validIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'One or more team members are not available' }, { status: 400 })
    }
  }

  // lead_id/extra_team_member_ids are caller-supplied; verify every id belongs to
  // this tenant before writing them — closeout-summary and other reads join
  // team_members(name, phone, hourly_rate) off booking_team_members, so a foreign
  // id would otherwise leak another tenant's staff PII into this booking's team.
  const candidateIds = Array.from(new Set([...(newLead ? [newLead] : []), ...newExtras]))
  if (candidateIds.length > 0) {
    const { data: owned } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .in('id', candidateIds)
    const ownedIds = new Set((owned || []).map((r) => r.id))
    if (candidateIds.some((cid) => !ownedIds.has(cid))) {
      return NextResponse.json({ error: 'Invalid team member id' }, { status: 404 })
    }
  }

  // Snapshot the old team to figure out which extras are NEW (need notification).
  const { data: oldRows } = (await db
    .from('booking_team_members')
    .select('team_member_id, is_lead')
    .eq('booking_id', id)) as { data: { team_member_id: string; is_lead: boolean }[] | null }
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
  await db.from('booking_team_members').delete().eq('booking_id', id)

  const teamRows: { booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
  if (newLead) {
    teamRows.push({ booking_id: id, team_member_id: newLead, is_lead: true, position: 1 })
  }
  newExtras.forEach((mid, i) => {
    teamRows.push({ booking_id: id, team_member_id: mid, is_lead: false, position: i + 2 })
  })
  if (teamRows.length > 0) {
    const { error: insErr } = await db.from('booking_team_members').insert(teamRows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // Tenant context for notifications (telnyx + push)
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone')
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
        .single<Booking & { hourly_rate?: number | null }>()

      const { data: extraMember } = await db
        .from('team_members')
        .select('name, pin')
        .eq('id', extraId)
        .single<{ name: string | null; pin: string | null }>()

      const report = await notifyTeamMember({
        tenantId: ctx.tenantId,
        teamMemberId: extraId,
        type: 'job_assignment',
        title: 'Added to Team Job',
        message: `${clientName} on ${bookingDate} (team of ${teamSize})`,
        bookingId: id,
        smsMessage: tenant && bookingFull?.start_time
          ? teamSmsTemplates(tenant).jobAssignment({
              start_time: bookingFull.start_time,
              hourly_rate: bookingFull.hourly_rate,
              clients: bookingFull.clients?.name ? { name: bookingFull.clients.name } : null,
              team_members: extraMember ? { name: extraMember.name, pin: extraMember.pin } : null,
            })
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
