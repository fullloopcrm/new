/**
 * A single scheduled session on a job (a booking carrying the job_id).
 *
 * PATCH  → move (start_time/end_time/duration_hours), reassign
 *          (assignee_ids/crew_id/team_member_id), retitle (service_type),
 *          renote (notes), or progress (status). Only the keys present in the
 *          body are touched; a bare start move preserves the visit's duration.
 *          status → 'completed' logs 'session_completed' and releases any
 *          stage-gated payments (mirrors the job-complete release path).
 * DELETE → remove the session (and its assignee rows via FK cascade).
 *
 * Tenant + job scoped: the booking must belong to this tenant AND this job.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent, releasePaymentsForEvent, shapeSession, type RawSession } from '@/lib/jobs'

type Params = { params: Promise<{ id: string; sessionId: string }> }

const SESSION_STATUS = ['confirmed', 'in_progress', 'completed', 'cancelled', 'pending'] as const
type SessionStatus = (typeof SESSION_STATUS)[number]

/** Load a booking and prove it belongs to this tenant + job. */
async function loadOwnedSession(tenantId: string, jobId: string, sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, job_id, tenant_id, start_time, end_time, status')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single()
  if (error || !data) return null
  if (data.job_id !== jobId) return null
  return data
}

/** Re-read a session with its assignees + crew, shaped for the client. */
async function readShapedSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, start_time, end_time, status, notes, service_type, team_member_id, crew_id, ' +
        'booking_assignees(team_member_id, team_members(name)), crew:crews(name, color)',
    )
    .eq('id', sessionId)
    .single()
  return data ? shapeSession(data as unknown as RawSession) : null
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id: jobId, sessionId } = await params
    const body = (await request.json().catch(() => ({}))) as {
      start_time?: string
      end_time?: string | null
      duration_hours?: number | null
      team_member_id?: string | null
      assignee_ids?: string[] | null
      crew_id?: string | null
      service_type?: string | null
      notes?: string | null
      status?: string
    }

    const current = await loadOwnedSession(tenantId, jobId, sessionId)
    if (!current) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const patch: Record<string, unknown> = {}
    let didReschedule = false
    let didReassign = false

    // --- Move: recompute start/end. A bare start move keeps the duration. ---
    if ('start_time' in body || 'end_time' in body || 'duration_hours' in body) {
      const prevStart = current.start_time ? new Date(current.start_time) : null
      const prevEnd = current.end_time ? new Date(current.end_time) : null
      const prevDurMs = prevStart && prevEnd ? prevEnd.getTime() - prevStart.getTime() : 2 * 3_600_000

      const start = body.start_time ? new Date(body.start_time) : prevStart
      if (!start || Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 })
      }
      const durMs = body.duration_hours && body.duration_hours > 0 ? body.duration_hours * 3_600_000 : null
      const end = body.end_time
        ? new Date(body.end_time)
        : new Date(start.getTime() + (durMs ?? prevDurMs))

      patch.start_time = start.toISOString()
      patch.end_time = end.toISOString()
      didReschedule = true
    }

    // --- Reassign: recompute the assignee set (single / multiple / crew). ---
    const wantsReassign = 'assignee_ids' in body || 'crew_id' in body || 'team_member_id' in body
    let assigneeList: string[] = []
    if (wantsReassign) {
      const assignees = new Set<string>()
      let crewId: string | null = null
      if (body.crew_id) {
        const { data: crew } = await supabaseAdmin
          .from('crews')
          .select('id, crew_members(team_member_id)')
          .eq('id', body.crew_id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (crew) {
          crewId = crew.id
          for (const m of (crew.crew_members || []) as { team_member_id: string }[]) assignees.add(m.team_member_id)
        }
      }
      const explicit = [
        ...(Array.isArray(body.assignee_ids) ? body.assignee_ids : []),
        ...(body.team_member_id ? [body.team_member_id] : []),
      ]
      if (explicit.length) {
        const { data: valid } = await supabaseAdmin
          .from('team_members').select('id').eq('tenant_id', tenantId).in('id', explicit)
        for (const m of valid || []) assignees.add(m.id)
      }
      assigneeList = [...assignees]
      const leadId = body.team_member_id && assignees.has(body.team_member_id) ? body.team_member_id : (assigneeList[0] ?? null)
      patch.crew_id = crewId
      patch.team_member_id = leadId
      didReassign = true
    }

    // --- Simple field edits. ---
    if (typeof body.service_type === 'string' && body.service_type.trim()) patch.service_type = body.service_type.trim()
    if ('notes' in body) patch.notes = body.notes

    let didComplete = false
    if (body.status !== undefined) {
      if (!SESSION_STATUS.includes(body.status as SessionStatus)) {
        return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
      }
      patch.status = body.status
      didComplete = body.status === 'completed' && current.status !== 'completed'
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error: uErr } = await supabaseAdmin
      .from('bookings')
      .update(patch)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
    if (uErr) throw uErr

    // Replace the assignee set after the booking row is updated.
    if (didReassign) {
      await supabaseAdmin.from('booking_assignees').delete().eq('booking_id', sessionId)
      if (assigneeList.length) {
        await supabaseAdmin.from('booking_assignees').insert(
          assigneeList.map((mid) => ({ booking_id: sessionId, team_member_id: mid })),
        )
      }
    }

    // Timeline + payment releases.
    if (didReschedule) {
      await logJobEvent({ tenant_id: tenantId, job_id: jobId, event_type: 'session_rescheduled', detail: { booking_id: sessionId, start_time: patch.start_time } })
    }
    if (didReassign) {
      await logJobEvent({ tenant_id: tenantId, job_id: jobId, event_type: 'session_reassigned', detail: { booking_id: sessionId, assignees: assigneeList.length, crew_id: patch.crew_id ?? null } })
    }
    if (didComplete) {
      await logJobEvent({ tenant_id: tenantId, job_id: jobId, event_type: 'session_completed', detail: { booking_id: sessionId } })
      await releasePaymentsForEvent(tenantId, jobId, 'session_completed')
    }

    const session = await readShapedSession(sessionId)
    return NextResponse.json({ session })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/jobs/[id]/sessions/[sessionId]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id: jobId, sessionId } = await params

    const current = await loadOwnedSession(tenantId, jobId, sessionId)
    if (!current) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // booking_assignees cascade on the FK; delete the booking itself.
    const { error } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
    if (error) throw error

    await logJobEvent({ tenant_id: tenantId, job_id: jobId, event_type: 'session_removed', detail: { booking_id: sessionId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/jobs/[id]/sessions/[sessionId]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
