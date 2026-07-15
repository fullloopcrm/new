/**
 * A single job: read it with its payment plan, scheduled sessions, and timeline;
 * update its status. Tenant-scoped.
 *
 * GET   → { job, payments, sessions, events }
 * PATCH → { status?: JobStatus, title?, notes?, starts_on?, ends_on? }
 *         status → 'completed' stamps completed_at and logs a timeline event.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent, releasePaymentsForEvent, shapeSession, type JobStatus, type RawSession } from '@/lib/jobs'
import { escapeHtml } from '@/lib/escape-html'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUS: JobStatus[] = ['unscheduled', 'scheduled', 'in_progress', 'completed', 'cancelled']

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [payments, sessions, events] = await Promise.all([
      supabaseAdmin.from('job_payments').select('*').eq('job_id', id).order('sort_order'),
      supabaseAdmin
        .from('bookings')
        .select(
          'id, start_time, end_time, status, notes, service_type, team_member_id, crew_id, ' +
            'booking_assignees(team_member_id, team_members(name)), crew:crews(name, color)',
        )
        .eq('job_id', id)
        .order('start_time'),
      supabaseAdmin.from('job_events').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      job,
      payments: payments.data ?? [],
      sessions: (sessions.data ?? []).map((s) => shapeSession(s as unknown as RawSession)),
      events: events.data ?? [],
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      status?: JobStatus
      title?: string
      notes?: string
      starts_on?: string | null
      ends_on?: string | null
    }

    const patch: Record<string, unknown> = {}
    if (body.title !== undefined) patch.title = body.title
    if (body.notes !== undefined) patch.notes = body.notes
    if (body.starts_on !== undefined) patch.starts_on = body.starts_on
    if (body.ends_on !== undefined) patch.ends_on = body.ends_on

    if (body.status !== undefined) {
      if (!VALID_STATUS.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
      }
      patch.status = body.status
      if (body.status === 'in_progress') patch.started_at = new Date().toISOString()
      if (body.status === 'completed') patch.completed_at = new Date().toISOString()
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.status) {
      await logJobEvent({ tenant_id: tenantId, job_id: id, event_type: body.status, detail: {} })
      // Release stage-gated payments (e.g. a final milestone) when the job completes.
      await releasePaymentsForEvent(tenantId, id, body.status)
      // NOTE: on 'completed', a single review request should fire here (reusing
      // the flag-gated post-job-followup pattern). Left unwired until the review
      // trigger is approved — no client messaging without explicit sign-off.

      // Owner heads-up when a job wraps (Production milestone). Owner-only,
      // best-effort — never breaks the status update.
      if (body.status === 'completed') {
        const money = ((job.total_cents as number) / 100 || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        const title = (job.title as string) || 'A job'
        const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
        await ownerAlert({
          tenantId,
          subject: `Job complete — ${title}`,
          kicker: 'Job complete',
          // heading is escaped downstream by emailShell — only bodyHtml is inserted raw.
          heading: `${title} is wrapped`,
          bodyHtml: `<p style="margin:0"><strong>${escapeHtml(title)}</strong> was marked complete. Total <strong>${money}</strong>.</p>`,
          sms: `Job complete: ${title} (${money}).`,
        })
      }
    }

    return NextResponse.json({ job })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/jobs/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
