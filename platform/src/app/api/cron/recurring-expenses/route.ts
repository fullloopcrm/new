/**
 * Cron: fire due recurring_expenses, record failures + retry counts.
 * Schedule via vercel.json. Uses CRON_SECRET Bearer auth.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { postJournalEntry } from '@/lib/ledger'

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
  if (!secret || auth !== `Bearer ${secret}`) {
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
    amount_cents: number; frequency: string; next_due_date: string; failure_count: number
  }>) {
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
        .or(`subtype.eq.${r.category},name.ilike.%${r.category}%`)
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
  await supabaseAdmin.from('notifications').insert({
    type: 'recurring_expense_posted',
    title: 'cron:recurring-expenses',
    message: `fired=${fired} failed=${failed}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, checked: due?.length || 0, fired, failed })
}
