/**
 * Cron: fire due recurring_expenses, record failures + retry counts.
 * Schedule via vercel.json. Uses CRON_SECRET Bearer auth.
 *
 * GAP (closed here): every OTHER ledger source (expense, bank_txn, payroll,
 * payout, refund, chargeback, deposit, booking...) keys source_id to a real
 * economic event's own row id, which only ever exists once -- exactly what
 * migration 061's UNIQUE(tenant_id, source, source_id) index (live on prod as
 * of 2026-07-16 14:35, per deploy log) assumes. 'recurring' broke that
 * assumption: source_id was r.id, the recurring_expenses TEMPLATE row's own
 * id, reused identically on EVERY period it fires. The 2nd+ firing's insert
 * hit the unique index as a false collision (23505), and postJournalEntry's
 * own 23505-resolution path (by design, for the real cross-tenant-safe retry
 * case) looked up "any existing entry for this (tenant,source,source_id)"
 * with no entry_date filter -- so it silently returned the FIRST period's
 * entry id as if the 2nd period's post had succeeded. The cron then advanced
 * next_due_date, cleared last_error, and counted it as fired -- with NO new
 * journal_entries row and NO error anywhere. Net effect: every recurring
 * expense's cost reached the P&L exactly ONCE, ever, no matter how many
 * periods it has actually fired since -- permanently understating cost from
 * the 2nd occurrence on, invisibly (last_fired_at keeps advancing normally).
 *
 * FIX: source_id is now a deterministic per-OCCURRENCE UUID derived from
 * `${recurringExpenseId}:${dueDate}` via toSourceUuid (same technique
 * post-adjustments.ts already uses for Stripe's non-UUID refund/dispute ids).
 * A genuine retry of the SAME period recomputes the SAME hash -> still caught
 * as a real duplicate by both the dedupe check below and the DB index. A NEW
 * period recomputes a DIFFERENT hash -> posts its own real entry.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { postJournalEntry, toSourceUuid } from '@/lib/ledger'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { safeEqual } from '@/lib/timing-safe-equal'
import { tenantServesSite } from '@/lib/tenant-status'

function advance(d: Date, freq: string): Date {
  const r = new Date(d)
  switch (freq) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); break
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); break
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); break
    case 'monthly': r.setUTCMonth(r.getUTCMonth() + 1); break
    case 'quarterly': r.setUTCMonth(r.getUTCMonth() + 3); break
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); break
    default: r.setUTCDate(r.getUTCDate() + 30)
  }
  return r
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: due } = await supabaseAdmin
    .from('recurring_expenses')
    .select('*, chart_of_accounts:category(id)')
    .eq('active', true)
    .lte('next_due_date', today)
    .limit(500)

  // Same class of gap fixed across every other cross-tenant fan-out this
  // session (Telegram/Telnyx webhooks, comhub-email cron, generate-recurring):
  // recurring_expenses carries no tenant status of its own, and this loop
  // never checked tenantServesSite() before posting brand-new journal_entries
  // rows. Unlike the messaging-only crons, this is a financial write path —
  // a suspended/cancelled/deleted tenant's recurring expense kept posting
  // real ledger entries to its own P&L, indefinitely, every period it fired.
  const dueTenantIds = Array.from(new Set((due || []).map((r) => r.tenant_id as string)))
  const { data: dueTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .in('id', dueTenantIds)
  const servingTenantIds = new Set(
    (dueTenants || []).filter((t) => tenantServesSite(t.status)).map((t) => t.id as string),
  )

  let fired = 0
  let failed = 0
  for (const r of (due || []) as unknown as Array<{
    id: string; tenant_id: string; entity_id: string | null; label: string; category: string | null
    amount_cents: number; frequency: string; next_due_date: string; failure_count: number
  }>) {
    if (!servingTenantIds.has(r.tenant_id)) continue
    // Per-occurrence key -- NOT r.id (the template's own id, which is the
    // same across every period it fires). See the file-level comment.
    const occurrenceSourceId = toSourceUuid(`${r.id}:${r.next_due_date}`)
    try {
      // Dedupe guard — if a journal entry for this recurring row + due date
      // already exists, don't double-post on a cron re-run or retry.
      const { data: alreadyPosted } = await supabaseAdmin
        .from('journal_entries')
        .select('id')
        .eq('tenant_id', r.tenant_id)
        .eq('source', 'recurring')
        .eq('source_id', occurrenceSourceId)
        .eq('entry_date', r.next_due_date)
        .limit(1)
        .maybeSingle()
      if (alreadyPosted) {
        await supabaseAdmin.from('recurring_expenses').update({
          next_due_date: advance(new Date(r.next_due_date), r.frequency).toISOString().slice(0, 10),
          last_fired_at: new Date().toISOString(),
          last_error: null,
          failure_count: 0,
        }).eq('id', r.id)
        fired++
        continue
      }

      // Find a matching CoA for the expense (by subtype/name)
      const { data: coaMatch } = await supabaseAdmin
        .from('chart_of_accounts').select('id')
        .eq('tenant_id', r.tenant_id).eq('type', 'expense')
        .or(`subtype.eq.${sanitizePostgrestValue(r.category)},name.ilike.%${sanitizePostgrestValue(r.category)}%`)
        .limit(1).maybeSingle()

      // Find any bank CoA (or skip if none)
      const { data: bankCoa } = await supabaseAdmin
        .from('chart_of_accounts').select('id')
        .eq('tenant_id', r.tenant_id).eq('is_bank_account', true).limit(1).maybeSingle()

      if (!coaMatch || !bankCoa) throw new Error('No matching CoA + bank CoA')

      await postJournalEntry({
        tenant_id: r.tenant_id,
        entity_id: r.entity_id,
        entry_date: r.next_due_date,
        memo: `Recurring: ${r.label}`,
        source: 'recurring',
        source_id: occurrenceSourceId,
        lines: [
          { coa_id: coaMatch.id, debit_cents: r.amount_cents },
          { coa_id: bankCoa.id, credit_cents: r.amount_cents },
        ],
      })

      await supabaseAdmin.from('recurring_expenses').update({
        next_due_date: advance(new Date(r.next_due_date), r.frequency).toISOString().slice(0, 10),
        last_fired_at: new Date().toISOString(),
        last_error: null,
        failure_count: 0,
      }).eq('id', r.id)
      fired++
    } catch (e) {
      failed++
      await supabaseAdmin.from('recurring_expenses').update({
        last_error: e instanceof Error ? e.message : 'unknown',
        failure_count: (r.failure_count || 0) + 1,
      }).eq('id', r.id)
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'recurring_expense_posted',
    title: 'cron:recurring-expenses',
    message: `fired=${fired} failed=${failed}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, checked: due?.length || 0, fired, failed })
}
