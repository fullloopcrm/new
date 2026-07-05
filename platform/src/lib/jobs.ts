/**
 * Jobs — the project layer over bookings.
 *
 * A cleaning stays one booking (N=1, job_id NULL). A project (landscaping,
 * remodel, dumpster multi-touch) becomes a Job that owns N bookings (schedule)
 * and N job_payments (deposit → progress → final / milestones). We extend the
 * existing booking + invoice rails; we do not replace them.
 *
 * See migration 2026_07_02_jobs_projects.sql.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'

export type JobStatus = 'unscheduled' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentKind = 'deposit' | 'progress' | 'final' | 'milestone'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid' | 'void'
export type PaymentTrigger = 'manual' | 'on_date' | 'on_stage_complete' | 'on_signature'

export interface Job {
  id: string
  tenant_id: string
  client_id: string | null
  quote_id: string | null
  title: string | null
  status: JobStatus
  total_cents: number
  service_address: string | null
  notes: string | null
  starts_on: string | null
  ends_on: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

/** One line of the payment plan the caller wants created with the job. */
export interface PaymentPlanItem {
  label: string
  kind: PaymentKind
  amount_cents: number
  due_at?: string | null
  /** How this payment becomes due. Defaults to 'manual'. */
  trigger?: PaymentTrigger
}

/** One scheduled work session → becomes a booking under the job. */
export interface JobSessionInput {
  start_time: string
  end_time?: string | null
  notes?: string | null
}

/** A booking row with its assignees + crew embedded (PostgREST shape). */
export interface RawSession {
  id: string
  start_time: string | null
  end_time: string | null
  status: string | null
  notes: string | null
  service_type: string | null
  team_member_id: string | null
  crew_id: string | null
  booking_assignees?: { team_member_id: string; team_members: { name: string | null } | { name: string | null }[] | null }[] | null
  crew?: { name: string | null; color: string | null } | { name: string | null; color: string | null }[] | null
}

/** Flatten PostgREST's embedded rows into a flat session the UI can render. */
export function shapeSession(b: RawSession) {
  const crew = Array.isArray(b.crew) ? b.crew[0] : b.crew
  const assignees = (b.booking_assignees || []).map((a) => {
    const tm = Array.isArray(a.team_members) ? a.team_members[0] : a.team_members
    return { id: a.team_member_id, name: tm?.name || '—' }
  })
  return {
    id: b.id,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    notes: b.notes,
    service_type: b.service_type,
    team_member_id: b.team_member_id,
    crew_id: b.crew_id,
    crew: crew ? { name: crew.name, color: crew.color } : null,
    assignees,
  }
}

export interface CreateJobFromQuoteOptions {
  /** Payment plan. If omitted, a single 'final' payment for the quote total is created. */
  payments?: PaymentPlanItem[]
  /** Optional pre-scheduled sessions. If omitted, the job has no bookings yet. */
  sessions?: JobSessionInput[]
}

/**
 * Convert an ACCEPTED quote into a Job (the project sibling of the cleaning
 * single-booking convert). Idempotent on quotes.converted_job_id. Creates the
 * client if the quote was standalone, then the job, its payment plan, and any
 * pre-scheduled sessions.
 */
export async function createJobFromQuote(
  tenantId: string,
  quoteId: string,
  opts: CreateJobFromQuoteOptions = {},
): Promise<{ job_id: string; already_converted: boolean }> {
  const { data: quote, error: qErr } = await supabaseAdmin
    .from('quotes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', quoteId)
    .single()
  if (qErr || !quote) throw new Error('Quote not found')

  if (quote.converted_job_id) {
    return { job_id: quote.converted_job_id as string, already_converted: true }
  }
  if (quote.status !== 'accepted') {
    throw new Error(`Can only convert accepted quotes (current: ${quote.status})`)
  }

  // Resolve or create client (mirrors the booking convert path).
  let clientId = quote.client_id as string | null
  if (!clientId) {
    const existing = quote.contact_email
      ? await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('email', quote.contact_email)
          .maybeSingle()
      : { data: null }
    if (existing.data?.id) {
      clientId = existing.data.id as string
    } else {
      const { data: newClient, error: cErr } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenantId,
          name: quote.contact_name || quote.title || 'Quote Client',
          email: quote.contact_email || null,
          phone: quote.contact_phone || null,
          address: quote.service_address || null,
          source: 'quote',
          status: 'active',
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      clientId = newClient.id as string
    }
  }

  const totalCents = (quote.total_cents as number) || 0

  const { data: job, error: jErr } = await supabaseAdmin
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      quote_id: quoteId,
      title: quote.title || `Job from ${quote.quote_number}`,
      // Only call it 'scheduled' if a session/booking is actually attached.
      // A sold job with no date is 'unscheduled' so it doesn't look booked.
      status: opts.sessions && opts.sessions.length > 0 ? 'scheduled' : 'unscheduled',
      total_cents: totalCents,
      service_address: quote.service_address || null,
      notes: quote.notes || null,
    })
    .select('id')
    .single()
  if (jErr) throw jErr
  const jobId = job.id as string

  // Payment plan: caller-supplied, else a single 'final' payment for the total.
  const plan: PaymentPlanItem[] =
    opts.payments && opts.payments.length > 0
      ? opts.payments
      : [{ label: 'Final payment', kind: 'final', amount_cents: totalCents }]

  const paymentRows = plan.map((p, i) => ({
    tenant_id: tenantId,
    job_id: jobId,
    label: p.label,
    kind: p.kind,
    amount_cents: p.amount_cents,
    due_at: p.due_at ?? null,
    trigger: p.trigger ?? 'manual',
    sort_order: i,
  }))
  const { error: pErr } = await supabaseAdmin.from('job_payments').insert(paymentRows)
  if (pErr) throw pErr

  // Optional pre-scheduled sessions → bookings under the job.
  if (opts.sessions && opts.sessions.length > 0) {
    const bookingRows = opts.sessions.map((s) => ({
      tenant_id: tenantId,
      client_id: clientId,
      job_id: jobId,
      start_time: s.start_time,
      end_time: s.end_time ?? null,
      status: 'confirmed',
      notes: s.notes || `Session of job (quote ${quote.quote_number})`,
      address: quote.service_address || null,
    }))
    const { error: bErr } = await supabaseAdmin.from('bookings').insert(bookingRows)
    if (bErr) throw bErr
  }

  await supabaseAdmin
    .from('quotes')
    .update({ status: 'converted', converted_job_id: jobId, converted_at: new Date().toISOString() })
    .eq('id', quoteId)

  await logQuoteEvent({
    quote_id: quoteId,
    tenant_id: tenantId,
    event_type: 'converted',
    detail: { job_id: jobId, client_id: clientId, payments: plan.length },
  })

  await logJobEvent({
    tenant_id: tenantId,
    job_id: jobId,
    event_type: 'created',
    detail: {
      source: 'quote',
      quote_id: quoteId,
      total_cents: totalCents,
      payments: plan.length,
      sessions: opts.sessions?.length ?? 0,
    },
  })

  // The job was created from a SIGNED quote → release any 'on_signature'
  // payments (the deposit) so they're immediately due to collect.
  await releasePaymentsForEvent(tenantId, jobId, 'created')

  return { job_id: jobId, already_converted: false }
}

/**
 * Append an entry to a job's timeline. Best-effort — a missing event log must
 * never break the operation that produced it.
 */
export async function logJobEvent(e: {
  tenant_id: string
  job_id: string
  event_type: string
  detail?: Record<string, unknown>
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('job_events').insert({
      tenant_id: e.tenant_id,
      job_id: e.job_id,
      event_type: e.event_type,
      detail: e.detail ?? {},
    })
    if (error) console.error('[logJobEvent] insert failed:', error)
  } catch (err) {
    console.error('[logJobEvent] exception:', err)
  }
}

/** Where a won sale came from. All paths funnel into ONE job-creation seam. */
export type SaleSource =
  | { type: 'quote'; quoteId: string }
  | { type: 'deal'; dealId: string }
  | { type: 'proposal'; requestId: string }
  | { type: 'manual'; clientId: string; title: string; totalCents: number; serviceAddress?: string | null }

/**
 * The universal "sale won → job" seam. Quote-accept, deal-won, proposal-paid,
 * and manual all route through here so the job/payment/schedule model is
 * created identically regardless of how the sale closed. Quote path is live;
 * the others are stubbed until their upstream data-loading is wired.
 */
export async function convertSaleToJob(
  tenantId: string,
  source: SaleSource,
  opts: CreateJobFromQuoteOptions = {},
): Promise<{ job_id: string; already_converted: boolean }> {
  switch (source.type) {
    case 'quote':
      return createJobFromQuote(tenantId, source.quoteId, opts)
    case 'deal':
    case 'proposal':
    case 'manual':
      throw new Error(`convertSaleToJob: source '${source.type}' not yet implemented`)
  }
}

// Which job event releases which payment trigger. One universal map — no
// per-trade rules. A cleaning job's single 'manual' payment matches nothing
// here and is simply marked paid by the operator; a project's triggered
// payments flip to 'invoiced' (due) as the job progresses.
const EVENT_RELEASES: Record<string, PaymentTrigger> = {
  created: 'on_signature', // job created from a signed quote → deposit due
  session_completed: 'on_stage_complete', // a scheduled work day finished → milestone due
  completed: 'on_stage_complete', // whole job done → any remaining stage-gated payment due
}

/**
 * Fire a job event's payment releases. Flips matching PENDING payments to
 * 'invoiced' (due to collect) — it never marks them paid (real money still
 * flips 'paid'). Returns how many were released. No-op for events that don't
 * gate a payment.
 */
export async function releasePaymentsForEvent(
  tenantId: string,
  jobId: string,
  eventType: string,
): Promise<number> {
  const trigger = EVENT_RELEASES[eventType]
  if (!trigger) return 0

  const { data: released, error } = await supabaseAdmin
    .from('job_payments')
    .update({ status: 'invoiced' })
    .eq('tenant_id', tenantId)
    .eq('job_id', jobId)
    .eq('trigger', trigger)
    .eq('status', 'pending')
    .select('id, label, amount_cents')
  if (error) {
    console.error('[releasePaymentsForEvent] failed:', error)
    return 0
  }

  for (const p of released ?? []) {
    await logJobEvent({
      tenant_id: tenantId,
      job_id: jobId,
      event_type: 'payment_invoiced',
      detail: { payment_id: p.id, label: p.label, amount_cents: p.amount_cents, released_by: eventType },
    })
  }
  return (released ?? []).length
}
