/**
 * Schedule a work session on a job → creates a booking carrying the job_id.
 * A job can have many sessions (the multi-day schedule).
 *
 * POST → { start_time, end_time?, notes? }
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent } from '@/lib/jobs'
import { getSettings } from '@/lib/settings'
import { findSchedulingConflicts } from '@/lib/schedule/conflict-check'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.create')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      start_time?: string
      end_time?: string | null
      duration_hours?: number | null
      team_member_id?: string | null
      assignee_ids?: string[] | null
      crew_id?: string | null
      service_type?: string | null
      notes?: string | null
      price_cents?: number | null
    }
    if (!body.start_time) {
      return NextResponse.json({ error: 'start_time required' }, { status: 400 })
    }

    const { data: job, error: jErr } = await supabaseAdmin
      .from('jobs')
      .select('id, client_id, title')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (jErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // start_time AND end_time are NOT NULL. Resolve the end from an explicit
    // end, else a duration, else a 2-hour default — so every entry is stable.
    const start = new Date(body.start_time)
    const durMs = body.duration_hours && body.duration_hours > 0 ? body.duration_hours * 3_600_000 : null
    const end = body.end_time ? new Date(body.end_time) : new Date(start.getTime() + (durMs ?? 2 * 3_600_000))

    // Resolve who's assigned — supports single, multiple ad-hoc, OR a saved crew.
    // All resolve into one assignee set on booking_assignees; crew_id + a lead
    // (team_member_id) are also stamped for quick display.
    const assignees = new Set<string>()
    let crewId: string | null = null
    if (body.crew_id) {
      const { data: crew } = await supabaseAdmin
        .from('crews')
        .select('id, crew_members(team_member_id)')
        .eq('id', body.crew_id).eq('tenant_id', tenantId).maybeSingle()
      if (crew) {
        crewId = crew.id
        for (const m of (crew.crew_members || []) as { team_member_id: string }[]) assignees.add(m.team_member_id)
      }
    }
    const explicit = [
      ...(Array.isArray(body.assignee_ids) ? (body.assignee_ids as string[]) : []),
      ...(body.team_member_id ? [body.team_member_id] : []),
    ]
    if (explicit.length) {
      const { data: valid } = await supabaseAdmin
        .from('team_members').select('id').eq('tenant_id', tenantId).neq('status', 'inactive').in('id', explicit)
      for (const m of valid || []) assignees.add(m.id)
    }
    const assigneeList = [...assignees]
    const leadId = body.team_member_id && assignees.has(body.team_member_id) ? body.team_member_id : (assigneeList[0] ?? null)

    // Same double-booking guard POST /api/bookings enforces — this route is
    // the other live path that assigns a team member to a time slot (the
    // primary scheduling path for multi-touch jobs), and had no conflict
    // check at all, so a crew member could be scheduled onto two overlapping
    // sessions across different jobs (or two sessions of the same job).
    if (leadId) {
      const settings = await getSettings(tenantId)
      const conflicts = await findSchedulingConflicts(tenantId, leadId, start.toISOString(), end.toISOString(), settings.booking_buffer_minutes)
      if (conflicts.length > 0) {
        const bufferNote = settings.booking_buffer_minutes > 0 ? ` (with ${settings.booking_buffer_minutes} min buffer)` : ''
        return NextResponse.json({
          error: `Scheduling conflict: team member already has a booking during this time${bufferNote}`,
          conflicts,
        }, { status: 409 })
      }
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        client_id: job.client_id,
        job_id: id,
        team_member_id: leadId,
        crew_id: crewId,
        // service_type is NOT NULL — fall back to the job title.
        service_type: (body.service_type && body.service_type.trim()) || job.title || 'Job session',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        notes: body.notes || 'Job session',
        ...(body.price_cents != null ? { price: Math.max(0, Math.round(body.price_cents)) } : {}),
      })
      .select('id, start_time, end_time, status, team_member_id, crew_id, service_type')
      .single()
    if (bErr) throw bErr

    if (assigneeList.length) {
      await supabaseAdmin.from('booking_assignees').insert(
        assigneeList.map((mid) => ({ booking_id: booking.id, team_member_id: mid })),
      )
    }

    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: 'scheduled',
      detail: { booking_id: booking.id, start_time: body.start_time, assignees: assigneeList.length, crew_id: crewId },
    })

    return NextResponse.json({ session: booking, assignees: assigneeList })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/jobs/[id]/sessions', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
