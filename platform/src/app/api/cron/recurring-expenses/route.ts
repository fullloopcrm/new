/**
 * Cron: fire due recurring_expenses, record failures + retry counts.
 * Schedule via vercel.json. Uses CRON_SECRET Bearer auth.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { postJournalEntry } from '@/lib/ledger'
import { safeEqual } from '@/lib/secret-compare'

export function advance(d: Date, freq: string, anchorDay: number): Date {
  const r = new Date(d)
  switch (freq) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); return r
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); return r
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); return r
    case 'monthly': return advanceMonthly(r, anchorDay, 1)
    case 'quarterly': return advanceMonthly(r, anchorDay, 3)
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); return r
    default: r.setUTCDate(r.getUTCDate() + 30); return r
  }
}

// Recompute a monthly/quarterly due date from the recurrence's ORIGINAL
// anchor day-of-month (recurring_expenses.start_date, the only field the
// create form's single date picker ever writes -- next_due_date has no
// admin edit path once created) every tick, re-deriving the day from the
// anchor and clamping to the target month's last day -- instead of chaining
// setUTCMonth() off the previous, possibly-already-overflowed day. The old
// version let one short month permanently shift a month-end anchor forward:
// a Jan-31 rent/subscription due date's setUTCMonth() call overflows Feb 31
// into Mar 3, then Mar 3 + 1mo -> Apr 3 -> ... stabilizing at day 3 FOREVER,
// never returning to 31 even in a real 31-day month -- silently shifting the
// ledger's accrual date for every future posting. Same bug class as
// lib/recurring.ts's monthly_date fix. Also self-heals a row that already
// drifted under the old code, since the day is always re-derived from the
// anchor, never carried forward from the previous (possibly wrong) value.
function advanceMonthly(current: Date, anchorDay: number, monthsStep: number): Date {
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth() + monthsStep
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(anchorDay, daysInMonth)))
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

  let fired = 0
  let failed = 0
  for (const r of (due || []) as unknown as Array<{
    id: string; tenant_id: string; entity_id: string | null; label: string; category: string | null
    amount_cents: number; frequency: string; start_date: string; next_due_date: string; failure_count: number
  }>) {
    const anchorDay = new Date(r.start_date).getUTCDate()
    try {
      // Dedupe guard — if a journal entry for this recurring row + due date
      // already exists, don't double-post on a cron re-run or retry.
      const { data: alreadyPosted } = await supabaseAdmin
        .from('journal_entries')
        .select('id')
        .eq('tenant_id', r.tenant_id)
        .eq('source', 'recurring')
        .eq('source_id', r.id)
        .eq('entry_date', r.next_due_date)
        .limit(1)
        .maybeSingle()
      if (alreadyPosted) {
        await supabaseAdmin.from('recurring_expenses').update({
          next_due_date: advance(new Date(r.next_due_date), r.frequency, anchorDay).toISOString().slice(0, 10),
          last_fired_at: new Date().toISOString(),
          last_error: null,
          failure_count: 0,
        }).eq('id', r.id)
        fired++
        continue
      }

      // Find a matching CoA for the expense (by subtype/name)
      const cat = sanitizePostgrestValue(r.category)
      const { data: coaMatch } = await supabaseAdmin
        .from('chart_of_accounts').select('id')
        .eq('tenant_id', r.tenant_id).eq('type', 'expense')
        .or(`subtype.eq.${cat},name.ilike.%${cat}%`)
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
        source_id: r.id,
        lines: [
          { coa_id: coaMatch.id, debit_cents: r.amount_cents },
          { coa_id: bankCoa.id, credit_cents: r.amount_cents },
        ],
      })

      await supabaseAdmin.from('recurring_expenses').update({
        next_due_date: advance(new Date(r.next_due_date), r.frequency, anchorDay).toISOString().slice(0, 10),
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
