/**
 * A single job: read it with its payment plan, scheduled sessions, timeline,
 * client contact info, and the deal/quote it originated from. Tenant-scoped.
 *
 * GET   → { job, client, quote, deal, payments, sessions, events }
 *         Gated on `bookings.view` (matches the Production nav gate) so any
 *         role that can see the jobs list can open a job. Financial fields
 *         (job.total_cents, the full payments plan, deal.value_cents) are
 *         additionally gated on `finance.view` and stripped/emptied for
 *         viewers without it — same class of leak already fixed on the
 *         sibling budget-variance route, split rather than blocking the
 *         whole page for roles like `staff` that need job-core info.
 * PATCH → { status?: JobStatus, title?, notes?, starts_on?, ends_on? }
 *         status → 'completed' stamps completed_at and logs a timeline event.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { tenantDb } from '@/lib/tenant-db'
import { logJobEvent, releasePaymentsForEvent, shapeSession, type JobStatus, type RawSession } from '@/lib/jobs'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUS: JobStatus[] = ['unscheduled', 'scheduled', 'in_progress', 'completed', 'cancelled']

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const canViewFinance = hasPermission(tenant.role, 'finance.view', overridesFor(tenant))
    const db = tenantDb(tenantId)
    const { id } = await params

    const { data: job, error } = await db
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [payments, sessions, events, client, quote] = await Promise.all([
      db.from('job_payments').select('*').eq('job_id', id).order('sort_order'),
      db
        .from('bookings')
        .select(
          'id, start_time, end_time, status, notes, service_type, team_member_id, crew_id, ' +
            'booking_assignees(team_member_id, team_members(name)), crew:crews(name, color)',
        )
        .eq('job_id', id)
        .order('start_time'),
      db.from('job_events').select('*').eq('job_id', id).order('created_at', { ascending: false }),
      job.client_id
        ? db.from('clients').select('id, name, email, phone, address, unit, notes').eq('id', job.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      job.quote_id
        ? db.from('quotes').select('id, quote_number, deal_id').eq('id', job.quote_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    // The lead this job originated from: job → quote → deal. Fetched as a
    // second hop since it's a 2-table chain and only needed when present.
    const deal = quote.data?.deal_id
      ? (await db.from('deals').select('id, title, stage, value_cents').eq('id', quote.data.deal_id).maybeSingle()).data
      : null

    const { total_cents: _totalCents, ...jobCore } = job as Record<string, unknown>
    const dealCore = deal ? (({ value_cents: _valueCents, ...rest }) => rest)(deal as Record<string, unknown>) : null

    return NextResponse.json({
      job: canViewFinance ? job : jobCore,
      client: client.data ?? null,
      quote: quote.data ?? null,
      deal: canViewFinance ? deal : dealCore,
      payments: canViewFinance ? payments.data ?? [] : [],
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
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
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

    const { data: job, error } = await db
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
          heading: `${title} is wrapped`,
          bodyHtml: `<p style="margin:0"><strong>${title}</strong> was marked complete. Total <strong>${money}</strong>.</p>`,
          sms: `Job complete: ${title} (${money}).`,
        })
      }
    }

    // Notes save silently otherwise -- log it to the same job timeline as
    // status changes so "who touched this job and when" stays complete.
    if (body.notes !== undefined) {
      await logJobEvent({ tenant_id: tenantId, job_id: id, event_type: 'notes_updated', detail: {} })
    }

    return NextResponse.json({ job })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/jobs/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
