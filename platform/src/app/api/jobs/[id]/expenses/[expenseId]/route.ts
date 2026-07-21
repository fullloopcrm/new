/**
 * Remove a receipt/expense from a job (e.g. logged by mistake).
 *
 * DELETE → { success: true }
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent } from '@/lib/jobs'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string; expenseId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id, expenseId } = await params

    // job_id is the ownership check that keeps a caller from deleting
    // another job's (or a non-job) expense row by guessing its id.
    const { data: existing, error: readError } = await supabaseAdmin
      .from('expenses')
      .select('id, category, amount')
      .eq('tenant_id', tenantId)
      .eq('job_id', id)
      .eq('id', expenseId)
      .maybeSingle()
    if (readError || !existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', expenseId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await audit({ tenantId, action: 'expense.deleted', entityType: 'expense', entityId: expenseId, details: { job_id: id } })
    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: 'expense_removed',
      detail: { expense_id: expenseId, category: existing.category, amount_cents: existing.amount },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/jobs/[id]/expenses/[expenseId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
