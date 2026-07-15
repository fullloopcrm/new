/**
 * Jobs list + money reconciliation. Returns every job for the tenant with a
 * per-job payment rollup (contracted / paid / due / overdue) and a tenant-wide
 * total. Read-only, tenant-scoped.
 *
 * GET → { jobs: [...], totals: { contracted, paid, due, overdue } }
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

interface PaymentRow {
  amount_cents: number
  status: string
  due_at: string | null
}

function rollup(payments: PaymentRow[], nowIso: string) {
  let contracted = 0, paid = 0, due = 0, overdue = 0
  for (const p of payments) {
    contracted += p.amount_cents
    if (p.status === 'paid') paid += p.amount_cents
    else if (p.status === 'invoiced') {
      due += p.amount_cents
      if (p.due_at && p.due_at < nowIso) overdue += p.amount_cents
    }
  }
  return { contracted, paid, due, overdue }
}

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const nowIso = new Date().toISOString()

    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('id, title, status, total_cents, created_at, client_id, clients(name), job_payments(amount_cents, status, due_at)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      console.error('GET /api/jobs', error)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    const rows = (jobs ?? []).map((j: Record<string, unknown>) => {
      const payments = (j.job_payments as PaymentRow[]) ?? []
      const money = rollup(payments, nowIso)
      const client = j.clients as { name?: string } | null
      return {
        id: j.id as string,
        title: (j.title as string) || 'Job',
        status: j.status as string,
        client_name: client?.name ?? null,
        created_at: j.created_at as string,
        ...money,
      }
    })

    const totals = rows.reduce(
      (acc, r) => ({
        contracted: acc.contracted + r.contracted,
        paid: acc.paid + r.paid,
        due: acc.due + r.due,
        overdue: acc.overdue + r.overdue,
      }),
      { contracted: 0, paid: 0, due: 0, overdue: 0 },
    )

    return NextResponse.json({ jobs: rows, totals })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
