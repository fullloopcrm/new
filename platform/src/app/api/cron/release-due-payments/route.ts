/**
 * Release date-due job payments. Daily cron: any `on_date` payment whose due_at
 * has passed and is still pending flips to 'invoiced' (due to collect). This is
 * the time-based leg of the payment trigger engine (the event-based legs fire
 * inline via releasePaymentsForEvent). Marks due only — never auto-paid, never
 * messages a client.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent } from '@/lib/jobs'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const nowIso = new Date().toISOString()
  const { data: due, error } = await supabaseAdmin
    .from('job_payments')
    .update({ status: 'invoiced' })
    .eq('trigger', 'on_date')
    .eq('status', 'pending')
    .lte('due_at', nowIso)
    .select('id, tenant_id, job_id, label, amount_cents')
  if (error) {
    console.error('[release-due-payments] failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  for (const p of due ?? []) {
    await logJobEvent({
      tenant_id: p.tenant_id,
      job_id: p.job_id,
      event_type: 'payment_invoiced',
      detail: { payment_id: p.id, label: p.label, amount_cents: p.amount_cents, released_by: 'on_date' },
    })
  }

  return NextResponse.json({ released: (due ?? []).length })
}
