/**
 * Release date-due job payments. Daily cron: any `on_date` payment whose due_at
 * has passed and is still pending flips to 'invoiced' (due to collect). This is
 * the time-based leg of the payment trigger engine (the event-based legs fire
 * inline via releasePaymentsForEvent, already tenant-scoped by their caller).
 * Marks due only — never auto-paid, never messages a client.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent } from '@/lib/jobs'
import { safeEqual } from '@/lib/timing-safe-equal'
import { tenantServesSite } from '@/lib/tenant-status'

export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const { data: candidates, error: selectError } = await supabaseAdmin
    .from('job_payments')
    .select('id, tenant_id, job_id, label, amount_cents')
    .eq('trigger', 'on_date')
    .eq('status', 'pending')
    .lte('due_at', nowIso)
  if (selectError) {
    console.error('[release-due-payments] failed:', selectError)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  // Same financial-write gap class fixed across finance-post/lifecycle/
  // recurring-expenses this session: this bulk UPDATE carried no tenant
  // status check at all, so a suspended/cancelled/deleted tenant's job
  // payments kept auto-flipping to 'invoiced' (due to collect) indefinitely
  // — a real financial state change with no human review, not just a
  // skipped message.
  const candidateTenantIds = Array.from(new Set((candidates || []).map((p) => p.tenant_id as string)))
  const { data: candidateTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .in('id', candidateTenantIds)
  const servingTenantIds = new Set(
    (candidateTenants || []).filter((t) => tenantServesSite(t.status)).map((t) => t.id as string),
  )
  const due = (candidates || []).filter((p) => servingTenantIds.has(p.tenant_id as string))

  if (due.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('job_payments')
      .update({ status: 'invoiced' })
      .in('id', due.map((p) => p.id))
    if (updateError) {
      console.error('[release-due-payments] failed:', updateError)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
  }

  for (const p of due) {
    await logJobEvent({
      tenant_id: p.tenant_id,
      job_id: p.job_id,
      event_type: 'payment_invoiced',
      detail: { payment_id: p.id, label: p.label, amount_cents: p.amount_cents, released_by: 'on_date' },
    })
  }

  return NextResponse.json({ released: (due ?? []).length })
}
