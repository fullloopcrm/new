/**
 * Manually-entered business expense → ledger. Posted immediately at creation
 * (cash-basis), same as payroll/commissions -- NOT deferred until a later
 * bank-transaction match. Before this, a manually-logged expense (materials,
 * a subcontractor bill, supplies, rent) only ever reached
 * ledgerProfitAndLoss -- the app's own "source of truth" P&L -- if someone
 * later ran bank reconciliation and matched it to the specific bank line
 * (finance/bank-transactions/[id]/match, target_type='expense'). For most
 * tenants most expenses never get that far, so net profit was silently
 * overstated by every dollar of untracked cost.
 *
 *   DR <category CoA (subtype/name-matched, else 6900 Other Expenses)>
 *     CR 2450 Payouts in Transit   (clearing, same shape as post-labor.ts --
 *                                   a later real bank-line categorization
 *                                   nets cleanly against it)
 *
 * Idempotent by (source='expense', source_id=expense.id). The bank-match
 * route checks this same key before it would otherwise post its own entry,
 * so matching an already-posted expense to its real bank line just links it
 * instead of double-posting.
 */
import { supabaseAdmin } from '../supabase'
import {
  postJournalEntry,
  ensureChartAccounts,
  getAccountIdByCode,
  journalEntryExists,
  type JournalLineInput,
} from '../ledger'
import { sanitizePostgrestValue } from '../postgrest-safe'

export interface PostExpenseResult {
  posted: boolean
  reason?: string
  entryId?: string
}

/** Resolve the expense CoA by category (subtype or name match), else the 6900 catch-all. */
async function expenseAccountId(tenantId: string, category: string | null): Promise<string | null> {
  if (category) {
    const safe = sanitizePostgrestValue(category)
    if (safe) {
      const { data: match } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('type', 'expense')
        .or(`subtype.eq.${safe},name.ilike.%${safe}%`)
        .limit(1)
        .maybeSingle()
      if (match?.id) return match.id as string
    }
  }
  return getAccountIdByCode(tenantId, '6900')
}

export async function postExpenseToLedger(opts: { tenantId: string; expenseId: string }): Promise<PostExpenseResult> {
  const { tenantId, expenseId } = opts
  if (await journalEntryExists(tenantId, 'expense', expenseId)) return { posted: false, reason: 'already_posted' }

  const { data: expense } = await supabaseAdmin
    .from('expenses')
    .select('id, category, amount, date, description')
    .eq('tenant_id', tenantId)
    .eq('id', expenseId)
    .maybeSingle()
  if (!expense) return { posted: false, reason: 'not_found' }

  const amountCents = Number(expense.amount) || 0
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  await ensureChartAccounts(tenantId)
  const [expenseAcct, clearingAcct] = await Promise.all([
    expenseAccountId(tenantId, (expense.category as string) || null),
    getAccountIdByCode(tenantId, '2450'),
  ])
  if (!expenseAcct || !clearingAcct) return { posted: false, reason: 'accounts_missing' }

  const memo = (expense.description as string) || `Expense — ${(expense.category as string) || 'uncategorized'}`
  const lines: JournalLineInput[] = [
    { coa_id: expenseAcct, debit_cents: amountCents, memo },
    { coa_id: clearingAcct, credit_cents: amountCents, memo },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: (expense.date as string) || new Date().toISOString().slice(0, 10),
    memo,
    source: 'expense',
    source_id: expenseId,
    lines,
  })
  return { posted: true, entryId }
}

/**
 * Reverse a previously-posted expense entry — called before DELETE so a
 * removed expense doesn't leave a stale journal entry silently drifting the
 * P&L forever (unlike an unposted expense, there is no backfill safety net
 * that could ever find and fix an orphaned entry once its expense row is
 * gone). Idempotent by (source='expense_reversal', source_id=expense.id) —
 * an expense can only be reversed once.
 *
 * Reads the ORIGINAL entry's own posted lines (not the current expense row)
 * and posts the exact opposite of each line, so it's correct regardless of
 * whether postExpenseToLedger's category-matching would resolve differently
 * today than it did at post time.
 *
 * Editing amount/category on an ALREADY-POSTED expense is a separate, still-
 * open gap: migration 061's UNIQUE(tenant_id, source, source_id) means the
 * 'expense' key can only ever hold one entry, so a clean reverse-then-repost
 * (supporting more than one edit over the expense's lifetime while still
 * preserving the original entry for audit) needs a schema decision, not a
 * guess — not attempted here.
 */
export async function reverseExpenseFromLedger(opts: { tenantId: string; expenseId: string }): Promise<PostExpenseResult> {
  const { tenantId, expenseId } = opts
  if (await journalEntryExists(tenantId, 'expense_reversal', expenseId)) return { posted: false, reason: 'already_reversed' }

  const { data: original } = await supabaseAdmin
    .from('journal_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source', 'expense')
    .eq('source_id', expenseId)
    .maybeSingle()
  if (!original) return { posted: false, reason: 'no_original_entry' }

  const { data: origLines } = await supabaseAdmin
    .from('journal_lines')
    .select('coa_id, debit_cents, credit_cents, memo')
    .eq('entry_id', original.id as string)
  if (!origLines || origLines.length === 0) return { posted: false, reason: 'no_lines' }

  const lines: JournalLineInput[] = origLines.map((l) => ({
    coa_id: l.coa_id as string,
    debit_cents: Number(l.credit_cents) || 0,
    credit_cents: Number(l.debit_cents) || 0,
    memo: `Reversal — ${(l.memo as string) || 'expense'}`,
  }))

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Expense reversal (deleted)',
    source: 'expense_reversal',
    source_id: expenseId,
    lines,
  })
  return { posted: true, entryId }
}

/** Safety net: post any historical expenses lacking a journal entry. Idempotent, safe to re-run. */
export async function backfillUnpostedExpenses(tenantId: string, limit = 500): Promise<{ posted: number }> {
  let posted = 0
  const { data: rows } = await supabaseAdmin
    .from('expenses')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: true })
    .limit(limit)
  for (const r of rows || []) {
    try {
      const res = await postExpenseToLedger({ tenantId, expenseId: r.id as string })
      if (res.posted) posted++
    } catch (e) {
      console.error('[post-expense] backfill failed', r.id, e)
    }
  }
  return { posted }
}
