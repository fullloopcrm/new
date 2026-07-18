/**
 * Update a payment on a job's plan (mark invoiced / paid / void).
 * PATCH → { payment_id, status }
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent, type PaymentStatus } from '@/lib/jobs'
import { postJobPaymentRevenue, reverseJobPaymentRevenue } from '@/lib/finance/post-revenue'

type Params = { params: Promise<{ id: string }> }

const VALID: PaymentStatus[] = ['pending', 'invoiced', 'paid', 'void']

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { payment_id, status } = (await request.json().catch(() => ({}))) as {
      payment_id?: string
      status?: PaymentStatus
    }
    if (!payment_id || !status || !VALID.includes(status)) {
      return NextResponse.json({ error: 'payment_id and a valid status are required' }, { status: 400 })
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from('job_payments')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('job_id', id)
      .eq('id', payment_id)
      .maybeSingle()
    if (readError || !current) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    const oldStatus = current.status as PaymentStatus

    const patch: Record<string, unknown> = { status }
    if (status === 'paid') patch.paid_at = new Date().toISOString()

    // Check-then-act, not atomic: `current` above is a stale snapshot. Every
    // sibling status-transition route this session (jobs/[id],
    // sessions/[sessionId], invoices/[id], quotes/[id]) re-asserts its
    // pre-read status in the write's own WHERE for exactly this reason -- a
    // concurrent status change (a second click, another admin editing the
    // same payment plan) landing between the read and this write must not be
    // silently clobbered. Re-marking the SAME status (the common double-click
    // case) still matches its own WHERE and succeeds as a no-op resend.
    const { data: payment, error } = await supabaseAdmin
      .from('job_payments')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('job_id', id)
      .eq('id', payment_id)
      .eq('status', oldStatus)
      .select('id, label, amount_cents, status, paid_at')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!payment) {
      return NextResponse.json(
        { error: 'This payment changed status concurrently — refresh instead of editing' },
        { status: 409 },
      )
    }

    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: status === 'paid' ? 'payment_paid' : 'payment_invoiced',
      detail: { payment_id, label: payment.label, amount_cents: payment.amount_cents },
    })

    // Real revenue → real ledger entry. This click is the ONLY place a
    // job_payment ever becomes 'paid' — without this, the money never posts
    // to the GL (see post-revenue.ts's postJobPaymentRevenue doc comment).
    // Best-effort, never fails the status flip; idempotent by (job_payment
    // id), so a re-mark-paid or a retry can't double-post.
    if (status === 'paid') {
      try {
        await postJobPaymentRevenue({ tenantId, jobPaymentId: payment.id })
      } catch (revenueErr) {
        console.error('[jobs/payments] revenue post failed:', revenueErr)
      }
    } else if (status === 'void' && oldStatus === 'paid') {
      // Voiding a payment that had already posted revenue must reverse it, or
      // the ledger keeps counting money the payment plan no longer shows as
      // paid — same best-effort/idempotent contract as the post above (see
      // post-revenue.ts's reverseJobPaymentRevenue doc comment).
      try {
        await reverseJobPaymentRevenue({ tenantId, jobPaymentId: payment.id })
      } catch (reversalErr) {
        console.error('[jobs/payments] revenue reversal failed:', reversalErr)
      }
    }

    return NextResponse.json({ payment })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/jobs/[id]/payments', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
