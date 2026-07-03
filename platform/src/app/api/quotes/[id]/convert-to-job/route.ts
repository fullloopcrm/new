/**
 * Convert an accepted quote into a JOB (multi-session + payment plan) — the
 * project sibling of ../convert (which makes a single booking for cleaning).
 *
 * POST body (all optional):
 *   payments: [{ label, kind, amount_cents, due_at? }]   — the payment plan.
 *             Omitted → one 'final' payment for the quote total.
 *   sessions: [{ start_time, end_time?, notes? }]         — pre-scheduled work days.
 *
 * Idempotent on quotes.converted_job_id.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { convertSaleToJob, type PaymentPlanItem, type JobSessionInput } from '@/lib/jobs'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      payments?: PaymentPlanItem[]
      sessions?: JobSessionInput[]
    }

    const result = await convertSaleToJob(
      tenantId,
      { type: 'quote', quoteId: id },
      { payments: body.payments, sessions: body.sessions },
    )

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    const msg = err instanceof Error ? err.message : 'Failed'
    // Client errors (wrong status, not found) vs server faults.
    const status = /not found|can only convert|not yet implemented/i.test(msg) ? 400 : 500
    if (status === 500) console.error('POST /api/quotes/[id]/convert-to-job', err)
    return NextResponse.json({ error: msg }, { status })
  }
}
