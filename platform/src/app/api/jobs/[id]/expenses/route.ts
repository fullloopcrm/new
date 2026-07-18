/**
 * Receipts/expenses attached to a job — the crew's actual cost against this
 * job (materials, supplies, permits…), distinct from job-site photos. Reuses
 * the shared `expenses` table (see 030_finance.sql, 033_receipts.sql) scoped
 * by job_id (2026_07_18_job_expenses.sql) instead of a separate table — an
 * expense tied to a job is still just an expense, same downstream
 * bank-reconciliation/ledger-posting path as any other.
 *
 * GET  → { expenses: [...] }
 * POST → { category, amount, vendor_name?, description?, receipt_url?, date? }
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { getDefaultEntityId } from '@/lib/entity'
import { logJobEvent } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { nowNaiveET } from '@/lib/recurring'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('job_id', id)
      .order('date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ expenses: data ?? [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/[id]/expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  // Gated on bookings.edit (same as the rest of this job-detail page's
  // writes — session add/edit, mark-paid) rather than finance.expenses:
  // the crew logging a job's receipts is a job-cost-tracking action a
  // manager does from the field, not a general books-keeping action —
  // finance.expenses is owner/admin-only by default (rbac.ts) and would
  // lock managers who can otherwise fully run this job out of this feature.
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()

    const { data: job, error: jErr } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (jErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { data: fields, error: vError } = validate(body, {
      category: { type: 'string', required: true, max: 100 },
      amount: { type: 'number', required: true, min: 0 },
      vendor_name: { type: 'string', max: 200 },
      description: { type: 'string', max: 1000 },
      receipt_url: { type: 'url' },
      date: { type: 'date' },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    const entityId = await getDefaultEntityId(tenantId)

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        tenant_id: tenantId,
        job_id: id,
        entity_id: entityId,
        category: validated.category,
        amount: Math.round(Number(validated.amount) * 100),
        vendor_name: validated.vendor_name || null,
        description: validated.description || null,
        receipt_url: validated.receipt_url || null,
        date: validated.date || nowNaiveET().slice(0, 10),
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await audit({ tenantId, action: 'expense.created', entityType: 'expense', entityId: data.id, details: { job_id: id, category: data.category, amount: data.amount } })
    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: 'expense_added',
      detail: { expense_id: data.id, category: data.category, amount_cents: data.amount, vendor_name: data.vendor_name },
    })

    return NextResponse.json({ expense: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/jobs/[id]/expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
