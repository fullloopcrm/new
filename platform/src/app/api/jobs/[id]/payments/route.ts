/**
 * Update a payment on a job's plan (mark invoiced / paid / void).
 * PATCH → { payment_id, status }
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent, type PaymentStatus } from '@/lib/jobs'

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

    const patch: Record<string, unknown> = { status }
    if (status === 'paid') patch.paid_at = new Date().toISOString()

    const { data: payment, error } = await supabaseAdmin
      .from('job_payments')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('job_id', id)
      .eq('id', payment_id)
      .select('id, label, amount_cents, status, paid_at')
      .single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: status === 'paid' ? 'payment_paid' : 'payment_invoiced',
      detail: { payment_id, label: payment.label, amount_cents: payment.amount_cents },
    })

    return NextResponse.json({ payment })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/jobs/[id]/payments', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
